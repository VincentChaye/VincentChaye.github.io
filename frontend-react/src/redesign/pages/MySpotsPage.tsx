import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { normalizeSpotType } from '../lib/spotType';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { FavSpotCard } from '../components/FavSpotCard';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Mes Spots (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/my-spots` (`?tab=contrib` ouvre l'onglet Contributions).
 * Favoris → `/api/bookmarks` ; Contributions → `/api/spots/my-submissions` (auth:true).
 * Non connecté → invite à se connecter. LECTURE seule (clic → `/redesign/spot/:id`). i18n en dur (FR).
 */

type SpotType = 'crag' | 'boulder' | 'indoor' | 'shop';
interface FavSpot { id: string; name: string; type: SpotType; lat: number; lng: number; min: string | null; max: string | null; rating: number | null; }
interface Contrib { id: string; name: string; status: string; createdAt: string; updatedAt?: string; }

const TAB_ON = 'padding:10px;border-radius:14px;text-align:center;font-size:14px;font-weight:700;cursor:pointer;background:linear-gradient(145deg,rgba(212,160,48,.85),rgba(232,184,75,.9));color:#1a0f05;box-shadow:0 2px 10px rgba(212,160,48,.3)';
const TAB_OFF = 'padding:10px;border-radius:14px;text-align:center;font-size:14px;font-weight:600;cursor:pointer;color:rgba(240,236,230,.55)';
const CONTRIB_ROW = 'border-radius:18px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer';
const EMPTY = 'border-radius:18px;padding:18px;font-size:13px;color:rgba(240,236,230,.45);text-align:center';
const PIN = (color: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);

const FAV_TYPE: Record<SpotType, { tagText: string; headerBg: string; tagStyle: string }> = {
  crag: { tagText: 'Falaise', headerBg: 'background:linear-gradient(135deg,rgba(80,100,60,.6),rgba(40,60,30,.8))', tagStyle: 'background:rgba(212,160,48,.25);border:1px solid rgba(212,160,48,.35);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#D4A030' },
  boulder: { tagText: 'Bloc', headerBg: 'background:linear-gradient(135deg,rgba(60,80,120,.6),rgba(30,50,90,.8))', tagStyle: 'background:rgba(80,130,200,.25);border:1px solid rgba(80,130,200,.35);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#88BBEE' },
  indoor: { tagText: 'Indoor', headerBg: 'background:linear-gradient(135deg,rgba(120,80,60,.6),rgba(90,50,30,.8))', tagStyle: 'background:rgba(80,160,100,.25);border:1px solid rgba(80,160,100,.35);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#80D880' },
  shop: { tagText: 'Magasin', headerBg: 'background:linear-gradient(135deg,rgba(90,70,120,.6),rgba(50,35,80,.8))', tagStyle: 'background:rgba(150,120,200,.25);border:1px solid rgba(150,120,200,.35);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#B8A0E8' },
};

const STATUS_FR: Record<string, { label: string; pin: string; badge: string }> = {
  approved: { label: 'Approuvé', pin: '#80D880', badge: 'background:rgba(80,160,80,.2);border:1px solid rgba(80,160,80,.3);color:#80D880' },
  pending: { label: 'En attente', pin: '#D4A030', badge: 'background:rgba(212,160,48,.18);border:1px solid rgba(212,160,48,.28);color:#D4A030' },
  rejected: { label: 'Refusé', pin: '#E88080', badge: 'background:rgba(200,80,80,.18);border:1px solid rgba(200,80,80,.28);color:#E88080' },
};

function relAge(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} jours`;
  if (d < 30) return `il y a ${Math.floor(d / 7)} sem.`;
  if (d < 365) return `il y a ${Math.floor(d / 30)} mois`;
  return `il y a ${Math.floor(d / 365)} an${d >= 730 ? 's' : ''}`;
}

