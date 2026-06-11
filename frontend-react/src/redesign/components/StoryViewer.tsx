import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useMessagesStore } from '@/stores/messages.store';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import {
  type Story, type StoryGroup, type StoryViewEntry,
  markStoryViewed, fetchStoryViews, reactToStory, deleteStory,
} from '../lib/stories';

const PHOTO_MS = 5000;
const QUICK_EMOJIS = ['🔥', '💪', '🧗', '👏'];

const OVERLAY = 'position:fixed;inset:0;z-index:1000;background:#000;display:flex;flex-direction:column';
const BARS = 'position:absolute;top:calc(8px + var(--safe-top, 0px));left:10px;right:10px;display:flex;gap:4px;z-index:5';
const HEAD = 'position:absolute;top:calc(20px + var(--safe-top, 0px));left:14px;right:14px;display:flex;align-items:center;gap:10px;z-index:5';
const FOOT = 'position:absolute;bottom:calc(14px + var(--safe-bottom, 0px));left:14px;right:14px;display:flex;align-items:center;gap:8px;z-index:5';

interface Props {
  groups: StoryGroup[];
  initialGroup: number;
  onClose: () => void;
  /** appelé quand une story vient d'être vue (pour rafraîchir le strip) */
  onSeen?: (storyId: string) => void;
}

