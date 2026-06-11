/**
 * Utilitaires de tuiles carte pour le mode hors ligne.
 * Formules Web Mercator standard + téléchargement avec pool de concurrence.
 */

import { getDB } from './db';

/* ---------- Constantes exportées ---------- */

/** Zoom minimum pour un pack de spot */
export const PACK_ZOOM_MIN = 5;
/** Zoom maximum pour un pack de spot */
export const MAX_ZOOM_PACK = 15;
/** Zoom minimum pour un couloir entre spots */
export const CORRIDOR_ZOOM_MIN = 8;
/** Zoom maximum pour un couloir */
export const MAX_ZOOM_CORRIDOR = 12;
/** Nombre maximum de tuiles par pack (utilisé par les UIs pour validation) */
export const MAX_TILES_PER_PACK = 8000;
/** Poids estimé en octets par tuile (15 Ko) */
export const EST_BYTES_PER_TILE = 15_000;
/** Nombre max de tuiles visitées conservées en cache passif */
export const VISITED_TILES_CAP = 1000;

/* ---------- Types ---------- */

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/* ---------- Maths tuiles (Web Mercator) ---------- */

/**
 * Convertit un couple lng/lat en coordonnées de tuile pour le niveau de zoom z.
 * La latitude est clampée à ±85.0511° (limite Mercator).
 */
export function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  // Clamp latitude dans les limites Mercator
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = clampedLat * Math.PI / 180;
  const x = Math.max(0, Math.min(n - 1, Math.floor((lng + 180) / 360 * n)));
  const y = Math.max(0, Math.min(n - 1, Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n)));
  return { x, y };
}

/**
 * Retourne toutes les tuiles couvrant la bbox [minZ, maxZ].
 */
export function tilesForBBox(bbox: BBox, minZ: number, maxZ: number): TileCoord[] {
  const coords: TileCoord[] = [];
  for (let z = minZ; z <= maxZ; z++) {
    // Coin NW (minLat → y max, maxLng → x max) et coin SE (maxLat → y min, minLng → x min)
    const topLeft = lngLatToTile(bbox.minLng, bbox.maxLat, z);
    const bottomRight = lngLatToTile(bbox.maxLng, bbox.minLat, z);
    const xMin = Math.min(topLeft.x, bottomRight.x);
    const xMax = Math.max(topLeft.x, bottomRight.x);
    const yMin = Math.min(topLeft.y, bottomRight.y);
    const yMax = Math.max(topLeft.y, bottomRight.y);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        coords.push({ z, x, y });
      }
    }
  }
  return coords;
}

/**
 * Calcule une bbox rectangulaire autour d'un point (lng, lat) à rayon radiusKm.
 */
export function bboxAround(lng: number, lat: number, radiusKm: number): BBox {
  const deltaLat = radiusKm / 111;
  const deltaLng = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  return {
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLng: lng - deltaLng,
    maxLng: lng + deltaLng,
  };
}

/**
 * Retourne toutes les tuiles dans un rayon radiusKm autour de (lng, lat), zooms [minZ, maxZ].
 */
export function tilesForRadius(
  lng: number,
  lat: number,
  radiusKm: number,
  minZ: number,
  maxZ: number,
): TileCoord[] {
  const bbox = bboxAround(lng, lat, radiusKm);
  return tilesForBBox(bbox, minZ, maxZ);
}

/**
 * Retourne les tuiles couvrant un couloir entre deux points (lng,lat),
 * d'une demi-largeur widthKm, zooms [minZ, maxZ].
 * Échantillonne le segment tous les ~2 km et fait l'union dédupliquée.
 */
