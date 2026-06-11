import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { BackChevronIcon, Share2Icon, ActivityIcon } from '../lib/icons';

/**
 * SWAP — Profil public (design Liquid Glass) câblé aux vraies données (PUBLIC).
 * Route additive `/redesign/profile/:id`. `/api/users/:id/public` + `/api/logbook/user/:id`
 * (respecte la visibilité du carnet → 403 toléré : « activité non publique »).
 *
 * Honnête : pas de « spots grimpés » exposé publiquement → 2e stat = « Abonnés » (réel). Pas de
 * « Max » fiable en public → masqué. « Ajouter ami » = vraie requête (`POST /api/friends/request/:id`) ;
 * « Message » différé → page live `/messages`. i18n en dur (FR).
 */

interface PubProfile {
  username?: string; displayName?: string; avatarUrl?: string; level?: string; roles?: string[];
  stats?: { spotsContributed?: number; followersCount?: number; friendsCount?: number };
}
interface LogItem { _id: string; spotName?: string; routeName?: string; grade?: string | null; style: string; date?: string; createdAt?: string; }

const STAT = 'border-radius:16px;padding:14px 10px;text-align:center';
const STAT_VALUE = 'font-size:20px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.6);text-transform:uppercase;letter-spacing:.5px';
const ACT_CARD = 'border-radius:16px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start';
const ACT_ICON = 'width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:2';

const LEVEL_FR: Record<string, string> = { debutant: 'débutant', intermediaire: 'intermédiaire', confirme: 'confirmé', expert: 'expert', pro: 'pro' };
const STYLE_VERB: Record<string, string> = { onsight: 'À vue de', flash: 'Flash de', redpoint: 'Enchaînement de', repeat: 'Répétition de' };

