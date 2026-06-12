import { isOfflineEnabled } from './env';
import { getDB } from './db';
import { apiFetch } from '@/lib/api';

const CHUNK_SIZE = 2000;

/**
 * Persiste toutes les features GeoJSON dans IndexedDB (store `spots`).
 * Traitement par chunks de ~2000 pour ne pas geler l'UI.
 * No-op silencieux si le mode hors ligne est désactivé ou si IndexedDB échoue.
 */
export async function persistAllSpots(features: unknown[]): Promise<void> {
  if (!isOfflineEnabled()) return;
  try {
    const db = await getDB();
    for (let i = 0; i < features.length; i += CHUNK_SIZE) {
      const chunk = features.slice(i, i + CHUNK_SIZE) as { geometry: unknown; properties: Record<string, unknown> }[];
      const tx = db.transaction(['spots', 'meta'], 'readwrite');
      for (const feature of chunk) {
        const id = String(feature.properties?.id ?? feature.properties?._id ?? '');
        if (!id) continue;
        tx.objectStore('spots').put({ geometry: feature.geometry, properties: feature.properties }, id);
      }
      // Mise à jour du timestamp uniquement sur le dernier chunk
      if (i + CHUNK_SIZE >= features.length) {
        tx.objectStore('meta').put(Date.now(), 'spots_updated_at');
      }
      await tx.done;
      // Pause entre chunks pour ne pas geler l'UI
      if (i + CHUNK_SIZE < features.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
  } catch {
    // Silencieux — le mode offline ne doit jamais bloquer l'app
  }
}

/**
 * Récupère depuis l'API les spots d'une bbox et les persiste dans IndexedDB.
 * Garantit que les spots d'une zone téléchargée sont visibles sur la carte hors ligne,
 * même si l'utilisateur n'a jamais ouvert la carte en ligne (le store `spots` serait vide).
 * Retourne les features, ou null en cas d'échec réseau (l'appelant se replie sur le cache).
 */
export async function fetchAndPersistSpotsInBBox(bbox: {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}): Promise<unknown[] | null> {
  try {
    const qs = `minLng=${bbox.minLng}&minLat=${bbox.minLat}&maxLng=${bbox.maxLng}&maxLat=${bbox.maxLat}`;
    const data = await apiFetch<{ features?: unknown[] }>(
      `/api/spots?${qs}&limit=20000&format=geojson`,
      { timeoutMs: 30000 },
    );
    const features = data?.features ?? [];
    await persistAllSpots(features);
    return features;
  } catch {
    return null;
  }
}

/**
 * Retourne toutes les features brutes depuis IndexedDB.
 * Retourne [] si le store est vide ou en cas d'erreur.
 */
export async function getAllSpotsOffline(): Promise<unknown[]> {
  try {
    const db = await getDB();
    return await db.getAll('spots');
  } catch {
    return [];
  }
}

/**
 * Retourne une feature brute par son id, ou null si absente/erreur.
 */
export async function getSpotOffline(id: string): Promise<unknown | null> {
  try {
    const db = await getDB();
    return (await db.get('spots', id)) ?? null;
  } catch {
    return null;
  }
}

/* ============================================================
   Voies d'escalade par spot (persistance hors-ligne)
   ============================================================ */

const ROUTES_CHUNK_SIZE = 500;

/**
 * Télécharge les voies pour un tableau de spotIds (chunks de 500) via l'endpoint batch
 * et les persiste dans le store `routes`.
 * Les spots sans voies dans la réponse reçoivent quand même `{ routes: [], updatedAt }`
 * pour distinguer « pas de voies » de « jamais téléchargé ».
 */
export async function persistRoutesForSpots(spotIds: string[]): Promise<void> {
  const db = await getDB();
  for (let i = 0; i < spotIds.length; i += ROUTES_CHUNK_SIZE) {
    const chunk = spotIds.slice(i, i + ROUTES_CHUNK_SIZE);
    // Appel batch — réponse : { "spotId": [voies...], ... }
    const data = await apiFetch<Record<string, unknown[]>>('/api/climbing-routes/by-spots', {
      method: 'POST',
      body: JSON.stringify({ spotIds: chunk }),
      timeoutMs: 30000,
    });
    const now = Date.now();
    const tx = db.transaction('routes', 'readwrite');
    for (const spotId of chunk) {
      const routesForSpot = data?.[spotId] ?? [];
      tx.store.put({ routes: routesForSpot, updatedAt: now }, spotId);
    }
    await tx.done;
    // Pause entre chunks pour ne pas geler l'UI
    if (i + ROUTES_CHUNK_SIZE < spotIds.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
}

/**
 * Retourne les voies d'un spot depuis IndexedDB.
 * - `unknown[]` si présentes (peut être un tableau vide = aucune voie).
 * - `null` si jamais téléchargées.
 */
export async function getRoutesOffline(spotId: string): Promise<unknown[] | null> {
  try {
    const db = await getDB();
    const entry = await db.get('routes', spotId);
    if (!entry) return null;
    return entry.routes;
  } catch {
    return null;
  }
}
