import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker } from 'react-leaflet';
import { OfflineTileLayer } from '@/offline/OfflineTileLayer';
import { useOfflineStore } from '@/offline/offline.store';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { apiFetch } from '@/lib/api';
import { normalizeSpotType } from '../lib/spotType';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { FilterPill } from '../components/FilterPill';
import { Pressable } from '../components/primitives';
import { SearchIcon, FilterLinesIcon, BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Carte (design Liquid Glass) câblé aux vraies données (PUBLIC), vrai Leaflet.
 * Route additive `/redesign/map`. Tuiles sombres CARTO, marqueurs réels `/api/spots` (clusterisés),
 * filtres par type, recherche → `/redesign/search`, marqueur → `/redesign/spot/:id`, FAB → propose.
 * Overlays glass de la maquette conservés (le blur se calcule contre les tuiles). i18n FR.
 */

type SpotType = 'crag' | 'boulder' | 'indoor' | 'shop';
interface MapSpot {
  id: string;
  lat: number;
  lng: number;
  type: SpotType;
  name: string;
  orientation: string | null;
  niveau_min: string | null;
  niveau_max: string | null;
}

const TYPE_COLOR: Record<SpotType, string> = { crag: '#D4A030', boulder: '#88D880', indoor: '#88BBEE', shop: '#B8A0E8' };
const dotIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.65);box-shadow:0 0 8px ${color}99"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});
const ICONS: Record<SpotType, L.DivIcon> = { crag: dotIcon(TYPE_COLOR.crag), boulder: dotIcon(TYPE_COLOR.boulder), indoor: dotIcon(TYPE_COLOR.indoor), shop: dotIcon(TYPE_COLOR.shop) };

/* ---------- Tile layers ---------- */
type MapLayerKey = 'dark' | 'satellite' | 'topo';
const TILE_LAYERS: Record<MapLayerKey, { url: string; attribution: string; maxZoom: number; subdomains?: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 18,
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
};
const MAP_LAYER_LABELS: Record<MapLayerKey, string> = { dark: '🌑 Standard', satellite: '🛰️ Satellite', topo: '🗻 Relief' };
const MAP_LAYER_ORDER: MapLayerKey[] = ['satellite', 'dark', 'topo'];

/* ---------- Grade scale ---------- */
const GRADES = ['3','4','5','5+','6a','6a+','6b','6b+','6c','6c+','7a','7a+','7b','7b+','7c','7c+','8a','8a+','8b','8b+','8c','8c+','9a'];
function gradeIndex(g: string | null): number { return g ? GRADES.indexOf(g) : -1; }