export function tilesForCorridor(
  from: [number, number],
  to: [number, number],
  widthKm: number,
  minZ: number,
  maxZ: number,
): TileCoord[] {
  // Distance approximative du segment (Haversine simplifiée)
  const R = 6371;
  const dLat = (to[1] - from[1]) * Math.PI / 180;
  const dLng = (to[0] - from[0]) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from[1] * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Nombre d'échantillons : au moins 2 (extrémités), +1 par tranche de ~2 km
  const steps = Math.max(1, Math.ceil(distKm / 2));
  const seen = new Set<string>();
  const coords: TileCoord[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t;
    const bbox = bboxAround(lng, lat, widthKm);
    const tiles = tilesForBBox(bbox, minZ, maxZ);
    for (const tile of tiles) {
      const key = `${tile.z}/${tile.x}/${tile.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        coords.push(tile);
      }
    }
  }
  return coords;
}

/**
 * Déduplique un tableau de TileCoord par clé z/x/y.
 */
export function dedupeTiles(coords: TileCoord[]): TileCoord[] {
  const seen = new Set<string>();
  const result: TileCoord[] = [];
  for (const c of coords) {
    const key = `${c.z}/${c.x}/${c.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
    }
  }
  return result;
}

/**
 * Estime la taille d'un pack à partir du nombre de tuiles.
 */
export function estimatePack(tileCount: number): { tileCount: number; estBytes: number } {
  return { tileCount, estBytes: tileCount * EST_BYTES_PER_TILE };
}

/* ---------- URLs de tuiles ---------- */

/**
 * Génère l'URL d'une tuile à partir d'un template Leaflet.
 * Remplace {z}, {x}, {y}, {s} (sous-domaine déterministe), {r} → ''.
 * Compatible avec l'ordre ArcGIS {z}/{y}/{x}.
 */
export function tileUrl(
  template: string,
  coord: TileCoord,
  subdomains?: string,
): string {
  let url = template;
  url = url.replace('{z}', String(coord.z));
  url = url.replace('{x}', String(coord.x));
  url = url.replace('{y}', String(coord.y));
  url = url.replace('{r}', '');
  if (subdomains && subdomains.length > 0) {
    const s = subdomains[(coord.x + coord.y) % subdomains.length];
    url = url.replace('{s}', s);
  } else {
    url = url.replace('{s}', '');
  }
  return url;
}

/* ---------- Clé IndexedDB ---------- */

/** Clé composite utilisée dans le store `tiles` d'IndexedDB. */
export function tileKey(layer: string, c: TileCoord): string {
  return `${layer}/${c.z}/${c.x}/${c.y}`;
}

/* ---------- Lecture / écriture de tuiles en base ---------- */

/**
 * Lit le blob d'une tuile depuis IndexedDB, ou null si absent.
 */
export async function getTileBlob(layer: string, c: TileCoord): Promise<Blob | null> {
  const db = await getDB();
  const entry = await db.get('tiles', tileKey(layer, c));
  return entry?.blob ?? null;
}

/**
 * Enregistre une tuile visitée (cache passif).
 * - Si l'entrée n'existe pas → insert.
 * - Si elle existe avec packIds vide → met à jour blob + updatedAt.
 * - Si elle existe avec packIds non vide (tuile de pack) → ne touche pas.
 * Utilise une seule transaction readwrite pour éviter la race read-modify-write.
 */
export async function saveVisitedTile(layer: string, c: TileCoord, blob: Blob): Promise<void> {
  const db = await getDB();
  const key = tileKey(layer, c);
  const tx = db.transaction('tiles', 'readwrite');
  const existing = await tx.store.get(key);
  if (existing) {
    if (existing.packIds.length > 0) {
      // Tuile de pack → ne pas écraser
      await tx.done;
      return;
    }
    // Tuile visitée existante → met à jour blob + updatedAt
    tx.store.put({ blob, packIds: [], updatedAt: Date.now() }, key);
  } else {
    tx.store.put({ blob, packIds: [], updatedAt: Date.now() }, key);
  }
  await tx.done;
}

/**
 * Élagage du cache passif (tuiles visitées, packIds vide).
 * Conserve les `cap` tuiles les plus récentes, supprime les autres.
 * Utilise un curseur readonly pour ne pas charger tous les blobs en mémoire.
 */
export async function pruneVisitedTiles(cap = VISITED_TILES_CAP): Promise<void> {
  const db = await getDB();
  // Scan readonly avec curseur : une entrée à la fois, pas de blob chargé en masse
  const scanTx = db.transaction('tiles', 'readonly');
  let cursor = await scanTx.store.openCursor();
  const visited: { key: string; updatedAt: number }[] = [];
  while (cursor) {
    if (cursor.value.packIds.length === 0) {
      visited.push({ key: cursor.key as string, updatedAt: cursor.value.updatedAt });
    }
    cursor = await cursor.continue();
  }
  if (visited.length <= cap) return;
  // Trie par updatedAt croissant (les plus vieilles en premier)
  visited.sort((a, b) => a.updatedAt - b.updatedAt);
  const toDelete = visited.slice(0, visited.length - cap);
  const tx = db.transaction('tiles', 'readwrite');
  for (const item of toDelete) {
    tx.store.delete(item.key);
  }
  await tx.done;
}

/* ---------- Téléchargement de pack ---------- */

/** Options pour downloadTiles */
interface DownloadOptions {
  subdomains?: string;
  concurrency?: number;
  packId: string;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Résultat d'un téléchargement de pack */
interface DownloadResult {
  downloaded: number;
  skipped: number;
  failed: number;
  bytes: number;
}

/**
 * Télécharge un ensemble de tuiles et les enregistre dans IndexedDB.
 * - Pool de concurrence configurable (défaut 4).
 * - Tuile déjà présente → ajoute packId si absent (skipped).
 * - Respecte l'AbortSignal externe + timeout individuel de 15 s par tuile.
 */
export async function downloadTiles(
  coords: TileCoord[],
  layer: string,
  urlTemplate: string,
  opts: DownloadOptions,
): Promise<DownloadResult> {
  const { subdomains, concurrency = 4, packId, signal: externalSignal, onProgress } = opts;
  const db = await getDB();
  const total = coords.length;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;
  let done = 0;

  // Traitement d'une seule tuile
  async function processTile(coord: TileCoord): Promise<void> {
    if (externalSignal?.aborted) return;

    const key = tileKey(layer, coord);

    // Chemin « tuile déjà présente » : une seule transaction readwrite pour éviter la race
    {
      const tx = db.transaction('tiles', 'readwrite');
      const existing = await tx.store.get(key);
      if (existing) {
        if (!existing.packIds.includes(packId)) {
          existing.packIds = [...existing.packIds, packId];
          existing.updatedAt = Date.now();
          void tx.store.put(existing, key);
        }
        await tx.done;
        skipped++;
        return;
      }
      await tx.done;
    }

    // Téléchargement (hors transaction — fetch ne peut pas s'exécuter dans une tx active)
    try {
      if (externalSignal?.aborted) {
        failed++;
        return;
      }
      // Combinaison du signal externe avec un timeout par tuile
      const timeoutSignal = AbortSignal.timeout(15_000);
      // AbortSignal.any n'est pas disponible partout — combinaison manuelle
      const combinedController = new AbortController();
      const abort = () => combinedController.abort();
      externalSignal?.addEventListener('abort', abort, { once: true });
      timeoutSignal.addEventListener('abort', abort, { once: true });

      let blob: Blob;
      try {
        const url = tileUrl(urlTemplate, coord, subdomains);
        const res = await fetch(url, { signal: combinedController.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      } finally {
        externalSignal?.removeEventListener('abort', abort);
        timeoutSignal.removeEventListener('abort', abort);
      }

      // Écriture après fetch : relit dans une tx readwrite (la tuile a pu être créée
      // entre-temps par saveVisitedTile ou un autre pack concurrent)
      const writeTx = db.transaction('tiles', 'readwrite');
      const concurrent = await writeTx.store.get(key);
      if (concurrent) {
        // Entrée créée entre-temps → merge packIds, garde le blob existant
        if (!concurrent.packIds.includes(packId)) {
          concurrent.packIds = [...concurrent.packIds, packId];
          concurrent.updatedAt = Date.now();
          void writeTx.store.put(concurrent, key);
        }
      } else {
        void writeTx.store.put({ blob, packIds: [packId], updatedAt: Date.now() }, key);
      }
      await writeTx.done;

      bytes += blob.size;
      downloaded++;
    } catch {
      // Échec non-bloquant : on passe à la tuile suivante
      failed++;
    }
  }

  // Pool de concurrence (N workers consomment la même file)
  let index = 0;

  async function worker(): Promise<void> {
    while (index < total) {
      if (externalSignal?.aborted) break;
      const i = index++;
      await processTile(coords[i]);
      done++;
      onProgress?.(done, total);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, total); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return { downloaded, skipped, failed, bytes };
}
