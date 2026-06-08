import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
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
import { SearchIcon, FilterLinesIcon, BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Carte (design Liquid Glass) câblé aux vraies données (PUBLIC), vrai Leaflet.
 * Route additive `/redesign/map`. Tuiles sombres CARTO, marqueurs réels `/api/spots` (clusterisés),
 * filtres par type, recherche → `/redesign/search`, marqueur → `/redesign/spot/:id`, FAB → propose.
 * Overlays glass de la maquette conservés (le blur se calcule contre les tuiles). i18n FR.
 */

type SpotType = 'crag' | 'boulder' | 'indoor' | 'shop';
interface MapSpot { id: string; lat: number; lng: number; type: SpotType; name: string; }

const TYPE_COLOR: Record<SpotType, string> = { crag: '#D4A030', boulder: '#88D880', indoor: '#88BBEE', shop: '#B8A0E8' };
const dotIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.65);box-shadow:0 0 8px ${color}99"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});
const ICONS: Record<SpotType, L.DivIcon> = { crag: dotIcon(TYPE_COLOR.crag), boulder: dotIcon(TYPE_COLOR.boulder), indoor: dotIcon(TYPE_COLOR.indoor), shop: dotIcon(TYPE_COLOR.shop) };

const FILTERS: { label: string; type: SpotType | null }[] = [
  { label: 'Tous', type: null }, { label: 'Falaise', type: 'crag' }, { label: 'Bloc', type: 'boulder' }, { label: 'Indoor', type: 'indoor' },
];

export function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [type, setType] = useState<SpotType | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<{ features?: { geometry?: { coordinates?: number[] }; properties: Record<string, unknown> }[] }>('/api/spots')
      .then((d) => {
        if (!alive) return;
        const list: MapSpot[] = [];
        for (const f of d?.features ?? []) {
          const p = f.properties;
          // GeoJSON : coordonnées dans geometry.coordinates = [lng, lat] (pas dans properties).
          const c = f.geometry?.coordinates;
          const lng = c?.[0] as number;
          const lat = c?.[1] as number;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          list.push({ id: String(p.id ?? p._id), lat, lng, type: normalizeSpotType(p.type as string), name: (p.name as string) || 'Sans nom' });
        }
        setSpots(list);
      })
      .catch(() => setSpots([]));
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => (type ? spots.filter((s) => s.type === type) : spots), [spots, type]);

  return (
    <PageFrame tab="carte">
      <div style={css('position:relative;height:844px;overflow:hidden')}>
        {/* Vrai Leaflet */}
        <MapContainer
          ref={mapRef}
          center={[46.6, 2.4]}
          zoom={5}
          zoomControl={false}
          style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', background: '#0d1a0a' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />
          <MarkerClusterGroup chunkedLoading>
            {filtered.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={ICONS[s.type] ?? ICONS.crag} eventHandlers={{ click: () => navigate(`/redesign/spot/${s.id}`) }} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Back */}
        <div onClick={() => navigate(-1)} style={css('position:absolute;top:80px;left:16px;z-index:20;width:40px;height:40px;border-radius:50%;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#f0ece6;cursor:pointer')}>
          <BackChevronIcon width={10} height={16} />
        </div>

        {/* Search */}
        <div style={css('position:absolute;top:80px;left:68px;right:16px;z-index:20')}>
          <div onClick={() => navigate('/redesign/search')} style={css('border-radius:9999px;padding:12px 16px;display:flex;align-items:center;gap:10px;background:rgba(12,8,4,.70);backdrop-filter:blur(28px) saturate(1.7);-webkit-backdrop-filter:blur(28px) saturate(1.7);border:1px solid rgba(212,160,48,.18);box-shadow:0 4px 20px rgba(0,0,0,.4);cursor:pointer;position:relative;overflow:hidden')}>
            <div style={css('color:rgba(212,160,48,.7);position:relative;z-index:1')}><SearchIcon width={16} height={16} /></div>
            <div style={css('font-size:15px;color:rgba(240,236,230,.45);flex:1;position:relative;z-index:1')}>Rechercher un spot...</div>
            <div style={css('width:30px;height:30px;border-radius:50%;background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.25);display:flex;align-items:center;justify-content:center;color:#D4A030;position:relative;z-index:1')}><FilterLinesIcon width={13} height={13} /></div>
          </div>
        </div>

        {/* Filtres */}
        <div style={css('position:absolute;top:140px;left:0;right:0;z-index:19;padding:0 16px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none')}>
          {FILTERS.map((f) => (
            <FilterPill key={f.label} active={type === f.type} shadow={type === f.type} onClick={() => setType(f.type)}>{f.label}</FilterPill>
          ))}
        </div>

        {/* Compteur */}
        <div style={css('position:absolute;bottom:100px;left:16px;z-index:20;border-radius:9999px;padding:8px 14px;background:rgba(12,8,4,.72);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);font-size:12px;font-weight:600;color:rgba(240,236,230,.7)')}>
          {filtered.length.toLocaleString('fr-FR')} spots
        </div>

        {/* Zoom */}
        <div style={css('position:absolute;right:16px;top:50%;transform:translateY(-50%);z-index:20;display:flex;flex-direction:column;gap:2px')}>
          <div onClick={() => mapRef.current?.zoomIn()} style={css('width:38px;height:38px;border-radius:12px 12px 4px 4px;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.75);cursor:pointer;font-size:18px')}>+</div>
          <div onClick={() => mapRef.current?.zoomOut()} style={css('width:38px;height:38px;border-radius:4px 4px 12px 12px;background:rgba(12,8,4,.70);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.75);cursor:pointer;font-size:18px')}>−</div>
        </div>

        {/* FAB */}
        <div onClick={() => navigate('/redesign/propose')} style={css('position:absolute;right:16px;bottom:100px;z-index:20;width:46px;height:46px;border-radius:14px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.92));border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(212,160,48,.40);cursor:pointer;font-size:22px;color:#1a0f05')}>+</div>
      </div>
    </PageFrame>
  );
}
