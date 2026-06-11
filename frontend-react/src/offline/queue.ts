/**
 * File de mutations hors-ligne.
 *
 * Toutes les opérations d'écriture (POST) qui échouent à cause du réseau sont
 * stockées dans IndexedDB (store `queue`) et rejouées dès que la connexion revient.
 */

import { getDB, type QueuedMutation } from './db';
import { useOfflineStore } from './offline.store';

/* ---------- Anti-réentrance ---------- */
let _flushing = false;

/* ---------- Helpers internes ---------- */

async function _put(mutation: QueuedMutation): Promise<void> {
  const db = await getDB();
  await db.put('queue', mutation);
}

async function _delete(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('queue', id);
}

/* ---------- API publique ---------- */

/**
 * Ajoute une mutation à la file IndexedDB et met à jour le compteur du store.
 */
export async function enqueue(input: {
  path: string;
  body: unknown;
  kind: 'spot' | 'logbook';
}): Promise<QueuedMutation> {
  const mutation: QueuedMutation = {
    id: crypto.randomUUID(),
    method: 'POST',
    path: input.path,
    body: input.body,
    kind: input.kind,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
  };
  await _put(mutation);
  await refreshPendingCount();
  return mutation;
}

/**
 * Retourne toutes les mutations triées par date de création (asc).
 */
export async function listMutations(): Promise<QueuedMutation[]> {
  const db = await getDB();
  const all = await db.getAll('queue');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Supprime une mutation de la file.
 */
export async function deleteMutation(id: string): Promise<void> {
  await _delete(id);
  await refreshPendingCount();
}

/**
 * Remet une mutation en statut « pending » (depuis « error ») puis déclenche un flush.
 */
export async function retryMutation(id: string): Promise<void> {
  const db = await getDB();
  const mutation = await db.get('queue', id);
  if (!mutation || mutation.status !== 'error') return;
  await _put({ ...mutation, status: 'pending', error: undefined });
  await refreshPendingCount();
  // Flush sans délai (appel explicite de l'utilisateur)
  await flush();
}

/**
 * Recompte les mutations `pending` + `error` et met à jour le store.
 */
export async function refreshPendingCount(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('queue');
  const count = all.filter((m) => m.status === 'pending' || m.status === 'error').length;
  useOfflineStore.setState({ pendingMutations: count });
}

/**
 * Rejoue toutes les mutations `pending` dans l'ordre de création.
 *
 * Règles de traitement :
 * - 401 → stoppe le flush, authRequired = true (ne pas déconnecter)
 * - 4xx client (400/404/409/422) → status « error » + message, continue
 * - 5xx / réseau / timeout → reste « pending », stoppe le flush
 * - Succès → supprime de la base
 * - Fin : refresh du compteur
 */
export async function flush(): Promise<void> {
  if (_flushing) return;
  _flushing = true;

  let atLeastOneSuccess = false;

  try {
    const db = await getDB();
    const pending = (await db.getAll('queue'))
      .filter((m) => m.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt);

    if (pending.length === 0) return;

    // Import dynamique pour éviter le cycle d'évaluation (api.ts importe offline.store, pas queue)
    const { apiFetch, ApiError } = await import('@/lib/api');

    for (const mutation of pending) {
      try {
        await apiFetch(mutation.path, {
          method: 'POST',
          auth: true,
          // I6 : le body peut être une string (nouveau format) ou un objet (rétro-compat)
          body: typeof mutation.body === 'string' ? mutation.body : JSON.stringify(mutation.body),
          noLogoutOn401: true,
        });
        // Succès → supprime de la base
        await _delete(mutation.id);
        atLeastOneSuccess = true;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            // Token expiré pendant la synchro → signale, stoppe sans déconnecter
            useOfflineStore.setState({ authRequired: true });
            break;
          }
          if ([400, 404, 409, 422].includes(err.status)) {
            // Erreur client → la requête est invalide, on la marque error et on continue
            let shortMsg = 'Erreur serveur';
            try {
              const parsed = JSON.parse(err.body) as Record<string, unknown>;
              shortMsg = String(parsed.detail ?? parsed.error ?? parsed.message ?? shortMsg);
            } catch { /* corps non-JSON */ }
            await _put({ ...mutation, status: 'error', error: shortMsg, attempts: mutation.attempts + 1 });
            continue;
          }
          // Autre erreur HTTP (5xx) → réseau ou erreur serveur transitoire, on stoppe
          await _put({ ...mutation, attempts: mutation.attempts + 1 });
          break;
        }
        // Erreur réseau / AbortError (timeout) → stoppe
        await _put({ ...mutation, attempts: mutation.attempts + 1 });
        break;
      }
    }

    if (atLeastOneSuccess) {
      useOfflineStore.setState({ authRequired: false });
    }
  } finally {
    _flushing = false;
    await refreshPendingCount();
  }
}
