/**
 * Gestion des packs hors-ligne : création, liste, suppression.
 * Un pack = zone téléchargée = tuiles de carte + voies des spots couverts.
 */

import { getDB, type OfflinePack } from './db';
import {
  tilesForRadius,
  tilesForCorridor,
  dedupeTiles,
  bboxAround,
  downloadTiles,
  PACK_ZOOM_MIN,
  MAX_ZOOM_PACK,
  CORRIDOR_ZOOM_MIN,
  MAX_ZOOM_CORRIDOR,
  MAX_TILES_PER_PACK,
  EST_BYTES_PER_TILE,
  type TileCoord,
} from './tiles';
import { getAllSpotsOffline, persistRoutesForSpots, fetchAndPersistSpotsInBBox } from './spots';

/* ---------- Constantes ---------- */

/** Template de tuiles satellite Esri (= couche 'satellite' de MapPage, ordre ArcGIS {z}/{y}/{x}) */
export const SATELLITE_URL_TEMPLATE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/* ---------- Types publics ---------- */

export interface PackOptions {
  /** Id MongoDB du spot central */
  spotId: string;
  /** Nom affiché dans la liste des packs */
  spotName: string;
  /** Coordonnées [lng, lat] du spot */
  center: [number, number];
  /** Rayon du pack autour du spot */
  radiusKm: 5 | 10 | 20;
  /**
   * Position de l'utilisateur [lng, lat] si l'option « inclure le trajet » est activée.
   * Si fourni, le couloir entre la position user et le spot est ajouté aux tuiles.
   */
  corridorFrom?: [number, number];
}

/* ---------- Helpers internes ---------- */

/**
 * Calcule l'ensemble des tuiles d'un pack (rayon + couloir optionnel), dédupliqué.
 */
function computePackTiles(opts: PackOptions): TileCoord[] {
  const [lng, lat] = opts.center;
  const radius = tilesForRadius(lng, lat, opts.radiusKm, PACK_ZOOM_MIN, MAX_ZOOM_PACK);
  if (!opts.corridorFrom) {
    return radius;
  }
  const corridor = tilesForCorridor(
    opts.corridorFrom,
    opts.center,
    3,
    CORRIDOR_ZOOM_MIN,
    MAX_ZOOM_CORRIDOR,
  );
  return dedupeTiles([...radius, ...corridor]);
}

/* ---------- Mutex pour sérialiser les createPack concurrents (C2) ---------- */

let _packChain: Promise<unknown> = Promise.resolve();

/* ---------- API publique ---------- */

/**
 * Estime le nombre de tuiles et la taille en octets d'un pack AVANT de le télécharger.
 * `tooBig` indique si le pack dépasse la limite et ne peut pas être créé.
 */
export function estimatePackForOptions(opts: PackOptions): {
  tileCount: number;
  estBytes: number;
  tooBig: boolean;
} {
  const tiles = computePackTiles(opts);
  const tileCount = tiles.length;
  return {
    tileCount,
    estBytes: tileCount * EST_BYTES_PER_TILE,
    tooBig: tileCount > MAX_TILES_PER_PACK,
  };
}

/**
 * Crée un pack hors-ligne (wrapper qui sérialise les appels concurrents).
 */
