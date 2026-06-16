/**
 * Couche spots MapLibre : source GeoJSON clusterisée native + layers GPU.
 * Remplace react-leaflet-cluster + markers DOM (intenable avec 20 000 spots).
 *
 * Équivalences Leaflet :
 * - MarkerClusterGroup maxClusterRadius=50    → clusterRadius: 50
 * - disableClusteringAtZoom=16                → clusterMaxZoom: 15
 * - L.divIcon par type                        → layer symbol (pin) ou circle (dot), data-driven
 * - clic cluster / spiderfy                   → getClusterExpansionZoom + easeTo
 */

import type maplibregl from 'maplibre-gl';
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { normalizeSpotType } from '@/redesign/lib/spotType';

export type SpotMarkerType = 'crag' | 'boulder' | 'indoor' | 'shop';
export type SpotPalette = Record<SpotMarkerType, string>;

export interface SpotPoint {
  id: string;
  lat: number;
  lng: number;
  /** Peut contenir des valeurs héritées (`falaise`, `dif`…) — normalisé à la conversion GeoJSON */
  type: string;
  name: string;
}

export interface SpotsLayerOptions {
  palette: SpotPalette;
  /** 'pin' : épingles SVG (web) — 'dot' : pastilles circle (redesign) */
  marker: 'pin' | 'dot';
  clusterColor: string;
  textFont: string[];
}

export const SPOTS_SOURCE_ID = 'spots';
const CLUSTERS_LAYER_ID = 'spots-clusters';
const CLUSTER_COUNT_LAYER_ID = 'spots-cluster-count';
const POINTS_LAYER_ID = 'spots-points';

const USER_SOURCE_ID = 'user-location';
const USER_HALO_LAYER_ID = 'user-location-halo';
const USER_DOT_LAYER_ID = 'user-location-dot';

const SPOT_TYPES: SpotMarkerType[] = ['crag', 'boulder', 'indoor', 'shop'];

export function spotsToFeatureCollection(spots: readonly SpotPoint[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: spots.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: { id: s.id, type: normalizeSpotType(s.type), name: s.name },
    })),
  };
}

/* ---------- Épingles SVG → images de style (mode 'pin') ---------- */

function pinSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="56" height="56" fill="${color}" stroke="white" stroke-width="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="3" fill="white"/>
  </svg>`;
}

async function loadPinImages(map: maplibregl.Map, palette: SpotPalette): Promise<void> {
  await Promise.all(
    SPOT_TYPES.map(
      (type) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image(56, 56);
          img.onload = () => {
            if (!map.hasImage(`pin-${type}`)) {
              map.addImage(`pin-${type}`, img, { pixelRatio: 2 });
            }
            resolve();
          };
          img.onerror = () => reject(new Error(`pin-${type}`));
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg(palette[type]))}`;
        }),
    ),
  );
}

/* ---------- Couleur data-driven par type ---------- */

function typeColorExpression(palette: SpotPalette): maplibregl.ExpressionSpecification {
  return [
    'match',
    ['get', 'type'],
    'crag', palette.crag,
    'boulder', palette.boulder,
    'indoor', palette.indoor,
    'shop', palette.shop,
    palette.crag,
  ];
}

/* ---------- Création des layers ---------- */

export async function addSpotsLayers(
  map: maplibregl.Map,
  opts: SpotsLayerOptions,
): Promise<void> {
  if (map.getSource(SPOTS_SOURCE_ID)) return;

  if (opts.marker === 'pin') {
    await loadPinImages(map, opts.palette);
  }

  map.addSource(SPOTS_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterRadius: 50,
    clusterMaxZoom: 15,
    promoteId: 'id',
  });

  map.addLayer({
    id: CLUSTERS_LAYER_ID,
    type: 'circle',
    source: SPOTS_SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': opts.clusterColor,
      'circle-opacity': 0.85,
      'circle-radius': ['step', ['get', 'point_count'], 16, 100, 20, 750, 25],
      'circle-stroke-width': 2,
      'circle-stroke-color': 'rgba(255,255,255,0.7)',
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: SPOTS_SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': opts.textFont,
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  });

  if (opts.marker === 'pin') {
    map.addLayer({
      id: POINTS_LAYER_ID,
      type: 'symbol',
      source: SPOTS_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['concat', 'pin-', ['get', 'type']],
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });
  } else {
    map.addLayer({
      id: POINTS_LAYER_ID,
      type: 'circle',
      source: SPOTS_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': typeColorExpression(opts.palette),
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.65)',
      },
    });
  }
}

export function updateSpots(map: maplibregl.Map, spots: readonly SpotPoint[]): void {
  const source = map.getSource(SPOTS_SOURCE_ID) as GeoJSONSource | undefined;
  source?.setData(spotsToFeatureCollection(spots));
}

/* ---------- Interactions ---------- */

export function wireSpotInteractions(
  map: maplibregl.Map,
  onSelect: (spotId: string) => void,
): () => void {
  const onPointClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    const id = feature?.properties?.id;
    if (id != null) onSelect(String(id));
  };

  const onClusterClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    const clusterId = feature?.properties?.cluster_id as number | undefined;
    if (clusterId == null || feature?.geometry?.type !== 'Point') return;
    const source = map.getSource(SPOTS_SOURCE_ID) as GeoJSONSource;
    void source.getClusterExpansionZoom(clusterId).then((zoom) => {
      map.easeTo({
        center: (feature.geometry as Point).coordinates as [number, number],
        zoom: zoom + 0.5,
      });
    });
  };

  const setPointer = () => { map.getCanvas().style.cursor = 'pointer'; };
  const clearPointer = () => { map.getCanvas().style.cursor = ''; };

  map.on('click', POINTS_LAYER_ID, onPointClick);
  map.on('click', CLUSTERS_LAYER_ID, onClusterClick);
  map.on('mouseenter', POINTS_LAYER_ID, setPointer);
  map.on('mouseleave', POINTS_LAYER_ID, clearPointer);
  map.on('mouseenter', CLUSTERS_LAYER_ID, setPointer);
  map.on('mouseleave', CLUSTERS_LAYER_ID, clearPointer);

  return () => {
    map.off('click', POINTS_LAYER_ID, onPointClick);
    map.off('click', CLUSTERS_LAYER_ID, onClusterClick);
    map.off('mouseenter', POINTS_LAYER_ID, setPointer);
    map.off('mouseleave', POINTS_LAYER_ID, clearPointer);
    map.off('mouseenter', CLUSTERS_LAYER_ID, setPointer);
    map.off('mouseleave', CLUSTERS_LAYER_ID, clearPointer);
  };
}

/* ---------- Marqueur de position utilisateur (équivalent Circle + CircleMarker) ---------- */

export function setUserLocation(
  map: maplibregl.Map,
  pos: { lat: number; lng: number } | null,
): void {
  const data: FeatureCollection = {
    type: 'FeatureCollection',
    features: pos
      ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] }, properties: {} }]
      : [],
  };

  const source = map.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }

  map.addSource(USER_SOURCE_ID, { type: 'geojson', data });
  map.addLayer({
    id: USER_HALO_LAYER_ID,
    type: 'circle',
    source: USER_SOURCE_ID,
    paint: {
      'circle-color': '#4A90D9',
      'circle-opacity': 0.12,
      'circle-radius': 24,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#4A90D9',
      'circle-stroke-opacity': 0.4,
    },
  });
  map.addLayer({
    id: USER_DOT_LAYER_ID,
    type: 'circle',
    source: USER_SOURCE_ID,
    paint: {
      'circle-color': '#4A90D9',
      'circle-radius': 7,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
}
