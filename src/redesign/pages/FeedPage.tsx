import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { IconButton, Tag } from '../components/primitives';
import { UsersIcon } from '../lib/icons';
import { StoriesStrip } from '../components/StoriesStrip';

/**
 * SWAP — Social (design Liquid Glass) câblé aux vraies données (PUBLIC).
 * Route additive `/redesign/feed`. `/api/feed/global` (comme la page live, sans auth). Items =
 * `logbook` (ascension) ou `spot` (proposition). Clic carte spot → `/redesign/spot/:id`.
 *
 * Strip stories branché sur `/api/stories/feed`. i18n en dur (FR).
 */

interface FeedItem {
  id: string; type: 'logbook' | 'spot'; userId: string;
  username?: string; displayName?: string; avatarUrl?: string;
  createdAt: string; spot: { id: string; name: string; type?: string };
  route?: { id?: string; name?: string } | null; grade?: string; style?: string;
  caption?: string | null; media?: { url: string; type: 'image' | 'video' }[];
}


function gradeColors(grade?: string): { bg: string; border: string; color: string } {
  const g = (grade ?? '').toLowerCase().trim();
  if (/^[345]/.test(g)) return { bg: 'rgba(100,180,80,.15)', border: 'rgba(100,180,80,.25)', color: '#88D880' };
  if (g.startsWith('6')) return { bg: 'rgba(212,160,48,.12)', border: 'rgba(212,160,48,.22)', color: '#D4A030' };
  if (g.startsWith('7')) return { bg: 'rgba(200,120,60,.14)', border: 'rgba(200,120,60,.25)', color: '#E8924A' };
  if (/^[89]/.test(g)) return { bg: 'rgba(180,80,80,.14)', border: 'rgba(180,80,80,.25)', color: '#E88080' };
  return { bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.10)', color: 'rgba(240,236,230,.6)' };
}

function relDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const HEADER_AV = 'width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#f0ece6;flex-shrink:0;overflow:hidden';

export function FeedPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<{ items: FeedItem[]; nextCursor: string | null } | FeedItem[]>('/api/feed/global')
      .then((d) => { if (alive) setItems(Array.isArray(d) ? d : (d?.items ?? [])); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []);

  const nameOf = (it: FeedItem) => it.displayName || it.username || 'Grimpeur';

  return (
    <PageFrame tab="fil">
      <NavBar>
        <div className="nbi">
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Social</span>
          <div className="na">
            <IconButton aria-label="Amis" style={css('cursor:pointer')} onClick={() => navigate('/redesign/friends')}><UsersIcon width={16} height={16} /></IconButton>
          </div>
        </div>
      </NavBar>

      <StoriesStrip />

      <div style={css('padding:16px 20px;display:flex;flex-direction:column;gap:14px')}>
        {items === null ? (
          <div style={css('min-height:300px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div>
        ) : items.length === 0 ? (
          <div className="g" style={css('border-radius:18px;padding:18px;font-size:13px;color:rgba(240,236,230,.6);text-align:center')}>Aucune activité récente.</div>
        ) : (
          items.map((it) => {
            const c = gradeColors(it.grade);
            const initial = (nameOf(it)[0] || '?').toUpperCase();
            const headerAvBg = it.type === 'spot'
              ? 'background:rgba(80,160,80,.15);border:1.5px solid rgba(80,160,80,.25)'
              : 'background:rgba(212,160,48,.18);border:1.5px solid rgba(212,160,48,.3)';
            return (
              <div key={it.id} className="g" style={css('border-radius:22px;overflow:hidden')}>
                <div style={css('position:relative;z-index:2')}>
                  {/* Header */}
                  <div style={css('padding:16px 16px 12px;display:flex;align-items:center;gap:10px')}>
                    <div onClick={() => navigate(`/redesign/profile/${it.userId}`)} style={css(`${HEADER_AV};${headerAvBg};cursor:pointer`)}>
                      {it.avatarUrl ? <img src={it.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : initial}
                    </div>
                    <div style={css('flex:1;min-width:0')}>
                      <div style={css('font-size:14px;font-weight:700;color:#f0ece6')}>{nameOf(it)}</div>
                      <div style={css('font-size:11px;color:rgba(240,236,230,.6)')}>{relDate(it.createdAt)}{it.spot?.name ? ` · ${it.spot.name}` : ''}</div>
                    </div>
                  </div>

                  {/* Médias du post (ascension publiée avec photos/vidéos) */}
                  {it.type === 'logbook' && (it.media?.length ?? 0) > 0 && (
                    <div style={css(`display:grid;grid-template-columns:repeat(${Math.min(it.media!.length, 2)},1fr);gap:2px;margin-bottom:12px`)}>
                      {it.media!.slice(0, 4).map((m) => (
                        m.type === 'video' ? (
                          <video key={m.url} src={m.url} controls muted playsInline preload="metadata" style={css('width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#000')} />
                        ) : (
                          <img key={m.url} src={m.url} alt="" loading="lazy" style={css('width:100%;aspect-ratio:4/3;object-fit:cover;display:block')} />
                        )
                      ))}
                    </div>
                  )}

                  {/* Body */}
                  {it.type === 'logbook' ? (
                    <div style={css('padding:0 16px 16px')}>
                      {it.caption && (
                        <div style={css('font-size:14px;line-height:1.5;color:rgba(240,236,230,.85);margin-bottom:10px')}>{it.caption}</div>
                      )}
                      <div style={css('display:flex;align-items:center;gap:8px')}>
                        <div style={css(`width:38px;height:38px;border-radius:11px;background:${c.bg};border:1px solid ${c.border};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${c.color};flex-shrink:0`)}>{it.grade || '—'}</div>
                        <div style={css('min-width:0')}>
                          <div style={css('font-size:15px;font-weight:700;color:#f0ece6')}>{it.route?.name || it.spot?.name || 'Ascension'}</div>
                        </div>
                        {(it.style === 'flash' || it.style === 'onsight') && <div style={css('margin-left:auto')}><Tag variant="a" style={css('font-size:11px')}>Flash</Tag></div>}
                      </div>
                    </div>
                  ) : (
                    <div style={css('padding:0 16px 16px')}>
                      <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:8px')}><Tag variant="g">Nouveau spot</Tag></div>
                      <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:4px')}>{it.spot?.name || 'Spot'}</div>
                      <div onClick={() => navigate(`/redesign/spot/${it.spot.id}`)} style={css('margin-top:8px;padding:10px;border-radius:12px;font-size:13px;font-weight:600;text-align:center;background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.22);color:#88D088;cursor:pointer')}>Voir le spot →</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div style={css('height:20px')} />
    </PageFrame>
  );
}
