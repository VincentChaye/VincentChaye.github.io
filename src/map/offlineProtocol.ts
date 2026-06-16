/**
 * Protocole MapLibre `zdg://` — tuiles satellite avec support hors ligne.
 * Remplace l'ancien OfflineTileLayer Leaflet (même logique, mêmes utilitaires) :
 * - mode 'offline' : cache-first IndexedDB → tuile transparente si absente.
 * - mode 'online'  : fetch Esri → mise en cache passive + fallback cache si erreur.
 *
 * URL attendue : zdg://satellite/{z}/{x}/{y}
 */

import maplibregl from 'maplibre-gl';
import type { GetResourceResponse, RequestParameters } from 'maplibre-gl';
import { useOfflineStore } from '@/offline/offline.store';
import { getTileBlob, saveVisitedTile, pruneVisitedTiles, tileUrl, type TileCoord } from '@/offline/tiles';
import { SATELLITE_URL_TEMPLATE } from '@/offline/packs';

/* Tuile PNG 1×1 transparente (placeholder hors cache) */
const TRANSPARENT_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
).buffer;

let _writeCount = 0;
const PRUNE_EVERY = 50;

function parseTileUrl(url: string): { layer: string; coord: TileCoord } | null {
  const m = /^zdg:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)$/.exec(url);
  if (!m) return null;
  return { layer: m[1], coord: { z: Number(m[2]), x: Number(m[3]), y: Number(m[4]) } };
}

async function loadFromCache(layer: string, coord: TileCoord): Promise<ArrayBuffer> {
  try {
    const blob = await getTileBlob(layer, coord);
    if (blob) return await blob.arrayBuffer();
  } catch {
    /* IndexedDB indisponible → placeholder */
  }
  return TRANSPARENT_PNG;
}

async function loadFromNetwork(
  layer: string,
  coord: TileCoord,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  try {
    const res = await fetch(tileUrl(SATELLITE_URL_TEMPLATE, coord), { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    // Mise en cache passive (fire-and-forget) + pruning périodique
    void saveVisitedTile(layer, coord, blob).then(() => {
      _writeCount++;
      if (_writeCount % PRUNE_EVERY === 0) void pruneVisitedTiles();
    });

    return await blob.arrayBuffer();
  } catch (err) {
    if (signal.aborted) throw err;
    // Réseau KO → fallback cache
    return loadFromCache(layer, coord);
  }
}

let _registered = false;

export function registerOfflineProtocol(): void {
  if (_registered) return;
  _registered = true;

  maplibregl.addProtocol(
    'zdg',
    async (
      params: RequestParameters,
      abortController: AbortController,
    ): Promise<GetResourceResponse<ArrayBuffer>> => {
      const parsed = parseTileUrl(params.url);
      if (!parsed) throw new Error(`[zdg protocol] URL invalide : ${params.url}`);

      const mode = useOfflineStore.getState().mode;
      const data =
        mode === 'offline'
          ? await loadFromCache(parsed.layer, parsed.coord)
          : await loadFromNetwork(parsed.layer, parsed.coord, abortController.signal);

      return { data };
    },
  );
}
