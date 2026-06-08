import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { normalizeSpotType } from '../lib/spotType';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { Tag, type TagVariant } from '../components/primitives';
import { SearchResultRow } from '../components/SearchResultRow';
import { SearchIcon } from '../lib/icons';

/**
 * SWAP — Recherche (design Liquid Glass) câblé aux vraies données.
 * Route additive `/redesign/search`. Charge `/api/spots` (public), filtre par type + nom côté client,
 * et chaque résultat renvoie vers le pilote `/redesign/spot/:id` → parcours liste → détail.
 *
 * Différé : recherche serveur/géoloc (« Près de moi »), pagination. i18n en dur (FR).
 * Honnête : pas de « distance » inventée ; rendu plafonné à 60 lignes (glass = coûteux).
 */

type SpotType = 'crag' | 'boulder' | 'indoor' | 'shop';
interface ListSpot { id: string; name: string; type: SpotType; min: string | null; max: string | null; }

const TYPE_LABEL: Record<SpotType, string> = { crag: 'Falaise', boulder: 'Bloc', indoor: 'Salle', shop: 'Magasin' };
const TYPE_TAG: Record<SpotType, TagVariant> = { crag: 'a', boulder: 'g', indoor: 'b', shop: 'a' };
const TYPE_THUMB: Record<SpotType, string> = {
  crag: 'background:linear-gradient(145deg,rgba(40,70,30,.8),rgba(20,45,15,.9));border:1px solid rgba(212,160,48,.15)',
  boulder: 'background:linear-gradient(145deg,rgba(30,55,20,.8),rgba(15,35,10,.9));border:1px solid rgba(80,160,80,.15)',
  indoor: 'background:linear-gradient(145deg,rgba(40,55,70,.8),rgba(20,35,50,.9));border:1px solid rgba(80,120,200,.15)',
  shop: 'background:linear-gradient(145deg,rgba(50,40,70,.8),rgba(30,25,50,.9));border:1px solid rgba(130,100,200,.15)',
};

const FILTERS: { label: string; type: SpotType | null }[] = [
  { label: 'Tous', type: null },
  { label: 'Falaise', type: 'crag' },
  { label: 'Bloc', type: 'boulder' },
  { label: 'Indoor', type: 'indoor' },
];
const FILTER_ON = 'padding:7px 14px;border-radius:9999px;font-size:12px;font-weight:600;white-space:nowrap;background:rgba(212,160,48,.80);border:1px solid rgba(255,255,255,.25);color:#1a0f05;flex-shrink:0;cursor:pointer';
const FILTER_OFF = 'padding:7px 14px;border-radius:9999px;font-size:12px;font-weight:600;white-space:nowrap;background:rgba(12,8,4,.60);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.60);flex-shrink:0;cursor:pointer';
const CAP = 60;

export function SearchPage() {
  const navigate = useNavigate();
  const [all, setAll] = useState<ListSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<SpotType | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    apiFetch<{ features?: { properties: Record<string, unknown> }[] }>('/api/spots')
      .then((d) => {
        if (!alive) return;
        const list = (d?.features ?? []).map((f) => {
          const p = f.properties;
          return {
            id: String(p.id ?? p._id),
            name: ((p.name as string) || 'Sans nom'),
            type: normalizeSpotType(p.type as string),
            min: (p.niveau_min ?? null) as string | null,
            max: (p.niveau_max ?? null) as string | null,
          };
        });
        setAll(list);
      })
      .catch(() => setAll([]))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => (type ? s.type === type : true) && (q ? s.name.toLowerCase().includes(q) : true));
  }, [all, type, query]);

  const gradeMeta = (s: ListSpot) => (s.min || s.max ? `${s.min || '?'} → ${s.max || '?'}` : '—');

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>Retour
          </div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Recherche</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {/* Search input */}
        <div className="g" style={css('border-radius:9999px;padding:14px 18px;display:flex;align-items:center;gap:10px;margin-bottom:16px;position:relative;overflow:hidden')}>
          <div style={css('color:rgba(212,160,48,.7);position:relative;z-index:2')}>
            <SearchIcon width={18} height={18} />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Spot, lieu, cotation..."
            style={css('font-size:16px;color:#f0ece6;flex:1;position:relative;z-index:2;background:transparent;border:none;outline:none;font-family:inherit;min-width:0')}
          />
          {query && <div onClick={() => setQuery('')} style={css('font-size:14px;color:#D4A030;font-weight:500;position:relative;z-index:2;cursor:pointer')}>Annuler</div>}
        </div>

        {/* Filters par type */}
        <div style={css('display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:20px;padding-bottom:4px')}>
          {FILTERS.map((f) => (
            <div key={f.label} onClick={() => setType(f.type)} style={css(type === f.type ? FILTER_ON : FILTER_OFF)}>{f.label}</div>
          ))}
        </div>

        {/* Results */}
        <div style={css('font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.35);margin-bottom:12px')}>
          {loading ? 'Chargement…' : `${filtered.length} spot${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`}
        </div>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          {!loading && filtered.length === 0 && (
            <div className="g" style={css('border-radius:18px;padding:16px;font-size:13px;color:rgba(240,236,230,.45);text-align:center')}>Aucun spot ne correspond.</div>
          )}
          {filtered.slice(0, CAP).map((s) => (
            <SearchResultRow
              key={s.id}
              onClick={() => navigate(`/redesign/spot/${s.id}`)}
              thumbStyle={TYPE_THUMB[s.type]}
              name={s.name}
              meta={gradeMeta(s)}
              tag={<Tag variant={TYPE_TAG[s.type]} style={css('font-size:10px;padding:3px 8px')}>{TYPE_LABEL[s.type]}</Tag>}
            />
          ))}
          {!loading && filtered.length > CAP && (
            <div style={css('text-align:center;font-size:12px;color:rgba(240,236,230,.35);padding:6px 0')}>+{filtered.length - CAP} autres — affine ta recherche</div>
          )}
        </div>
      </div>
    </PageFrame>
  );
}