export function MySpotsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<'fav' | 'contrib'>(params.get('tab') === 'contrib' ? 'contrib' : 'fav');
  const [favs, setFavs] = useState<FavSpot[] | null>(null);
  const [contribs, setContribs] = useState<Contrib[] | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    apiFetch<Record<string, unknown>[]>('/api/bookmarks', { auth: true })
      .then((arr) => {
        if (!alive) return;
        setFavs((Array.isArray(arr) ? arr : []).map((s) => {
          const loc = s.location as { coordinates?: number[] } | undefined;
          return {
            id: String(s._id ?? s.id),
            name: (s.name as string) || 'Sans nom',
            type: normalizeSpotType(s.type as string),
            lat: (loc?.coordinates?.[1] ?? s.lat) as number,
            lng: (loc?.coordinates?.[0] ?? s.lng) as number,
            min: (s.niveau_min ?? null) as string | null,
            max: (s.niveau_max ?? null) as string | null,
            rating: (s.avgRating ?? null) as number | null,
          };
        }));
      })
      .catch(() => { if (alive) setFavs([]); });
    apiFetch<Record<string, unknown>[]>('/api/spots/my-submissions', { auth: true })
      .then((arr) => {
        if (!alive) return;
        setContribs((Array.isArray(arr) ? arr : []).map((s) => ({
          id: String(s._id ?? s.id),
          name: (s.name as string) || 'Sans nom',
          status: (s.status as string) || 'pending',
          createdAt: s.createdAt as string,
          updatedAt: s.updatedAt as string | undefined,
        })));
      })
      .catch(() => { if (alive) setContribs([]); });
    return () => { alive = false; };
  }, [isAuthenticated]);

  const favLoading = favs === null;
  const contribLoading = contribs === null;
  const gradeText = useMemo(() => (s: FavSpot) => (s.min || s.max ? `${s.min || '?'} → ${s.max || '?'}` : '—'), []);

  if (!isAuthenticated) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Mes spots</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir tes spots.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/my-spots')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Mes spots</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px 0 18px')}>
          <div onClick={() => setTab('fav')} style={css(tab === 'fav' ? TAB_ON : TAB_OFF)}>Favoris</div>
          <div onClick={() => setTab('contrib')} style={css(tab === 'contrib' ? TAB_ON : TAB_OFF)}>Contributions</div>
        </div>

        {tab === 'fav' && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            {favLoading ? (
              <div className="g" style={css(EMPTY)}>Chargement…</div>
            ) : favs!.length === 0 ? (
              <div className="g" style={css(EMPTY)}>Aucun spot favori. Ajoute-en depuis la fiche d'un spot.</div>
            ) : (
              favs!.map((s) => {
                const ft = FAV_TYPE[s.type] ?? FAV_TYPE.crag;
                const loc = Number.isFinite(s.lat) && Number.isFinite(s.lng) ? `${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}` : '—';
                return (
                  <FavSpotCard
                    key={s.id}
                    onClick={() => navigate(`/redesign/spot/${s.id}`)}
                    headerBg={ft.headerBg}
                    tagStyle={ft.tagStyle}
                    tagText={ft.tagText}
                    gradeText={gradeText(s)}
                    name={s.name}
                    location={loc}
                    rating={s.rating && s.rating > 0 ? s.rating.toFixed(1) : '—'}
                  />
                );
              })
            )}
          </div>
        )}

        {tab === 'contrib' && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            {contribLoading ? (
              <div className="g" style={css(EMPTY)}>Chargement…</div>
            ) : contribs!.length === 0 ? (
              <div className="g" style={css(EMPTY)}>Tu n'as pas encore proposé de spot.</div>
            ) : (
              contribs!.map((c) => {
                const st = STATUS_FR[c.status] ?? STATUS_FR.pending;
                // « Modifié » seulement si updatedAt est nettement après createdAt (tolérance 1 min,
                // car un spot fraîchement créé peut avoir updatedAt ≈ createdAt).
                const edited = !!c.updatedAt && c.createdAt
                  && new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 60000;
                return (
                  <div key={c.id} className="g" style={css(CONTRIB_ROW)} onClick={() => navigate(`/redesign/spot/${c.id}`)}>
                    <div style={css(`width:44px;height:44px;border-radius:12px;background:rgba(${st.pin === '#80D880' ? '80,160,80' : st.pin === '#D4A030' ? '212,160,48' : '200,80,80'},.12);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:2`)}>{PIN(st.pin)}</div>
                    <div style={css('flex:1;position:relative;z-index:2')}>
                      <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>{c.name}</div>
                      <div style={css('font-size:12px;color:rgba(240,236,230,.45)')}>{edited ? 'Modifié' : 'Ajouté'} · {relAge(c.updatedAt || c.createdAt)}</div>
                    </div>
                    <span style={css(`${st.badge};border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;position:relative;z-index:2`)}>{st.label}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
        <div style={css('height:20px')} />
      </div>
    </PageFrame>
  );
}
