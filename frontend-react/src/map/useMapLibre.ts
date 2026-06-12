/**
 * Hook propriétaire de l'instance maplibregl.Map.
 * Équivalent du couple <MapContainer> + useMap() de react-leaflet :
 * crée la carte au montage, expose des actions impératives, nettoie au démontage.
 *
 * ⚠️ MapLibre attend [lng, lat] partout (Leaflet utilisait [lat, lng]).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  buildBaseStyle,
  addRasterBaseLayers,
  applyBaseLayer,
  setTerrainEnabled as applyTerrain,
  type BaseLayerKey,
  type StyleVariant,
} from './style';
import { registerOfflineProtocol } from './offlineProtocol';

export interface UseMapLibreOptions {
  /** Centre initial [lng, lat] */
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  styleVariant: StyleVariant;
  initialLayer: BaseLayerKey;
  /** Active le relief 3D (DEM MapTiler) au chargement */
  terrain3D?: boolean;
  /** Route les tuiles satellite via le protocole zdg:// (cache IndexedDB) */
  offlineSatellite?: boolean;
}

export interface UseMapLibreApi {
  containerRef: React.RefObject<HTMLDivElement | null>;
  map: maplibregl.Map | null;
  /** true une fois le style chargé et les couches de base en place */
  ready: boolean;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  setBaseLayer: (key: BaseLayerKey) => void;
  setTerrainEnabled: (enabled: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/**
 * Préférence relief 3D — désactivé par défaut : le terrain DEM double le coût
 * de chaque frame (mesuré ~15 ms vs ~7 ms) et ajoute un pipeline de tuiles
 * complet, rédhibitoire sur les appareils modestes. Opt-in via le bouton 3D.
 */
const TERRAIN_PREF_KEY = 'zdg_map_3d';

export function getTerrain3DPref(): boolean {
  try {
    return localStorage.getItem(TERRAIN_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setTerrain3DPref(enabled: boolean): void {
  try {
    localStorage.setItem(TERRAIN_PREF_KEY, enabled ? '1' : '0');
  } catch {
    // stockage indisponible (mode privé) — préférence non persistée
  }
}

export function useMapLibre(options: UseMapLibreOptions): UseMapLibreApi {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  // Instance exposée au render (les refs ne sont pas lisibles pendant le render)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  // Options figées à la création — la carte n'est jamais recréée
  const optsRef = useRef(options);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const opts = optsRef.current;

    // Le protocole doit exister avant que la source satellite zdg:// ne soit ajoutée
    if (opts.offlineSatellite) registerOfflineProtocol();

    const map = new maplibregl.Map({
      container,
      style: buildBaseStyle(opts.styleVariant),
      center: opts.center,
      zoom: opts.zoom,
      pitch: opts.pitch ?? 0,
      bearing: opts.bearing ?? 0,
      attributionControl: { compact: true },
      // Cross-fade raccourci (défaut 300 ms) : chaque tuile chargée pendant un pan
      // déclenche sinon 300 ms de repaints continus — sensible sur appareils modestes
      fadeDuration: 100,
    });
    mapRef.current = map;
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__zdgMap = map;
    }

    map.on('load', () => {
      addRasterBaseLayers(map, opts.offlineSatellite ?? false);
      applyBaseLayer(map, opts.initialLayer);
      if (opts.terrain3D) applyTerrain(map, true);
      setMapInstance(map);
      setReady(true);
    });

    return () => {
      mapRef.current = null;
      setMapInstance(null);
      setReady(false);
      map.remove();
    };
  }, []);

  const flyTo = useCallback((lng: number, lat: number, zoom?: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: zoom ?? 13, duration: 800 });
  }, []);

  const setBaseLayer = useCallback((key: BaseLayerKey) => {
    if (mapRef.current) applyBaseLayer(mapRef.current, key);
  }, []);

  const setTerrainEnabled = useCallback((enabled: boolean) => {
    if (mapRef.current) applyTerrain(mapRef.current, enabled);
  }, []);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  return {
    containerRef,
    map: mapInstance,
    ready,
    flyTo,
    setBaseLayer,
    setTerrainEnabled,
    zoomIn,
    zoomOut,
  };
}
