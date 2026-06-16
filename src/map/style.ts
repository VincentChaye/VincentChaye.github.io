/**
 * Style et couches de fond MapLibre.
 *
 * Stratégie : un seul style de base (vector MapTiler) chargé une fois ; les fonds
 * satellite/topo sont des sources raster ajoutées par-dessus et togglées par
 * `visibility`. On n'appelle JAMAIS map.setStyle() pour changer de fond — cela
 * détruirait les sources spots/DEM et les handlers.
 */

import type maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { SATELLITE_URL_TEMPLATE } from '@/offline/packs';

export type BaseLayerKey = 'outdoor' | 'satellite' | 'topo';
export type StyleVariant = 'outdoor' | 'dark';

export const MAPTILER_KEY: string = import.meta.env.VITE_MAPTILER_KEY ?? '';

export const SATELLITE_SOURCE_ID = 'zdg-satellite';
export const SATELLITE_LAYER_ID = 'zdg-satellite-layer';
export const TOPO_SOURCE_ID = 'zdg-topo';
export const TOPO_LAYER_ID = 'zdg-topo-layer';
export const TERRAIN_SOURCE_ID = 'zdg-dem';

/** Protocole custom de lecture des tuiles satellite via IndexedDB (offline). */
export const OFFLINE_SATELLITE_TILES = 'zdg://satellite/{z}/{x}/{y}';

const MAPTILER_STYLES: Record<StyleVariant, string> = {
  outdoor: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
  dark: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
};

/** Fallback raster OSM si la clé MapTiler est absente (build/preview sans .env). */
const OSM_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'osm-fallback': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm-fallback-layer', type: 'raster', source: 'osm-fallback' }],
};

export function buildBaseStyle(variant: StyleVariant): string | StyleSpecification {
  if (!MAPTILER_KEY) {
    console.warn('[map] VITE_MAPTILER_KEY absente — fallback raster OSM, pas de terrain 3D.');
    return OSM_FALLBACK_STYLE;
  }
  return MAPTILER_STYLES[variant];
}

/** Police disponible sur le serveur de glyphes (MapTiler et demotiles). */
export function clusterTextFont(): string[] {
  return MAPTILER_KEY ? ['Noto Sans Bold'] : ['Open Sans Semibold'];
}

/**
 * Ajoute les sources/layers raster satellite + topo (masqués par défaut).
 * `offlineSatellite` route les tuiles satellite par le protocole zdg:// (IndexedDB).
 * À appeler une fois au 'load' de la carte, AVANT addSpotsLayers (les spots
 * doivent rester au-dessus des rasters).
 */
export function addRasterBaseLayers(map: maplibregl.Map, offlineSatellite: boolean): void {
  map.addSource(SATELLITE_SOURCE_ID, {
    type: 'raster',
    tiles: [offlineSatellite ? OFFLINE_SATELLITE_TILES : SATELLITE_URL_TEMPLATE],
    tileSize: 256,
    maxzoom: 18,
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  });
  map.addLayer({
    id: SATELLITE_LAYER_ID,
    type: 'raster',
    source: SATELLITE_SOURCE_ID,
    layout: { visibility: 'none' },
  });

  map.addSource(TOPO_SOURCE_ID, {
    type: 'raster',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    tileSize: 256,
    maxzoom: 17,
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  });
  map.addLayer({
    id: TOPO_LAYER_ID,
    type: 'raster',
    source: TOPO_SOURCE_ID,
    layout: { visibility: 'none' },
  });
}

/** Couches ajoutées par nous (jamais togglées avec le fond). */
const OWN_LAYER_PREFIXES = ['zdg-', 'spots', 'user-location', 'osm-fallback'];

function isOwnLayer(id: string): boolean {
  return OWN_LAYER_PREFIXES.some((p) => id.startsWith(p));
}

/** Ids des couches du style vector visibles à l'origine (à restaurer en mode outdoor). */
const baseStyleVisibleLayers = new WeakMap<maplibregl.Map, string[]>();

/**
 * Bascule le fond visible. Quand un raster opaque (satellite/topo) couvre la carte,
 * les couches du style vector sont masquées : sinon MapLibre continue de télécharger
 * et rendre leurs tuiles à chaque déplacement alors qu'elles sont invisibles —
 * coûteux sur les appareils modestes.
 */
export function applyBaseLayer(map: maplibregl.Map, key: BaseLayerKey): void {
  if (!map.getLayer(SATELLITE_LAYER_ID) || !map.getLayer(TOPO_LAYER_ID)) return;
  map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', key === 'satellite' ? 'visible' : 'none');
  map.setLayoutProperty(TOPO_LAYER_ID, 'visibility', key === 'topo' ? 'visible' : 'none');

  let visibleIds = baseStyleVisibleLayers.get(map);
  if (!visibleIds) {
    visibleIds = map
      .getStyle()
      .layers.filter((l) => !isOwnLayer(l.id) && l.layout?.visibility !== 'none')
      .map((l) => l.id);
    baseStyleVisibleLayers.set(map, visibleIds);
  }

  const vectorVisibility = key === 'outdoor' ? 'visible' : 'none';
  for (const id of visibleIds) {
    map.setLayoutProperty(id, 'visibility', vectorVisibility);
  }
}

/** Source DEM MapTiler + activation du relief 3D. No-op sans clé API. */
export function addTerrain(map: maplibregl.Map, exaggeration = 1.2): void {
  if (!MAPTILER_KEY) return;
  if (!map.getSource(TERRAIN_SOURCE_ID)) {
    map.addSource(TERRAIN_SOURCE_ID, {
      type: 'raster-dem',
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
    });
  }
  map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration });
}

export function setTerrainEnabled(map: maplibregl.Map, enabled: boolean): void {
  if (enabled) {
    addTerrain(map);
  } else {
    map.setTerrain(null);
  }
}
