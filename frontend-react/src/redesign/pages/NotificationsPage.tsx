import { useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import type { Notification, NotificationType } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { IconButton } from '../components/primitives';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Notifications (design Liquid Glass) câblé aux vraies données PROTÉGÉES.
 * Route additive `/redesign/notifications`. Réutilise `useNotificationsStore`
 * (`/api/notifications`, déjà branché) → mêmes données que la page live.
 *
 * Périmètre : LECTURE + marquer lu (action « lecture » : clic = lu ; « Tout lire »). Différés :
 * navigation vers la cible (amis/profil/mes-spots), boutons Suivre/Profil de la maquette (pas
 * d'action sociale ici). Non connecté → invite à se connecter. i18n en dur (FR), comme la maquette.
 */

const GROUP_TITLE = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(240,236,230,.6);padding:16px 0 10px';
const ROW = 'border-radius:18px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;cursor:pointer';
const AVATAR = 'position:relative;z-index:2;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0';
const BODY = 'flex:1;position:relative;z-index:2';
const TEXT = 'font-size:14px;color:#f0ece6;line-height:1.4;margin-bottom:4px';
const TEXT_READ = 'font-size:14px;color:rgba(240,236,230,.75);line-height:1.4;margin-bottom:4px';
const TIME = 'font-size:12px;color:rgba(240,236,230,.6)';
const TIME_READ = 'font-size:12px;color:rgba(240,236,230,.6)';
const DOT = 'width:8px;height:8px;border-radius:50%;background:#D4A030;flex-shrink:0;margin-top:4px;box-shadow:0 0 8px rgba(212,160,48,.6)';
const B = css('font-weight:700');

/** Forme + teinte de l'avatar selon le type (cercle pour les gens, carré arrondi pour spots/système). */
function avatarSpec(type: NotificationType): { circle: boolean; rgb: string } {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted': return { circle: true, rgb: '212,160,48' };
    case 'new_follower': return { circle: true, rgb: '100,130,200' };
    case 'new_review': return { circle: true, rgb: '212,160,48' };
    case 'spot_approved':
    case 'photo_approved': return { circle: false, rgb: '80,160,80' };
    case 'spot_rejected':
    case 'photo_rejected': return { circle: false, rgb: '180,80,80' };
    default: return { circle: false, rgb: '212,160,48' };
  }
}
function avatarStyle(type: NotificationType, read: boolean): string {
  const { circle, rgb } = avatarSpec(type);
  const radius = circle ? 'border-radius:50%' : 'border-radius:13px';
  return read
    ? `${AVATAR};${radius};background:rgba(${rgb},.10)`
    : `${AVATAR};${radius};background:rgba(${rgb},.18);border:1.5px solid rgba(${rgb},.28)`;
}

/** Texte FR riche dérivé des champs réels. Précédence : `notif.message` (source backend) sinon template. */
function notifNode(n: Notification): ReactNode {
  if (n.message) return n.message;
  const user = n.fromUsername || 'Quelqu’un';
  const spot = n.data?.spotName || 'un spot';
  const amber = (s: string) => <span style={css('color:#D4A030')}>{s}</span>;
  const green = (s: string) => <span style={css('color:#88D088')}>{s}</span>;
  const red = (s: string) => <span style={css('color:#E88080')}>{s}</span>;
  switch (n.type) {
    case 'friend_request': return <><span style={B}>{user}</span> t’a envoyé une demande d’ami</>;
    case 'friend_accepted': return <><span style={B}>{user}</span> a accepté ta demande d’ami</>;
    case 'new_follower': return <><span style={B}>{user}</span> a commencé à te suivre</>;
    case 'new_review': return <><span style={B}>{user}</span> a laissé un avis sur {amber(spot)}</>;
    case 'spot_approved': return <>Ton spot {green(spot)} a été approuvé</>;
    case 'spot_rejected': return <>Ton spot {red(spot)} a été refusé</>;
    case 'photo_approved': return <>Ta photo sur {amber(spot)} a été approuvée</>;
    case 'photo_rejected': return <>Ta photo sur {amber(spot)} a été refusée</>;
    case 'photo_pending': return <>Nouvelle photo à modérer sur {amber(spot)}</>;
    case 'gear_epi_warning': return <>Un de tes EPI approche de sa limite d’usage</>;
    case 'gear_epi_retire': return <>Un de tes EPI doit être réformé</>;
    default: return 'Nouvelle notification';
  }
}

/** Date relative FR : « à l'instant », « il y a 15 min », « il y a 1h », « il y a 3 jours ». */
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} jours`;
  const w = Math.floor(d / 7);
  return `il y a ${w} sem.`;
}

type Bucket = 'today' | 'week' | 'earlier';
function bucketOf(iso: string): Bucket {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= start.getTime()) return 'today';
  if (t >= start.getTime() - 6 * 86400000) return 'week';
  return 'earlier';
}
const BUCKET_LABEL: Record<Bucket, string> = { today: "Aujourd'hui", week: 'Cette semaine', earlier: 'Plus tôt' };

export function NotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { notifications, loading, fetchNotifications, markRead, markAllRead } = useNotificationsStore();

  useEffect(() => { if (isAuthenticated) fetchNotifications(); }, [isAuthenticated, fetchNotifications]);

  const hasUnread = useMemo(() => notifications.some((n) => !n.read), [notifications]);
  const groups = useMemo(() => {
    const buckets: Record<Bucket, Notification[]> = { today: [], week: [], earlier: [] };
    for (const n of notifications) buckets[bucketOf(n.createdAt)].push(n);
    return (['today', 'week', 'earlier'] as Bucket[]).filter((b) => buckets[b].length > 0).map((b) => ({ b, items: buckets[b] }));
  }, [notifications]);

  if (!isAuthenticated) {
    return (
      <PageFrame>
        <NavBar>
          <div className="nbi">
            <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
            <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Notifications</span>
          </div>
        </NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour voir tes notifications.</div>
          <div onClick={() => navigate('/redesign/login?next=/redesign/notifications')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Notifications</span>
          {hasUnread && (
            <div className="na">
              <IconButton style={css('font-size:12px;font-weight:600;color:#D4A030;cursor:pointer')} onClick={() => markAllRead()}>Tout lire</IconButton>
            </div>
          )}
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>
        {loading ? (
          <div style={css('min-height:300px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div>
        ) : notifications.length === 0 ? (
          <div style={css('padding:60px 8px;text-align:center;color:rgba(240,236,230,.6);font-size:14px')}>Aucune notification pour le moment.</div>
        ) : (
          groups.map(({ b, items }) => (
            <div key={b}>
              <div style={css(GROUP_TITLE)}>{BUCKET_LABEL[b]}</div>
              {items.map((n) => (
                <div
                  key={n._id}
                  className={n.read ? 'gt' : 'g'}
                  style={css(ROW)}
                  onClick={() => { if (!n.read) markRead(n._id); }}
                >
                  <div style={css(avatarStyle(n.type, n.read))} />
                  <div style={css(BODY)}>
                    <div style={css(n.read ? TEXT_READ : TEXT)}>{notifNode(n)}</div>
                    <div style={css(n.read ? TIME_READ : TIME)}>{relTime(n.createdAt)}</div>
                  </div>
                  {!n.read && <div style={css(DOT)} />}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <div style={css('height:20px')} />
    </PageFrame>
  );
}
