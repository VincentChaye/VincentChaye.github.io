import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { type StoryGroup, fetchStoriesFeed } from '../lib/stories';
import { StoryViewer } from './StoryViewer';
import { StoryComposer } from './StoryComposer';

const RING_UNSEEN = 'background:linear-gradient(145deg,#E8B84B,#b46414)';
const RING_SEEN = 'background:rgba(255,255,255,.18)';

function Circle({ g, groups, onOpen }: { g: StoryGroup; groups: StoryGroup[]; onOpen: (idx: number) => void }) {
  const name = g.user.isSelf ? 'Toi' : (g.user.displayName || g.user.username || 'Grimpeur');
  const idx = groups.indexOf(g);
  return (
    <button onClick={() => onOpen(idx)} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:64px;flex-shrink:0;padding:0')}>
      <div style={css(`width:58px;height:58px;border-radius:50%;padding:2.5px;${g.allSeen ? RING_SEEN : RING_UNSEEN}`)}>
        <div style={css('width:100%;height:100%;border-radius:50%;overflow:hidden;background:#241a10;border:2px solid #0f0a06;display:flex;align-items:center;justify-content:center;color:#E8B84B;font-weight:700;font-size:17px')}>
          {g.user.avatarUrl ? <img src={g.user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : name[0]?.toUpperCase()}
        </div>
      </div>
      <span style={css('font-size:10.5px;color:rgba(240,236,230,.7);max-width:62px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{name}</span>
    </button>
  );
}

export function StoriesStrip() {
  const { user, isAuthenticated } = useAuthStore();
  const [groups, setGroups] = useState<StoryGroup[] | null>(null);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);

  const reload = useCallback(() => {
    fetchStoriesFeed().then((d) => setGroups(d.groups)).catch(() => setGroups([]));
  }, []);

  useEffect(() => { if (isAuthenticated) reload(); }, [isAuthenticated, reload]);

  if (!isAuthenticated || groups === null) return null;

  const selfGroup = groups.find((g) => g.user.isSelf) ?? null;
  const others = groups.filter((g) => !g.user.isSelf);
  const myName = user?.displayName || user?.username || '?';

  const markSeen = (storyId: string) => {
    setGroups((gs) => gs?.map((g) => ({
      ...g,
      stories: g.stories.map((s) => (s._id === storyId ? { ...s, seen: true } : s)),
      allSeen: g.stories.every((s) => s._id === storyId || s.seen),
    })) ?? null);
  };

  return (
    <>
      <div style={css('display:flex;gap:12px;overflow-x:auto;padding:12px 20px 4px;scrollbar-width:none')}>
        {/* Ta story : ouvre tes stories si tu en as, sinon le composer ; bouton + toujours visible */}
        <div style={css('position:relative;flex-shrink:0')}>
          {selfGroup ? <Circle g={selfGroup} groups={groups} onOpen={setViewerAt} /> : (
            <button onClick={() => setComposing(true)} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:64px;padding:0')}>
              <div style={css(`width:58px;height:58px;border-radius:50%;padding:2.5px;${RING_SEEN}`)}>
                <div style={css('width:100%;height:100%;border-radius:50%;overflow:hidden;background:#241a10;border:2px solid #0f0a06;display:flex;align-items:center;justify-content:center;color:#E8B84B;font-weight:700;font-size:17px')}>
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover;opacity:.7')} /> : myName[0]?.toUpperCase()}
                </div>
              </div>
              <span style={css('font-size:10.5px;color:rgba(240,236,230,.7)')}>Ta story</span>
            </button>
          )}
          <button
            onClick={() => setComposing(true)} aria-label="Ajouter une story"
            style={css('position:absolute;right:-1px;bottom:18px;width:20px;height:20px;border-radius:50%;background:#D4A030;color:#1a0f05;border:2px solid #0f0a06;font-size:13px;font-weight:800;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0')}
          >+</button>
        </div>
        {others.map((g) => <Circle key={g.user.uid} g={g} groups={groups} onOpen={setViewerAt} />)}
      </div>

      {viewerAt !== null && (
        <StoryViewer groups={groups} initialGroup={viewerAt} onClose={() => { setViewerAt(null); reload(); }} onSeen={markSeen} />
      )}
      {composing && <StoryComposer onClose={() => setComposing(false)} onPublished={reload} />}
    </>
  );
}