function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.floor(m / 60)}h`;
}

export function StoryViewer({ groups, initialGroup, onClose, onSeen }: Props) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const sendMessage = useMessagesStore((s) => s.sendMessage);

  const [gi, setGi] = useState(initialGroup);
  const [si, setSi] = useState(() => {
    const g = groups[initialGroup];
    const firstUnseen = g?.stories.findIndex((s) => !s.seen) ?? 0;
    return firstUnseen >= 0 ? firstUnseen : 0;
  });
  const [progress, setProgress] = useState(0); // 0..1 sur la story courante
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sentFlash, setSentFlash] = useState<string | null>(null);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [views, setViews] = useState<StoryViewEntry[] | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const pressStartRef = useRef(0);

  const group = groups[gi];
  const story: Story | undefined = group?.stories[si];
  const isMine = !!story && !!user && story.userId === user._id;

  const goNext = useCallback(() => {
    if (!group) return;
    if (si < group.stories.length - 1) { setSi(si + 1); return; }
    if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); return; }
    onClose();
  }, [group, si, gi, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (si > 0) { setSi(si - 1); return; }
    if (gi > 0) {
      const prev = groups[gi - 1];
      setGi(gi - 1);
      setSi(Math.max(0, prev.stories.length - 1));
    }
  }, [si, gi, groups]);

  // Marque la vue + reset progression à chaque changement de story
  useEffect(() => {
    if (!story) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(0);
    elapsedRef.current = 0;
    setReplyText('');
    setSentFlash(null);
    setViewsOpen(false);
    setViews(null);
    markStoryViewed(story._id).then(() => onSeen?.(story._id)).catch(() => {});
  }, [story?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer photo (les vidéos avancent via onTimeUpdate/onEnded)
  useEffect(() => {
    if (!story || story.media.type === 'video' || paused) return;
    startRef.current = performance.now() - elapsedRef.current;
    const tick = (t: number) => {
      const e = t - startRef.current;
      elapsedRef.current = e;
      if (e >= PHOTO_MS) { goNext(); return; }
      setProgress(e / PHOTO_MS);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story?._id, paused, story?.media.type, goNext]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = videoRef.current;
    if (v) { if (paused) v.pause(); else v.play().catch(() => {}); }
  }, [paused, story?._id]);

  if (!story || !group) return null;

  const name = group.user.displayName || group.user.username || 'Grimpeur';

  async function handleReply(text: string, emoji?: string) {
    if (!story) return;
    try {
      if (emoji) await reactToStory(story._id, emoji);
      if (text.trim() || emoji) {
        const conv = await apiFetch<{ _id: string }>('/api/messages/conversations', {
          method: 'POST',
          body: JSON.stringify({ participantUid: story.userId }),
          auth: true,
        });
        await sendMessage(conv._id, emoji && !text.trim() ? emoji : text.trim(), undefined, {
          type: 'story',
          id: story._id,
          name: 'Story',
          subtitle: story.caption,
          imageUrl: story.media.type === 'image' ? story.media.url : null,
        });
      }
      setReplyText('');
      setSentFlash(emoji ?? 'Envoyé ✓');
      setTimeout(() => setSentFlash(null), 1200);
    } catch {
      setSentFlash('Échec ✕');
      setTimeout(() => setSentFlash(null), 1200);
    }
  }

  async function openViews() {
    if (!story) return;
    setPaused(true);
    setViewsOpen(true);
    try { setViews((await fetchStoryViews(story._id)).views); } catch { setViews([]); }
  }

  async function handleDelete() {
    if (!story) return;
    if (!confirm('Supprimer cette story ?')) return;
    try { await deleteStory(story._id); onClose(); } catch { /* ignore */ }
  }

  return (
    <div style={css(OVERLAY)}>
      {/* Média + zones tap */}
      <div
        style={css('position:absolute;inset:0;display:flex;align-items:center;justify-content:center')}
        onPointerDown={() => { setPaused(true); pressStartRef.current = performance.now(); }}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {story.media.type === 'video' ? (
          <video
            ref={videoRef} key={story._id} src={story.media.url} autoPlay playsInline
            style={css('max-width:100%;max-height:100%;object-fit:contain')}
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
            onEnded={goNext}
          />
        ) : (
          <img key={story._id} src={story.media.url} alt="" style={css('max-width:100%;max-height:100%;object-fit:contain')} />
        )}
        <div style={css('position:absolute;inset:0 50% 120px 0')} onClick={() => { if (performance.now() - pressStartRef.current > 250) return; goPrev(); }} />
        <div style={css('position:absolute;inset:0 0 120px 50%')} onClick={() => { if (performance.now() - pressStartRef.current > 250) return; goNext(); }} />
      </div>

      {/* Barres de progression */}
      <div style={css(BARS)}>
        {group.stories.map((s, i) => (
          <div key={s._id} style={css('flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.25);overflow:hidden')}>
            <div style={css(`height:100%;background:#fff;width:${i < si ? 100 : i === si ? progress * 100 : 0}%`)} />
          </div>
        ))}
      </div>

      {/* En-tête auteur */}
      <div style={css(HEAD)}>
        <div
          style={css('display:flex;align-items:center;gap:9px;cursor:pointer')}
          onClick={() => { onClose(); navigate(group.user.isSelf ? '/redesign/profile' : `/redesign/profile/${group.user.uid}`); }}
        >
          <div style={css('width:34px;height:34px;border-radius:50%;overflow:hidden;background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3));display:flex;align-items:center;justify-content:center;font-weight:700;color:#E8B84B;font-size:14px')}>
            {group.user.avatarUrl ? <img src={group.user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={css('font-size:13px;font-weight:700;color:#fff')}>{name}</div>
            <div style={css('font-size:11px;color:rgba(255,255,255,.6)')}>{relTime(story.createdAt)}</div>
          </div>
        </div>
        <div style={css('flex:1')} />
        {isMine && (
          <button onClick={handleDelete} aria-label="Supprimer" style={css('background:none;border:none;color:rgba(255,255,255,.7);font-size:16px;cursor:pointer;padding:6px')}>🗑</button>
        )}
        <button onClick={onClose} aria-label="Fermer" style={css('background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:6px;line-height:1')}>✕</button>
      </div>

      {/* Légende + pastille spot */}
      {(story.caption || story.spotId) && (
        <div style={css('position:absolute;bottom:calc(70px + var(--safe-bottom, 0px));left:14px;right:14px;z-index:5;display:flex;flex-direction:column;gap:8px;align-items:flex-start')}>
          {story.spotId && (
            <button
              onClick={() => { onClose(); navigate(`/redesign/spot/${story.spotId}`); }}
              style={css('display:flex;align-items:center;gap:6px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);border:1px solid rgba(212,160,48,.4);border-radius:20px;padding:6px 12px;color:#E8B84B;font-size:12px;font-weight:700;cursor:pointer')}
            >📍 {story.spotName ?? 'Voir le spot'}</button>
          )}
          {story.caption && (
            <div style={css('background:rgba(0,0,0,.55);backdrop-filter:blur(8px);border-radius:12px;padding:8px 12px;color:#fff;font-size:14px;max-width:100%')}>{story.caption}</div>
          )}
        </div>
      )}

      {/* Pied : répondre / vues */}
      <div style={css(FOOT)}>
        {isMine ? (
          <button onClick={openViews} style={css('display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:8px 14px;color:#fff;font-size:13px;font-weight:600;cursor:pointer')}>
            👁 {story.viewCount ?? 0} vue{(story.viewCount ?? 0) > 1 ? 's' : ''}
          </button>
        ) : (
          <>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) handleReply(replyText); }}
              placeholder="Répondre…"
              style={css('flex:1;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:9px 14px;color:#fff;font-size:14px;outline:none;min-width:0')}
            />
            {replyText.trim() ? (
              <button onClick={() => handleReply(replyText)} style={css('background:#D4A030;border:none;border-radius:20px;padding:9px 14px;color:#1a0f05;font-weight:700;font-size:13px;cursor:pointer')}>Envoyer</button>
            ) : (
              QUICK_EMOJIS.map((e) => (
                <button key={e} onClick={() => handleReply('', e)} style={css(`background:none;border:none;font-size:22px;cursor:pointer;padding:2px;${story.myReaction === e ? 'transform:scale(1.25)' : ''}`)}>{e}</button>
              ))
            )}
          </>
        )}
        {sentFlash && <span style={css('color:#fff;font-size:13px;font-weight:600')}>{sentFlash}</span>}
      </div>

      {/* Bottom sheet « Vu par » */}
      {viewsOpen && (
        <div style={css('position:absolute;inset:0;z-index:10;background:rgba(0,0,0,.5)')} onClick={() => { setViewsOpen(false); setPaused(false); }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={css('position:absolute;bottom:0;left:0;right:0;max-height:60%;overflow-y:auto;background:#17120c;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + var(--safe-bottom, 0px))')}
          >
            <div style={css('font-size:15px;font-weight:800;color:#f0ece6;margin-bottom:14px')}>Vu par {views?.length ?? '…'}</div>
            {views === null ? (
              <div style={css('color:rgba(240,236,230,.5);font-size:13px')}>Chargement…</div>
            ) : views.length === 0 ? (
              <div style={css('color:rgba(240,236,230,.5);font-size:13px')}>Personne pour l'instant.</div>
            ) : views.map((v) => (
              <div key={v.uid} style={css('display:flex;align-items:center;gap:10px;padding:7px 0')}>
                <div style={css('width:32px;height:32px;border-radius:50%;overflow:hidden;background:rgba(212,160,48,.2);display:flex;align-items:center;justify-content:center;color:#E8B84B;font-weight:700;font-size:13px')}>
                  {v.avatarUrl ? <img src={v.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : (v.displayName || v.username || '?')[0]?.toUpperCase()}
                </div>
                <span style={css('flex:1;font-size:14px;color:#f0ece6;font-weight:600')}>{v.displayName || v.username || 'Grimpeur'}</span>
                {v.emoji && <span style={css('font-size:18px')}>{v.emoji}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
