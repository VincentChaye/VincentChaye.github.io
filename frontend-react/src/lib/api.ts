/* ============================================
   ZoneDeGrimpe - API Client
   ============================================ */

import { useAuthStore } from '@/stores/auth.store';
import { isOfflineEnabled } from '@/offline/env';
import { useOfflineStore } from '@/offline/offline.store';

const PROD_API = 'https://zonedegrimpe.onrender.com';

function isLocalHost(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(hostname);
}

// En dev (localhost), on utilise '' pour passer par le proxy Vite (/api → localhost:3000).
// En prod ou avec VITE_API_BASE_URL explicite, on utilise l'URL complète.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && isLocalHost(window.location.hostname)
    ? ''
    : PROD_API);

/* ---------- Auth helpers ---------- */

function getToken(): string | null {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || 'null');
    return auth?.token || null;
  } catch {
    return null;
  }
}

/* ---------- Fetch wrapper ---------- */

interface FetchOptions extends RequestInit {
  auth?: boolean;
  /**
   * Si true, ne pas appeler logout() sur un 401 (utilisé pendant la synchro offline
   * pour ne pas déconnecter l'utilisateur alors que le token est simplement expiré).
   */
  noLogoutOn401?: boolean;
  /**
   * Si défini, la requête peut être mise en file d'attente offline quand :
   * - le mode effectif est 'offline', OU
   * - le fetch échoue avec une erreur réseau / timeout.
   * Retourne alors `{ queued: true }` au lieu de throw.
   * Ne s'applique JAMAIS sur une réponse HTTP 4xx/5xx (le serveur a répondu).
   */
  queueable?: 'spot' | 'logbook';
  /**
   * Timeout en ms pour cette requête (remplace le défaut 8 000 ms).
   * Appliqué uniquement si isOfflineEnabled() et pas de signal fourni et pas de FormData.
   */
  timeoutMs?: number;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { auth = false, noLogoutOn401 = false, queueable, timeoutMs, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (rest.body && !(rest.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE_URL}${path}`;

  // --- Mode offline détecté avant même l'appel réseau ---
  if (queueable && useOfflineStore.getState().mode === 'offline') {
    // On est déjà en mode offline → mise en file directe (I6 : stocke la STRING brute)
    const { enqueue } = await import('@/offline/queue');
    const bodyStr = typeof rest.body === 'string' ? rest.body : JSON.stringify(rest.body);
    await enqueue({ path, body: bodyStr, kind: queueable });
    return { queued: true } as T;
  }

  // --- Timeout heuristique connexion faible (natif ou dev uniquement) ---
  // Si pas de signal fourni et body non-FormData → timeout configurable (défaut 8 s, I3)
  let signal = rest.signal;
  if (isOfflineEnabled() && !signal && !(rest.body instanceof FormData)) {
    signal = AbortSignal.timeout(timeoutMs ?? 8000);
  }

  // Mémorise le signal du caller avant la tentative réseau, pour distinguer
  // une annulation volontaire (caller.aborted) d'un timeout interne.
  const callerSignal = rest.signal;

  try {
    const res = await fetch(url, {
      ...rest,
      signal: signal ?? undefined,
      headers,
      mode: 'cors',
    });

    // Réponse HTTP reçue (même 4xx/5xx) → signale au store que le réseau fonctionne
    if (isOfflineEnabled()) {
      useOfflineStore.getState().reportSuccess();
    }

    if (!res.ok) {
      // Token rejeté sur une requête authentifiée (expiré, secret tourné, cross-env) → la session
      // locale est invalide. On la purge : `isAuthenticated` retombe à false et les pages basculent
      // sur leur invite de connexion au lieu d'afficher un état d'erreur trompeur. Gardé sur `auth`
      // pour ne JAMAIS déconnecter sur un 401 de login (mauvais mot de passe = requête non-auth).
      // noLogoutOn401 : utilisé par le flush offline pour ne pas déconnecter pendant la synchro.
      if (res.status === 401 && auth && !noLogoutOn401 && useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().logout();
      }
      const body = await res.text().catch(() => '(no body)');
      throw new ApiError(res.status, res.statusText, body);
    }

    const text = await res.text();
    if (!text || text.trim() === '') return null as T;

    return JSON.parse(text) as T;
  } catch (err) {
    // Erreur réseau (TypeError) ou timeout (AbortError / DOMException name=TimeoutError)
    const isNetworkError =
      err instanceof TypeError ||
      (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError'));

    if (isNetworkError) {
      if (isOfflineEnabled()) {
        useOfflineStore.getState().reportFailure();
      }
      // Ne pas enqueuer si c'est une annulation volontaire du caller (AbortError
      // déclenché par le signal fourni par l'appelant, pas par notre timeout interne).
      const isCallerAbort = callerSignal?.aborted === true;
      // Mise en file d'attente si queueable et erreur réseau / timeout (I6 : STRING brute)
      if (queueable && !isCallerAbort) {
        const { enqueue } = await import('@/offline/queue');
        const bodyStr = typeof rest.body === 'string' ? rest.body : JSON.stringify(rest.body);
        await enqueue({ path, body: bodyStr, kind: queueable });
        return { queued: true } as T;
      }
    }

    // Rejet de toute autre erreur (ApiError déjà throw au-dessus, ou autre)
    throw err;
  }
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  body: string;

  constructor(status: number, statusText: string, body: string) {
    super(`[${status}] ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/* ---------- Cache helpers for spots ---------- */

const CACHE_KEY = 'cache_spots_v2';
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

interface CacheEntry<T> {
  ts: number;
  data: T;
}

export function getCachedSpots<T>(): T | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedSpots<T>(data: T): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota exceeded — silent */ }
}
