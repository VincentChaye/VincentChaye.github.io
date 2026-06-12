import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { parseGradeToNumber } from '@/lib/utils';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { ProfileMenuRow } from '../components/ProfileMenuRow';
import { BookOpenIcon, DownloadIcon } from '../lib/icons';
import { isOfflineEnabled } from '@/offline/env';
import { HighlightsRow } from '../components/HighlightsRow';

/**
 * SWAP — Profil (« mon profil », design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/profile`. Identité depuis `useAuthStore`, stats depuis
 * `/api/logbook/stats` (auth) + `/api/users/:id/public`. Non connecté → invite à se connecter.
 *
 * LECTURE + déconnexion réelle. Différés (la maquette n'a pas d'écran dédié) : édition avatar/bannière,
 * bio. i18n en dur (FR). Liens menu → routes redesign quand elles existent, sinon pages live.
 */

const GEAR = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
const ROPE = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" /><path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" /></svg>;
const LOGOUT = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;

const STAT = 'border-radius:16px;padding:14px 4px;text-align:center';
const STAT_VALUE = 'font-size:20px;font-weight:800;letter-spacing:-.5px;color:#f0ece6;margin-bottom:3px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.6);text-transform:uppercase;letter-spacing:.5px';

const LEVEL_FR: Record<string, string> = {
  debutant: 'débutant', intermediaire: 'intermédiaire', confirme: 'confirmé', expert: 'expert', pro: 'pro',
};

