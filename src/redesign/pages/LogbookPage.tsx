import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { parseGradeToNumber } from '@/lib/utils';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { SectionHeader, Tag } from '../components/primitives';
import { PyramidBar } from '../components/PyramidBar';
import { AscentRow } from '../components/AscentRow';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Carnet de grimpe (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/logbook`. Charge `/api/logbook/stats` + `/api/logbook` (auth:true).
 * Nécessite une session : non connecté → invite à se connecter (`/redesign/login?next=…`).
 *
 * LECTURE seule (le proto a un « + » d'ajout, différé ici — l'ajout se fait depuis un spot).
 * Honnête : la plupart des entrées OSM n'ont ni voie nommée ni cotation → badge « — », pas de
 * localisation inventée ; états vides explicites. i18n en dur (FR), comme la maquette.
 */

interface LogbookEntry {
  _id: string;
  spotId: string;
  spotName?: string;
  routeName?: string;
  grade?: string | null;
  style: string;
  date?: string;
  notes?: string;
  createdAt: string;
}
interface LogbookStats {
  total: number;
  uniqueSpots: number;
  gradePyramid: { grade: string; count: number }[];
}

const STAT_CARD = 'border-radius:16px;padding:16px 12px;text-align:center';
const STAT_VALUE = 'font-size:24px;font-weight:800;letter-spacing:-.8px;color:#f0ece6;margin-bottom:3px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.6);text-transform:uppercase;letter-spacing:.6px';
const EMPTY = 'border-radius:16px;padding:16px;font-size:13px;color:rgba(240,236,230,.6);text-align:center';


/** Couleur du badge de cotation selon la bande (1er caractère). Aligné sur SpotDetailPage. */
function gradeColors(grade?: string | null): { box: string; color: string } {
  const g = (grade ?? '').toLowerCase().trim();
  if (/^[345]/.test(g)) return { box: 'background:rgba(100,180,80,.15);border:1px solid rgba(100,180,80,.25)', color: '#88D880' };
  if (g.startsWith('6')) return { box: 'background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.22)', color: '#D4A030' };
  if (g.startsWith('7')) return { box: 'background:rgba(200,120,60,.14);border:1px solid rgba(200,120,60,.25)', color: '#E8924A' };
  if (/^[89]/.test(g)) return { box: 'background:rgba(180,80,80,.14);border:1px solid rgba(180,80,80,.25)', color: '#E88080' };
  return { box: 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10)', color: 'rgba(240,236,230,.6)' };
}

/** Tag « Flash » si la voie a été flashée (onsight historique inclus), rien sinon. */
function styleTag(style: string): ReactNode {
  if (style === 'flash' || style === 'onsight') return <Tag variant="a" style={css('font-size:10px;padding:3px 8px')}>Flash</Tag>;
  return null;
}

/** Date relative courte : « Aujourd'hui » / « Hier » / « 3 mai ». */
function relDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const dayMs = 86400000;
  const diff = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / dayMs);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function LogbookPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<LogbookStats | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(false);
    Promise.all([
      apiFetch<LogbookStats>('/api/logbook/stats', { auth: true }),
      apiFetch<{ items: LogbookEntry[]; total: number }>('/api/logbook?limit=20', { auth: true }),
    ])
      .then(([s, e]) => {
        if (!alive) return;
        setStats(s);
        setEntries(Array.isArray(e) ? e : e?.items ?? []);
      })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isAuthenticated]);

  // Pyramide triée du plus dur (haut) au plus facile, pct relatif au max.
  const pyramid = useMemo(() => {
    const list = stats?.gradePyramid ?? [];
    if (list.length === 0) return [] as { grade: string; count: number; pct: number }[];
    const max = Math.max(...list.map((g) => g.count));
    return [...list]
      .sort((a, b) => parseGradeToNumber(b.grade) - parseGradeToNumber(a.grade))
      .map((g) => ({ grade: g.grade, count: g.count, pct: max > 0 ? Math.max(8, (g.count / max) * 100) : 0 }));
  }, [stats]);

  const maxGrade = useMemo(() => {
    const list = stats?.gradePyramid ?? [];
    if (list.length === 0) return '—';
    return [...list].sort((a, b) => parseGradeToNumber(a.grade) - parseGradeToNumber(b.grade)).at(-1)?.grade ?? '—';
  }, [stats]);

  if (!isAuthenticated) {
    return (
      <PageFrame>
        <NavBar>
          <div className="nbi">
            <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
            <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Carnet</span>
          </div>
        </NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir ton carnet de grimpe.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/logbook')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Carnet</span>
        </div>
      </NavBar>

      {loading ? (
        <div style={css('min-height:400px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div>
      ) : error ? (
        <div style={css('padding:60px 28px;text-align:center;color:rgba(240,236,230,.55);font-size:14px')}>Impossible de charger le carnet.</div>
      ) : (
        <>
          {/* Stats row */}
          <div style={css('padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:4px')}>
            <div className="g" style={css(STAT_CARD)}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css(STAT_VALUE)}>{stats?.total ?? 0}</div>
                <div style={css(STAT_LABEL)}>Ascensions</div>
              </div>
            </div>
            <div className="g" style={css(STAT_CARD)}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css(STAT_VALUE)}>{maxGrade}</div>
                <div style={css(STAT_LABEL)}>Max grade</div>
              </div>
            </div>
            <div className="g" style={css(STAT_CARD)}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css(STAT_VALUE)}>{stats?.uniqueSpots ?? 0}</div>
                <div style={css(STAT_LABEL)}>Spots</div>
              </div>
            </div>
          </div>

          {/* Pyramide */}
          {pyramid.length > 0 && (
            <div className="g" style={css('margin:16px 20px 0;border-radius:20px;padding:18px')}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css('font-size:14px;font-weight:600;color:rgba(240,236,230,.7);margin-bottom:14px')}>Pyramide de cotations</div>
                <div style={css('display:flex;flex-direction:column;gap:7px')}>
                  {pyramid.map((p, i) => (
                    <PyramidBar key={p.grade} grade={p.grade} pct={`${p.pct}%`} count={String(p.count)} glow={i === 0} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dernières ascensions */}
          <SectionHeader small>Dernières ascensions</SectionHeader>
          <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
            {entries.length === 0 ? (
              <div className="g" style={css(EMPTY)}>Aucune ascension enregistrée. Ajoute-en depuis la fiche d'un spot.</div>
            ) : (
              entries.map((e) => {
                const c = gradeColors(e.grade);
                const name = e.routeName || e.spotName || 'Spot inconnu';
                const location = e.routeName ? (e.spotName ?? '') : '';
                return (
                  <AscentRow
                    key={e._id}
                    grade={e.grade || '—'}
                    gradeBoxStyle={c.box}
                    gradeColor={c.color}
                    name={name}
                    location={location}
                    date={relDate(e.date || e.createdAt)}
                    tag={styleTag(e.style)}
                  />
                );
              })
            )}
          </div>
          <div style={css('height:20px')} />
        </>
      )}
    </PageFrame>
  );
}
