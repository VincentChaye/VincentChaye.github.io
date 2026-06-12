import { useCallback, useEffect, useState } from 'react';
import { css } from '../lib/css';
import {
  type Highlight, type Story, type StoryGroup,
  fetchHighlights, fetchUserStories, createHighlight, deleteHighlight,
} from '../lib/stories';
import { StoryViewer } from './StoryViewer';

interface Props {
  uid: string;
  isSelf: boolean;
  /** infos pour fabriquer le groupe du viewer */
  userInfo: { username: string | null; displayName: string | null; avatarUrl: string | null };
}

interface ArchiveItemProps {
  story: Story;
  on: boolean;
  onToggle: (id: string) => void;
}

function ArchiveItem({ story, on, onToggle }: ArchiveItemProps) {
  return (
    <button
      onClick={() => onToggle(story._id)}
      style={css(`position:relative;aspect-ratio:9/16;border-radius:12px;overflow:hidden;border:2px solid ${on ? '#D4A030' : 'transparent'};background:#241a10;cursor:pointer;padding:0`)}
    >
      {story.media.type === 'image'
        ? <img src={story.media.url} alt="" style={css('width:100%;height:100%;object-fit:cover')} />
        : <video src={story.media.url} muted style={css('width:100%;height:100%;object-fit:cover')} />}
      {on && (
        <span style={css('position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;background:#D4A030;color:#1a0f05;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center')}>
          ✓
        </span>
      )}
    </button>
  );
}

export function HighlightsRow({ uid, isSelf, userInfo }: Props) {
  const [highlights, setHighlights] = useState<Highlight[] | null>(null);
  const [viewing, setViewing] = useState<Highlight | null>(null);
  const [creating, setCreating] = useState(false);
  const [archive, setArchive] = useState<Story[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    fetchHighlights(uid).then((d) => setHighlights(d.highlights)).catch(() => setHighlights([]));
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);

  if (highlights === null || (highlights.length === 0 && !isSelf)) return null;

  function openCreate() {
    setCreating(true);
    setSelected(new Set());
    setName('');
    fetchUserStories(uid, true).then((d) => setArchive(d.stories)).catch(() => setArchive([]));
  }

  async function save() {
    if (!name.trim() || selected.size === 0 || saving) return;
    setSaving(true);
    try {
      await createHighlight(name.trim(), [...selected]);
      setCreating(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function removeHighlight(h: Highlight) {
    if (!confirm(`Supprimer « ${h.name} » ? (les stories ne sont pas supprimées)`)) return;
    await deleteHighlight(h._id).catch(() => {});
    setViewing(null);
    reload();
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const viewerGroups: StoryGroup[] = viewing && viewing.stories.length
    ? [{ user: { uid, isSelf, ...userInfo }, stories: viewing.stories, allSeen: true }]
    : [];

  return (
    <div style={css('padding:4px 0 2px')}>
      <div style={css('display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:4px 2px')}>
        {highlights.map((h) => (
          <button key={h._id} onClick={() => h.stories.length && setViewing(h)} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:62px;flex-shrink:0;padding:0')}>
            <div style={css('width:54px;height:54px;border-radius:50%;padding:2px;background:rgba(255,255,255,.18)')}>
              <div style={css('width:100%;height:100%;border-radius:50%;overflow:hidden;background:#241a10;border:2px solid #0f0a06;display:flex;align-items:center;justify-content:center;font-size:18px')}>
                {h.coverUrl ? <img src={h.coverUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : '⭐'}
              </div>
            </div>
            <span style={css('font-size:10.5px;color:rgba(240,236,230,.7);max-width:60px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{h.name}</span>
          </button>
        ))}
        {isSelf && (
          <button onClick={openCreate} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:62px;flex-shrink:0;padding:0')}>
            <div style={css('width:54px;height:54px;border-radius:50%;border:1.5px dashed rgba(240,236,230,.35);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.6);font-size:22px')}>+</div>
            <span style={css('font-size:10.5px;color:rgba(240,236,230,.7)')}>Nouveau</span>
          </button>
        )}
      </div>

      {viewing && viewerGroups.length > 0 && (
        <>
          <StoryViewer groups={viewerGroups} initialGroup={0} onClose={() => setViewing(null)} />
          {isSelf && (
            <button onClick={() => removeHighlight(viewing)} style={css('position:fixed;top:calc(20px + var(--safe-top, 0px));right:56px;z-index:1001;background:none;border:none;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;cursor:pointer')}>Supprimer</button>
          )}
        </>
      )}

      {creating && (
        <div style={css('position:fixed;inset:0;z-index:1000;background:rgba(10,7,4,.94);backdrop-filter:blur(14px);display:flex;flex-direction:column;padding:calc(16px + var(--safe-top, 0px)) 18px calc(16px + var(--safe-bottom, 0px))')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:14px')}>
            <span style={css('font-size:17px;font-weight:800;color:#f0ece6')}>Nouvelle « À la une »</span>
            <button onClick={() => setCreating(false)} aria-label="Fermer" style={css('background:none;border:none;color:#f0ece6;font-size:22px;cursor:pointer;line-height:1')}>✕</button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Nom (ex. Fontainebleau)"
            style={css('background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 14px;color:#f0ece6;font-size:14px;outline:none;margin-bottom:14px')}
          />
          <div style={css('flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:start')}>
            {archive === null ? (
              <span style={css('color:rgba(240,236,230,.5);font-size:13px;grid-column:1/-1')}>Chargement…</span>
            ) : archive.length === 0 ? (
              <span style={css('color:rgba(240,236,230,.5);font-size:13px;grid-column:1/-1')}>Aucune story dans tes archives. Publie d'abord une story !</span>
            ) : archive.map((s) => (
              <ArchiveItem key={s._id} story={s} on={selected.has(s._id)} onToggle={toggleSelected} />
            ))}
          </div>
          <button
            onClick={save}
            disabled={!name.trim() || selected.size === 0 || saving}
            style={css(`margin-top:14px;border:none;border-radius:16px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;${name.trim() && selected.size > 0 && !saving ? 'background:#D4A030;color:#1a0f05' : 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.4)'}`)}
          >
            {saving ? 'Création…' : `Créer (${selected.size})`}
          </button>
        </div>
      )}
    </div>
  );
}