interface PubStats { friendsCount: number; spotsContributed: number; }

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [ascents, setAscents] = useState<number | null>(null);
  const [spotsClimbed, setSpotsClimbed] = useState<number | null>(null);
  const [maxGrade, setMaxGrade] = useState('—');
  const [pub, setPub] = useState<PubStats>({ friendsCount: 0, spotsContributed: 0 });

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    let alive = true;
    apiFetch<{ total: number; uniqueSpots: number; gradePyramid: { grade: string; count: number }[] }>('/api/logbook/stats', { auth: true })
      .then((s) => {
        if (!alive) return;
        setAscents(s?.total ?? 0);
        setSpotsClimbed(s?.uniqueSpots ?? 0);
        const gp = s?.gradePyramid ?? [];
        if (gp.length) setMaxGrade([...gp].sort((a, b) => parseGradeToNumber(a.grade) - parseGradeToNumber(b.grade)).at(-1)?.grade ?? '—');
      })
      .catch(() => { if (alive) { setAscents(0); setSpotsClimbed(0); } });
    apiFetch<{ stats?: PubStats }>(`/api/users/${user._id}/public`)
      .then((d) => { if (alive && d?.stats) setPub({ friendsCount: d.stats.friendsCount ?? 0, spotsContributed: d.stats.spotsContributed ?? 0 }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isAuthenticated, user?._id]);

  if (!isAuthenticated || !user) {
    return (
      <PageFrame tab="profil">
        <NavBar><div className="nbi"><div className="back-btn" onClick={() => navigate(-1)}>‹ Retour</div><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Profil</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir ton profil.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/profile')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  const initial = (user.displayName || user.username || '?')[0].toUpperCase();
  const levelLabel = user.profile?.level ? (LEVEL_FR[user.profile.level] ?? user.profile.level) : null;

  const handleLogout = () => { logout(); navigate('/redesign/login'); };

  return (
    <PageFrame tab="profil">
      <NavBar>
        <div className="nbi">
          <div style={css('flex:1')} />
          <div className="na">
            <IconButton aria-label="Paramètres" style={css('cursor:pointer')} onClick={() => navigate('/redesign/settings')}>{GEAR}</IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('text-align:center;padding:20px 20px 0')}>
        <div role="button" aria-label="Voir mon profil public" onClick={() => navigate(`/redesign/profile/${user._id}`)} style={css('width:88px;height:88px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(145deg,rgba(212,160,48,.25),rgba(184,134,30,.35));border:2.5px solid rgba(212,160,48,.35);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;color:#f0ece6;box-shadow:0 0 30px rgba(212,160,48,.18),0 4px 20px rgba(0,0,0,.4);position:relative;overflow:hidden;cursor:pointer')}>
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : initial}
          <div style={css('position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(212,160,48,.2)')} />
        </div>
        <div style={css('font-size:22px;font-weight:800;letter-spacing:-.6px;color:#f0ece6;margin-bottom:4px')}>{user.displayName || user.username}</div>
        <div style={css('font-size:14px;color:rgba(240,236,230,.6);margin-bottom:16px')}>{user.username ? `@${user.username}` : user.email}</div>
        {(levelLabel || maxGrade !== '—') && (
          <div style={css('display:flex;flex-direction:column;gap:2px;margin-bottom:24px')}>
            {levelLabel && <span style={css('font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:rgba(212,160,48,.65);font-weight:600')}>Grimpeur {levelLabel}</span>}
            {maxGrade !== '—' && <span style={css('font-size:15px;font-weight:700;color:rgba(240,236,230,.80);letter-spacing:-.3px')}>Max {maxGrade}</span>}
          </div>
        )}
        <HighlightsRow
          uid={user._id}
          isSelf
          userInfo={{ username: user.username ?? null, displayName: user.displayName ?? null, avatarUrl: user.avatarUrl ?? null }}
        />
        <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:280px;margin:0 auto 24px')}>
          <div role="button" onClick={() => navigate('/redesign/logbook')} style={css(STAT + ';cursor:pointer')}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{ascents ?? '—'}</div><div style={css(STAT_LABEL)}>Ascensions</div></div></div>
          <div role="button" onClick={() => navigate('/redesign/my-spots')} style={css(STAT + ';cursor:pointer')}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{spotsClimbed ?? '—'}</div><div style={css(STAT_LABEL)}>Spots</div></div></div>
          <div role="button" onClick={() => navigate('/redesign/friends')} style={css(STAT + ';cursor:pointer')}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{pub.friendsCount}</div><div style={css(STAT_LABEL)}>Amis</div></div></div>
          <div role="button" onClick={() => navigate('/redesign/my-spots?tab=contrib')} style={css(STAT + ';cursor:pointer')}><div style={css('position:relative;z-index:2')}><div style={css(STAT_VALUE)}>{pub.spotsContributed}</div><div style={css(STAT_LABEL)}>Contribs</div></div></div>
        </div>
      </div>

      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:8px')}>
        <ProfileMenuRow onClick={() => navigate('/redesign/logbook')} iconBox="background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.20)" iconColor="#D4A030" label="Mon carnet de grimpe" icon={<BookOpenIcon width={16} height={16} />} />
        <ProfileMenuRow onClick={() => navigate('/redesign/gear')} iconBox="background:rgba(232,128,128,.12);border:1px solid rgba(232,128,128,.20)" iconColor="#E88080" label="Mon matériel" icon={ROPE} />
        {isOfflineEnabled() && (
          <ProfileMenuRow onClick={() => navigate('/redesign/offline')} iconBox="background:rgba(136,216,128,.12);border:1px solid rgba(136,216,128,.20)" iconColor="#88D880" label="Mode hors ligne" icon={<DownloadIcon width={16} height={16} />} />
        )}
        <ProfileMenuRow onClick={() => navigate('/redesign/settings')} iconBox="background:rgba(80,130,200,.12);border:1px solid rgba(80,130,200,.20)" iconColor="#88BBEE" label="Paramètres" icon={GEAR} />
        <ProfileMenuRow onClick={handleLogout} marginTop iconBox="background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.20)" iconColor="#E88080" labelColor="rgba(240,150,150,.85)" label="Se déconnecter" icon={LOGOUT} />
      </div>
      <div style={css('height:20px')} />
    </PageFrame>
  );
}