function relShort(iso?: string): string {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d}j`;
  if (d < 30) return `il y a ${Math.floor(d / 7)} sem.`;
  if (d < 365) return `il y a ${Math.floor(d / 30)} mois`;
  return `il y a ${Math.floor(d / 365)} an${d >= 730 ? 's' : ''}`;
}

function activityText(it: LogItem): ReactNode {
  const verb = STYLE_VERB[it.style] ?? 'Ascension de';
  if (it.routeName) return <>{verb} <span style={css('color:#D4A030')}>{it.routeName}{it.grade ? ` ${it.grade}` : ''}</span></>;
  return <>Ascension à <span style={css('color:#D4A030')}>{it.spotName || 'un spot'}</span></>;
}

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [prof, setProf] = useState<PubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ascents, setAscents] = useState<number | null>(null);
  const [activity, setActivity] = useState<LogItem[]>([]);
  const [friendState, setFriendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const isSelf = !!user && user._id === id;

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(false);
    apiFetch<PubProfile>(`/api/users/${id}/public`)
      .then((d) => { if (alive) { if (d) setProf(d); else setError(true); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    apiFetch<{ items: LogItem[]; total: number }>(`/api/logbook/user/${id}?limit=10`)
      .then((d) => { if (!alive) return; setAscents(d?.total ?? 0); setActivity(d?.items ?? []); })
      .catch(() => { if (alive) { setAscents(null); setActivity([]); } });
    return () => { alive = false; };
  }, [id]);

  async function addFriend() {
    if (!isAuthenticated) { navigate(`/redesign/login?next=/redesign/profile/${id}`); return; }
    if (friendState !== 'idle') return;
    setFriendState('sending');
    try {
      await apiFetch(`/api/friends/request/${id}`, { method: 'POST', auth: true });
      setFriendState('sent');
    } catch {
      setFriendState('sent'); // déjà amis / déjà demandé → on neutralise le bouton
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/ZoneDeGrimpe/profile?id=${id}`;
    try { if (navigator.share) await navigator.share({ url }); else await navigator.clipboard.writeText(url); } catch { /* annulé */ }
  }

  if (loading) return <PageFrame><div style={css('min-height:500px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div></PageFrame>;
  if (error || !prof) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div></div></NavBar>
        <div style={css('padding:60px 28px;text-align:center;color:rgba(240,236,230,.6);font-size:15px')}>Profil introuvable.</div>
      </PageFrame>
    );
  }

  const name = prof.displayName || prof.username || 'Grimpeur';
  const initial = name[0]?.toUpperCase() ?? '?';
  const levelLabel = prof.level ? (LEVEL_FR[prof.level] ?? prof.level) : null;
  const s = prof.stats ?? {};
  const friendLabel = friendState === 'sent' ? 'Demande envoyée' : friendState === 'sending' ? 'Envoi…' : 'Ajouter ami';

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton aria-label="Partager le profil" style={css('cursor:pointer')} onClick={handleShare}><Share2Icon width={16} height={16} /></IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('text-align:center;padding:20px 20px 0')}>
        <div style={css('width:88px;height:88px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(145deg,rgba(80,130,200,.25),rgba(50,90,160,.35));border:2.5px solid rgba(80,130,200,.35);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;color:#f0ece6;box-shadow:0 0 30px rgba(80,130,200,.18),0 4px 20px rgba(0,0,0,.4);position:relative;overflow:hidden')}>
          {prof.avatarUrl ? <img src={prof.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : initial}
          <div style={css('position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(80,130,200,.2)')} />
        </div>
        <div style={css('font-size:22px;font-weight:800;letter-spacing:-.6px;color:#f0ece6;margin-bottom:4px')}>{name}</div>
        <div style={css('font-size:14px;color:rgba(240,236,230,.6);margin-bottom:16px')}>{prof.username ? `@${prof.username}` : ''}</div>
        {levelLabel && (
          <div style={css('display:flex;flex-direction:column;gap:2px;margin-bottom:20px')}>
            <span style={css('font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:rgba(212,160,48,.65);font-weight:600')}>Grimpeur {levelLabel}</span>
          </div>
        )}

        {!isSelf && (
          <div style={css('display:flex;gap:10px;justify-content:center;margin-bottom:24px')}>
            <div onClick={addFriend} style={css(`flex:1;max-width:160px;padding:11px;border-radius:14px;font-size:14px;font-weight:700;text-align:center;cursor:pointer;background:linear-gradient(145deg,rgba(212,160,48,.9),rgba(232,184,75,.95));color:#1a0f05;box-shadow:0 3px 14px rgba(212,160,48,.3)${friendState !== 'idle' ? ';opacity:.65' : ''}`)}>{friendLabel}</div>
            <div className="g" onClick={() => navigate('/redesign/messages')} style={css('flex:1;max-width:160px;padding:11px;border-radius:14px;font-size:14px;font-weight:600;text-align:center;cursor:pointer;color:rgba(240,236,230,.7)')}>Message</div>
          </div>
        )}

        <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px')}>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{ascents ?? '—'}</div><div style={css(STAT_LABEL)}>Ascensions</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{s.followersCount ?? 0}</div><div style={css(STAT_LABEL)}>Abonnés</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{s.friendsCount ?? 0}</div><div style={css(STAT_LABEL)}>Amis</div></div></div>
          <div className="g" style={css(STAT)}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{s.spotsContributed ?? 0}</div><div style={css(STAT_LABEL)}>Contribs</div></div></div>
        </div>
      </div>

      <div style={css('padding:0 20px')}>
        <div style={css('font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.6);padding:0 4px 12px')}>Activité récente</div>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          {activity.length === 0 ? (
            <div className="g" style={css('border-radius:16px;padding:16px;font-size:13px;color:rgba(240,236,230,.6);text-align:center')}>{ascents === null ? 'Activité non publique.' : 'Aucune activité récente.'}</div>
          ) : (
            activity.map((it) => (
              <div key={it._id} className="g" style={css(ACT_CARD)}>
                <div style={css(`${ACT_ICON};background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2)`)}><ActivityIcon width={15} height={15} stroke="#D4A030" /></div>
                <div style={css('flex:1;position:relative;z-index:2')}>
                  <div style={css('font-size:14px;font-weight:600;color:#f0ece6;margin-bottom:3px')}>{activityText(it)}</div>
                  <div style={css('font-size:12px;color:rgba(240,236,230,.6)')}>{[it.spotName, relShort(it.date || it.createdAt)].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={css('height:20px')} />
      </div>
    </PageFrame>
  );
}