/* ---------- Haversine distance (km) ---------- */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const [spots, setSpots] = useState<MapSpot[]>([]);

  /* Layer selector */
  const [mapLayer, setMapLayer] = useState<MapLayerKey>('satellite');

  /* Bascule automatique vers la couche 'dark' en mode hors ligne (I7).
     Mémorise la couche précédente pour la restaurer au retour en ligne. */
  const offlineMode = useOfflineStore((s) => s.mode);
  const prevLayerRef = useRef<MapLayerKey | null>(null);
  useEffect(() => {
    if (offlineMode === 'offline') {
      if (mapLayer !== 'dark') {
        prevLayerRef.current = mapLayer;
        setMapLayer('dark');
      }
    } else {
      if (prevLayerRef.current) {
        setMapLayer(prevLayerRef.current);
        prevLayerRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineMode]);

  /* Filter sheet */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterType, setFilterType] = useState<SpotType | null>(null);
  const [filterGradeMin, setFilterGradeMin] = useState<string>('');
  const [filterGradeMax, setFilterGradeMax] = useState<string>('');
  const [filterOrientation, setFilterOrientation] = useState<string>('');
  const [filterDistance, setFilterDistance] = useState<number>(0);
  const [userPos, setUserPos] = useState<{lat:number;lng:number}|null>(null);

  /** Convertit un tableau de features GeoJSON brutes en MapSpot[] */
  function featuresToSpots(features: { geometry?: { coordinates?: number[] }; properties: Record<string, unknown> }[]): MapSpot[] {
    const list: MapSpot[] = [];
    for (const f of features) {
      const p = f.properties;
      const c = f.geometry?.coordinates;
      const lng = c?.[0] as number;
      const lat = c?.[1] as number;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      list.push({
        id: String(p.id ?? p._id),
        lat, lng,
        type: normalizeSpotType(p.type as string),
        name: (p.name as string) || 'Sans nom',
        orientation: (p.orientation as string) ?? null,
        niveau_min: (p.niveau_min as string) ?? null,
        niveau_max: (p.niveau_max as string) ?? null,
      });
    }
    return list;
  }

  useEffect(() => {
    let alive = true;
    apiFetch<{ features?: { geometry?: { coordinates?: number[] }; properties: Record<string, unknown> }[] }>('/api/spots?limit=20000&format=geojson', { timeoutMs: 30000 })
      .then((d) => {
        if (!alive) return;
        setSpots(featuresToSpots(d?.features ?? []));
        // Persistance hors ligne (fire-and-forget)
        import('@/offline/spots').then((m) => m.persistAllSpots(d?.features ?? [])).catch(() => {});
      })
      .catch(async () => {
        if (!alive) return;
        // Repli sur les données IndexedDB si disponibles
        try {
          const { getAllSpotsOffline } = await import('@/offline/spots');
          const cached = await getAllSpotsOffline();
          if (alive && cached.length > 0) {
            setSpots(featuresToSpots(cached as { geometry?: { coordinates?: number[] }; properties: Record<string, unknown> }[]));
          } else if (alive) {
            setSpots([]);
          }
        } catch {
          if (alive) setSpots([]);
        }
      });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = spots;
    if (filterType) list = list.filter(s => s.type === filterType);
    if (filterGradeMin) list = list.filter(s => s.niveau_max != null && gradeIndex(s.niveau_max) >= gradeIndex(filterGradeMin));
    if (filterGradeMax) list = list.filter(s => s.niveau_min != null && gradeIndex(s.niveau_min) <= gradeIndex(filterGradeMax));
    if (filterOrientation) list = list.filter(s => s.orientation === filterOrientation);
    if (filterDistance > 0 && userPos) list = list.filter(s => haversine(userPos.lat, userPos.lng, s.lat, s.lng) <= filterDistance);
    return list;
  }, [spots, filterType, filterGradeMin, filterGradeMax, filterOrientation, filterDistance, userPos]);

  const activeFiltersCount = [filterType, filterGradeMin, filterGradeMax, filterOrientation, filterDistance > 0].filter(Boolean).length;

  return (
    <PageFrame tab="carte">
      {/* Plein-cadre : `inset:0` remplit le `.sc` parent (390×844 sur le web, 100dvh en natif)
          au lieu d'un 844px figé qui cassait sur tout device ≠ iPhone 390×844. Absolu → le map
          déborde sous la tab bar flottante (full-bleed) et ignore le padding-bottom du scroll. */}
      <div style={css('position:absolute;inset:0;overflow:hidden')}>
        {/* Vrai Leaflet */}
        <MapContainer
          ref={mapRef}
          center={[46.6, 2.4]}
          zoom={5}
          zoomControl={false}
          style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', background: '#0d1a0a' }}
        >
          <OfflineTileLayer
            key={mapLayer}
            url={TILE_LAYERS[mapLayer].url}
            attribution={TILE_LAYERS[mapLayer].attribution}
            subdomains={TILE_LAYERS[mapLayer].subdomains ?? 'abc'}
            maxZoom={TILE_LAYERS[mapLayer].maxZoom}
            layerKey={mapLayer}
          />
          <MarkerClusterGroup chunkedLoading>
            {filtered.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={ICONS[s.type] ?? ICONS.crag} eventHandlers={{ click: () => navigate(`/redesign/spot/${s.id}`) }} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Back */}
        <Pressable aria-label="Retour" onClick={() => navigate(-1)} style={css('position:absolute;top:calc(80px + var(--safe-top));left:16px;z-index:20;width:40px;height:40px;border-radius:50%;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#f0ece6;cursor:pointer')}>
          <BackChevronIcon width={10} height={16} />
        </Pressable>

        {/* Search */}
        <div style={css('position:absolute;top:calc(80px + var(--safe-top));left:68px;right:16px;z-index:20')}>
          <div style={css('border-radius:9999px;padding:12px 16px;display:flex;align-items:center;gap:10px;background:rgba(12,8,4,.70);backdrop-filter:blur(28px) saturate(1.7);-webkit-backdrop-filter:blur(28px) saturate(1.7);border:1px solid rgba(212,160,48,.18);box-shadow:0 4px 20px rgba(0,0,0,.4);cursor:pointer;position:relative;overflow:hidden')}>
            <Pressable onClick={() => navigate('/redesign/search')} style={css('text-align:left;display:flex;align-items:center;gap:10px;flex:1')}>
              <div style={css('color:rgba(212,160,48,.7);position:relative;z-index:1')}><SearchIcon width={16} height={16} /></div>
              <div style={css('font-size:15px;color:rgba(240,236,230,.6);flex:1;position:relative;z-index:1')}>Rechercher un spot...</div>
            </Pressable>
            {/* Filtre — intercepte le clic, ouvre la feuille */}
            <Pressable aria-label="Filtres" onClick={(e) => { e.stopPropagation(); setFiltersOpen(true); }}
                 style={css('width:30px;height:30px;border-radius:50%;background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.25);display:flex;align-items:center;justify-content:center;color:#D4A030;position:relative;z-index:1;flex-shrink:0')}>
              <FilterLinesIcon width={13} height={13} />
              {activeFiltersCount > 0 && (
                <div style={css('position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:#D4A030;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#1a0f05')}>
                  {activeFiltersCount}
                </div>
              )}
            </Pressable>
          </div>
        </div>

        {/* Sélecteur de couche carte — masqué en mode hors ligne (I7) */}
        {offlineMode !== 'offline' && (
          <Pressable onClick={() => setMapLayer(l => MAP_LAYER_ORDER[(MAP_LAYER_ORDER.indexOf(l) + 1) % MAP_LAYER_ORDER.length])}
               style={css('position:absolute;right:16px;top:50%;transform:translateY(calc(-50% - 64px));z-index:20;width:38px;height:38px;border-radius:12px;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px')}
               aria-label={`Changer de fond de carte (actuel : ${MAP_LAYER_LABELS[mapLayer]})`}
               title={MAP_LAYER_LABELS[mapLayer]}>
            <span aria-hidden>{mapLayer === 'dark' ? '🌑' : mapLayer === 'satellite' ? '🛰️' : '🗻'}</span>
          </Pressable>
        )}

        {/* Zoom */}
        <div style={css('position:absolute;right:16px;top:50%;transform:translateY(-50%);z-index:20;display:flex;flex-direction:column;gap:2px')}>
          <Pressable hit={false} aria-label="Zoom avant" onClick={() => mapRef.current?.zoomIn()} style={css('width:38px;height:38px;border-radius:12px 12px 4px 4px;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.75);cursor:pointer;font-size:18px')}>+</Pressable>
          <Pressable hit={false} aria-label="Zoom arrière" onClick={() => mapRef.current?.zoomOut()} style={css('width:38px;height:38px;border-radius:4px 4px 12px 12px;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.75);cursor:pointer;font-size:18px')}>−</Pressable>
        </div>

        {/* Compteur */}
        <div style={css('position:absolute;bottom:100px;left:16px;z-index:20;border-radius:9999px;padding:8px 14px;background:rgba(12,8,4,.72);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);font-size:12px;font-weight:600;color:rgba(240,236,230,.7)')}>
          {filtered.length.toLocaleString('fr-FR')} spots
        </div>

        {/* FAB */}
        <Pressable aria-label="Proposer un spot" onClick={() => navigate('/redesign/propose')} style={css('position:absolute;right:16px;bottom:100px;z-index:20;width:46px;height:46px;border-radius:14px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.92));border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(212,160,48,.40);cursor:pointer;font-size:22px;color:#1a0f05')}>+</Pressable>

        {/* Overlay fond feuille de filtres */}
        {filtersOpen && <div onClick={() => setFiltersOpen(false)} style={css('position:absolute;inset:0;z-index:29;background:rgba(0,0,0,0.4)')} />}

        {/* Feuille de filtres */}
        <div style={css(`position:absolute;bottom:0;left:0;right:0;z-index:30;background:rgba(12,8,4,0.95);backdrop-filter:blur(24px);border-radius:20px 20px 0 0;padding:24px 20px;transition:transform .3s ease;transform:${filtersOpen ? 'translateY(0)' : 'translateY(100%)'};pointer-events:${filtersOpen ? 'auto' : 'none'};max-height:75%;overflow-y:auto`)}>
          {/* Drag handle */}
          <div style={css('width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.3);margin:0 auto 20px')} />

          <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:20px')}>
            <span style={css('font-size:17px;font-weight:700;color:#f0ece6')}>Filtres</span>
            <Pressable onClick={() => { setFilterType(null); setFilterGradeMin(''); setFilterGradeMax(''); setFilterOrientation(''); setFilterDistance(0); }}
                 style={css('font-size:13px;color:#D4A030;cursor:pointer')}>Réinitialiser</Pressable>
          </div>

          {/* Type */}
          <div style={css('margin-bottom:20px')}>
            <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px')}>Type</div>
            <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
              {([null, 'crag', 'boulder', 'indoor', 'shop'] as const).map(t => (
                <FilterPill key={t ?? 'tous'} active={filterType === t} onClick={() => setFilterType(t)}>
                  {t === null ? 'Tous' : t === 'crag' ? 'Falaise' : t === 'boulder' ? 'Bloc' : t === 'indoor' ? 'Indoor' : 'Magasin'}
                </FilterPill>
              ))}
            </div>
          </div>

          {/* Cotation */}
          <div style={css('margin-bottom:20px')}>
            <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px')}>Cotation</div>
            <div style={css('display:flex;gap:10px;align-items:center')}>
              <select aria-label="Cotation minimale" value={filterGradeMin} onChange={e => setFilterGradeMin(e.target.value)} style={css('flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;color:#f0ece6;font-size:14px')}>
                <option value="">Min</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <span style={css('color:rgba(240,236,230,.6)')}>—</span>
              <select aria-label="Cotation maximale" value={filterGradeMax} onChange={e => setFilterGradeMax(e.target.value)} style={css('flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;color:#f0ece6;font-size:14px')}>
                <option value="">Max</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Orientation */}
          <div style={css('margin-bottom:20px')}>
            <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px')}>Orientation</div>
            <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
              {['', 'N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'].map(o => (
                <FilterPill key={o || 'all'} active={filterOrientation === o} onClick={() => setFilterOrientation(o)}>
                  {o || 'Toutes'}
                </FilterPill>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div style={css('margin-bottom:24px')}>
            <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px')}>
              Distance max {filterDistance > 0 ? `— ${filterDistance} km` : '(désactivé)'}
            </div>
            <input type="range" aria-label="Distance maximale en kilomètres" min={0} max={200} step={10} value={filterDistance}
              onChange={e => {
                const v = Number(e.target.value);
                setFilterDistance(v);
                if (v > 0 && !userPos) navigator.geolocation.getCurrentPosition(
                  p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
                  () => setFilterDistance(0)
                );
              }}
              style={css('width:100%;accent-color:#D4A030')} />
            <div style={css('display:flex;justify-content:space-between;font-size:11px;color:rgba(240,236,230,.6);margin-top:4px')}><span>0</span><span>200 km</span></div>
          </div>

          <Pressable onClick={() => setFiltersOpen(false)} style={css('width:100%;padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:15px;text-align:center;cursor:pointer')}>
            Voir {filtered.length} spots
          </Pressable>
        </div>
      </div>
    </PageFrame>
  );
}
