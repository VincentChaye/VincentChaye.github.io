/**
 * Remplacement drop-in de <TileLayer> react-leaflet avec support hors ligne.
 *
 * - Si isOfflineEnabled() est false → rend le TileLayer standard (aucun coût).
 * - Sinon :
 *   - mode 'offline' : cache-first (IndexedDB → placeholder transparent si absent).
 *   - mode 'online'  : fetch réseau → blob → affichage + mise en cache passive.
 *   - Changement de mode → redraw() automatique.
 */

import { useEffect, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { isOfflineEnabled } from './env';
import { useOfflineStore } from './offline.store';
import { getTileBlob, saveVisitedTile, pruneVisitedTiles, tileUrl } from './tiles';

/* ---------- Props ---------- */

export interface OfflineTileLayerProps {
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
  layerKey: string;
}

/* ---------- Placeholder tuile manquante : image vide fournie par Leaflet ---------- */
const PLACEHOLDER_DATA_URI = L.Util.emptyImageUrl;

/* ---------- Compteur d'écritures pour le pruning périodique ---------- */
let _writeCount = 0;
const PRUNE_EVERY = 50;

/* ---------- Classe Leaflet personnalisée (scope module) ---------- */

/**
 * Crée la classe TileLayer personnalisée avec accès à layerKey et subdomains.
 * Recréée à chaque changement de url/layerKey via le composant React.
 */
function createOfflineLayer(
  url: string,
  layerKey: string,
  attribution: string,
  subdomains: string | undefined,
  maxZoom: number,
): L.TileLayer {
  // ObjectURLs vivants par tuile <img> — révoqués via UN SEUL listener 'tileunload'
  // (un listener par tuile s'accumulerait sans jamais être retiré → fuite mémoire).
  const objectUrls = new Map<HTMLImageElement, string>();

  // Tuiles déchargées pendant un await (C3) : si la tuile disparaît avant la résolution
  // du fetch/cache, l'objectURL ne doit pas être créée (ou doit être révoquée immédiatement).
  const unloaded = new WeakSet<HTMLImageElement>();

  // Sous-classe ES6 de L.TileLayer
  class OfflineLayer extends L.TileLayer {
    private _objectUrls = objectUrls;

    createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
      const tile = document.createElement('img');
      tile.alt = '';

      const tileCoord = { z: coords.z, x: coords.x, y: coords.y };
      const mode = useOfflineStore.getState().mode;

      if (mode === 'offline') {
        // Cache-first : IndexedDB → placeholder
        void this._loadFromCache(tile, tileCoord, done);
      } else {
        // Online : fetch réseau → blob → affichage + cache passif
        void this._loadFromNetwork(tile, tileCoord, done);
      }

      return tile;
    }

    /** Charge une tuile depuis le cache IndexedDB. Fallback placeholder si absente. */
    private async _loadFromCache(
      tile: HTMLImageElement,
      tileCoord: { z: number; x: number; y: number },
      done: L.DoneCallback,
    ): Promise<void> {
      try {
        const blob = await getTileBlob(layerKey, tileCoord);
        // Si la tuile a été déchargée pendant l'await → abandon sans créer d'objectURL (C3)
        if (unloaded.has(tile)) {
          done(undefined, tile);
          return;
        }
        if (blob) {
          const objUrl = URL.createObjectURL(blob);
          this._objectUrls.set(tile, objUrl);
          tile.src = objUrl;
          done(undefined, tile);
        } else {
          // Tuile absente du cache → placeholder
          tile.src = PLACEHOLDER_DATA_URI;
          done(undefined, tile);
        }
      } catch {
        tile.src = PLACEHOLDER_DATA_URI;
        done(undefined, tile);
      }
    }

    /** Charge une tuile depuis le réseau, met en cache, fallback cache si erreur. */
    private async _loadFromNetwork(
      tile: HTMLImageElement,
      tileCoord: { z: number; x: number; y: number },
      done: L.DoneCallback,
    ): Promise<void> {
      // url et subdomains proviennent de la fermeture (createOfflineLayer)
      const resolvedUrl = tileUrl(
        url,
        tileCoord,
        typeof subdomains === 'string' ? subdomains : undefined,
      );

      try {
        const res = await fetch(resolvedUrl, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();

        // Si la tuile a été déchargée pendant le fetch → abandon sans créer d'objectURL (C3)
        if (unloaded.has(tile)) {
          done(undefined, tile);
          return;
        }

        const objUrl = URL.createObjectURL(blob);
        this._objectUrls.set(tile, objUrl);
        tile.src = objUrl;
        done(undefined, tile);

        // Mise en cache passive (fire-and-forget)
        void saveVisitedTile(layerKey, tileCoord, blob).then(() => {
          _writeCount++;
          if (_writeCount % PRUNE_EVERY === 0) {
            void pruneVisitedTiles();
          }
        });
      } catch {
        // Réseau KO → fallback cache
        try {
          const blob = await getTileBlob(layerKey, tileCoord);
          // Si la tuile a été déchargée pendant le fallback → abandon (C3)
          if (unloaded.has(tile)) {
            done(undefined, tile);
            return;
          }
          if (blob) {
            const objUrl = URL.createObjectURL(blob);
            this._objectUrls.set(tile, objUrl);
            tile.src = objUrl;
            done(undefined, tile);
          } else {
            tile.src = PLACEHOLDER_DATA_URI;
            done(undefined, tile);
          }
        } catch {
          tile.src = PLACEHOLDER_DATA_URI;
          done(undefined, tile);
        }
      }
    }
  }

  const layer = new OfflineLayer(url, {
    attribution,
    subdomains: subdomains ?? 'abc',
    maxZoom,
  });

  // Libère l'objectURL quand Leaflet décharge une tuile (un seul listener pour la layer).
  layer.on('tileunload', (e) => {
    const img = (e as L.TileEvent).tile as HTMLImageElement;
    // Marque la tuile comme déchargée pour les callbacks async en cours (C3)
    unloaded.add(img);
    const objUrl = objectUrls.get(img);
    if (objUrl) {
      URL.revokeObjectURL(objUrl);
      objectUrls.delete(img);
    }
  });

  // À la dépose de la layer (changement de couche / démontage) : libère tout ce qui reste.
  layer.on('remove', () => {
    for (const objUrl of objectUrls.values()) URL.revokeObjectURL(objUrl);
    objectUrls.clear();
  });

  return layer;
}

/* ---------- Composant interne (nécessite le contexte map) ---------- */

function OfflineTileLayerInner({
  url,
  attribution,
  subdomains,
  maxZoom,
  layerKey,
}: OfflineTileLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  // Instanciation et nettoyage de la layer personnalisée
  useEffect(() => {
    const layer = createOfflineLayer(url, layerKey, attribution, subdomains, maxZoom);
    layerRef.current = layer;
    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
    // Re-crée si url ou layerKey changent (couche différente)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, layerKey]);

  // Redraw quand le mode online↔offline change
  const mode = useOfflineStore((s) => s.mode);
  useEffect(() => {
    layerRef.current?.redraw();
  }, [mode]);

  return null;
}

/* ---------- Composant public ---------- */

/**
 * Remplace <TileLayer> de react-leaflet.
 * - En prod web (isOfflineEnabled() = false) : délègue au TileLayer standard.
 * - En natif / dev web : utilise la layer offline personnalisée.
 */
export function OfflineTileLayer(props: OfflineTileLayerProps) {
  if (!isOfflineEnabled()) {
    // Pas de hook conditionnel : le chemin standard est un composant séparé
    return (
      <TileLayer
        url={props.url}
        attribution={props.attribution}
        subdomains={props.subdomains ?? 'abc'}
        maxZoom={props.maxZoom}
      />
    );
  }

  return <OfflineTileLayerInner {...props} />;
}