export function createPack(
  opts: PackOptions,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<OfflinePack> {
  const run = _packChain.then(() => _createPack(opts, onProgress, signal));
  _packChain = run.catch(() => {});
  return run;
}

/**
 * Implémentation interne de createPack :
 * 1. Calcule les tuiles ; erreur si trop grand.
 * 2. Demande la persistance du stockage (best-effort).
 * 3. Écrit le doc pack en `downloading` dans IndexedDB.
 * 4. Télécharge les tuiles.
 * 5. Si signal aborted après tuiles → statut `partial` + return immédiat (pas de fetch voies).
 * 6. Détermine les spots couverts par la bbox du rayon.
 * 7. Persiste les voies des spots couverts (best-effort → `partial` si échec).
 * 8. Met à jour le statut final du pack.
 */
async function _createPack(
  opts: PackOptions,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<OfflinePack> {
  const tiles = computePackTiles(opts);

  if (tiles.length > MAX_TILES_PER_PACK) {
    throw new Error('PACK_TOO_BIG');
  }

  // Premier pack → demander la persistance du stockage (best-effort, pas bloquant)
  const db = await getDB();
  const existingPacks = await db.getAll('packs');
  if (existingPacks.length === 0) {
    navigator.storage?.persist?.().catch(() => {});
  }

  // Écriture initiale du doc pack en état `downloading`
  const packId = crypto.randomUUID();
  const now = Date.now();
  const [lng, lat] = opts.center;
  const pack: OfflinePack = {
    id: packId,
    name: opts.spotName,
    spotId: opts.spotId,
    radiusKm: opts.radiusKm,
    ...(opts.corridorFrom
      ? { corridor: { from: opts.corridorFrom, to: opts.center, widthKm: 3 } }
      : {}),
    layer: 'satellite',
    zooms: { min: PACK_ZOOM_MIN, max: MAX_ZOOM_PACK },
    tileCount: tiles.length,
    bytes: 0,
    spotIds: [],
    status: 'downloading',
    createdAt: now,
  };
  await db.put('packs', pack);

  let routesError = false;

  try {
    // Téléchargement des tuiles (couche satellite — pas de sous-domaines chez Esri)
    const result = await downloadTiles(tiles, 'satellite', SATELLITE_URL_TEMPLATE, {
      packId,
      signal,
      onProgress,
    });

    // Court-circuit après downloadTiles si signal aborté (I2)
    if (signal?.aborted) {
      const partialPack: OfflinePack = {
        ...pack,
        tileCount: result.downloaded + result.skipped,
        bytes: result.bytes,
        spotIds: [],
        status: 'partial',
      };
      await db.put('packs', partialPack);
      return partialPack;
    }

    // Spots couverts : fetch API de la bbox + persistance hors ligne (pour qu'ils
    // s'affichent sur la carte même si elle n'a jamais été ouverte en ligne).
    // Repli sur le cache IndexedDB si le réseau échoue.
    const bbox = bboxAround(lng, lat, opts.radiusKm);
    const fetched = await fetchAndPersistSpotsInBBox(bbox);
    const allSpots = (fetched ?? await getAllSpotsOffline()) as {
      geometry?: { coordinates?: number[] };
      properties?: Record<string, unknown>;
    }[];
    const coveredSpotIds: string[] = [];
    for (const feature of allSpots) {
      const coords = feature?.geometry?.coordinates;
      const fLng = coords?.[0];
      const fLat = coords?.[1];
      if (
        typeof fLng === 'number' &&
        typeof fLat === 'number' &&
        fLng >= bbox.minLng &&
        fLng <= bbox.maxLng &&
        fLat >= bbox.minLat &&
        fLat <= bbox.maxLat
      ) {
        const id = String(
          feature?.properties?.id ?? feature?.properties?._id ?? '',
        );
        if (id) coveredSpotIds.push(id);
      }
    }

    // Persistance des voies (best-effort)
    if (coveredSpotIds.length > 0) {
      try {
        await persistRoutesForSpots(coveredSpotIds);
      } catch {
        routesError = true;
      }
    }

    // Calcul du statut final
    // Note I8 : si seules les voies échouent (routesError), spotIds est quand même
    // peuplé (coveredSpotIds) — les voies pourront être retéléchargées plus tard.
    let status: OfflinePack['status'];
    if (result.failed > 0 || routesError || fetched === null) {
      // fetched === null : spots de la zone non rafraîchis depuis l'API (repli cache)
      status = 'partial';
    } else {
      status = 'ready';
    }

    const updatedPack: OfflinePack = {
      ...pack,
      tileCount: result.downloaded + result.skipped,
      bytes: result.bytes,
      spotIds: coveredSpotIds,
      status,
    };
    await db.put('packs', updatedPack);
    return updatedPack;
  } catch (err) {
    // Quota IndexedDB dépassé → statut 'error' + rethrow
    const isQuota =
      err instanceof DOMException && err.name === 'QuotaExceededError';
    const finalStatus: OfflinePack['status'] = isQuota ? 'error' : 'partial';
    const errPack: OfflinePack = { ...pack, status: finalStatus };
    await db.put('packs', errPack).catch(() => {});
    throw err;
  }
}

/**
 * Retourne la liste des packs hors-ligne, triée par date de création décroissante.
 */
export async function listPacks(): Promise<OfflinePack[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('packs');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Supprime un pack hors-ligne :
 * - Retire l'id du pack des tuiles associées (supprime la tuile si plus aucun pack).
 * - Supprime les voies des spots n'appartenant à aucun autre pack.
 * - Supprime le doc pack.
 */
export async function deletePack(id: string): Promise<void> {
  const db = await getDB();

  // Infos du pack à supprimer
  const pack = await db.get('packs', id);
  if (!pack) return;

  // Récupère les autres packs pour calculer les spotIds encore référencés
  const otherPacks = (await db.getAll('packs')).filter((p) => p.id !== id);
  const otherSpotIds = new Set(otherPacks.flatMap((p) => p.spotIds));

  // Tuiles : utilise l'index `by-pack` pour trouver toutes les tuiles du pack
  const tileKeys = await db.getAllKeysFromIndex('tiles', 'by-pack', id);

  if (tileKeys.length > 0) {
    const tileTx = db.transaction('tiles', 'readwrite');
    for (const key of tileKeys) {
      const entry = await tileTx.store.get(key as string);
      if (!entry) continue;
      const newPackIds = entry.packIds.filter((pid) => pid !== id);
      if (newPackIds.length === 0) {
        // Aucun autre pack → supprime la tuile
        tileTx.store.delete(key as string);
      } else {
        // Mise à jour sans le pack supprimé
        tileTx.store.put({ ...entry, packIds: newPackIds, updatedAt: Date.now() }, key as string);
      }
    }
    await tileTx.done;
  }

  // Voies : supprime uniquement les spotIds non couverts par un autre pack
  const spotIdsToRemove = pack.spotIds.filter((sid) => !otherSpotIds.has(sid));
  if (spotIdsToRemove.length > 0) {
    const routesTx = db.transaction('routes', 'readwrite');
    for (const spotId of spotIdsToRemove) {
      routesTx.store.delete(spotId);
    }
    await routesTx.done;
  }

  // Suppression du doc pack
  await db.delete('packs', id);
}

/**
 * Retourne l'estimation d'utilisation du stockage persistant du navigateur.
 * Null si l'API n'est pas disponible ou en cas d'erreur.
 */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    return { usage, quota };
  } catch {
    return null;
  }
}
