import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { css } from '../lib/css';
import { createStory } from '../lib/stories';

interface SpotLite { id: string; name: string }

const OVERLAY = 'position:fixed;inset:0;z-index:1000;background:rgba(10,7,4,.92);backdrop-filter:blur(14px);display:flex;flex-direction:column;padding:calc(16px + var(--safe-top, 0px)) 18px calc(16px + var(--safe-bottom, 0px))';
const FIELD = 'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 14px;color:#f0ece6;font-size:14px;outline:none;width:100%';

export function StoryComposer({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [spotQuery, setSpotQuery] = useState('');
  const [spot, setSpot] = useState<SpotLite | null>(null);
  const [spots, setSpots] = useState<SpotLite[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // /api/spots renvoie du GeoJSON — même pattern que le spot picker de ConversationPage.tsx
    apiFetch<{ features?: { properties: Record<string, unknown> }[] }>('/api/spots')
      .then((d) => setSpots((d?.features ?? []).map((f) => ({
        id: String(f.properties.id ?? f.properties._id),
        name: (f.properties.name as string) || 'Sans nom',
      }))))
      .catch(() => {});
  }, []);


  const matches = useMemo(() => {
    const q = spotQuery.trim().toLowerCase();
    if (!q || spot) return [];
    return spots.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [spotQuery, spots, spot]);

  async function publish() {
    if (!file || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      await createStory(file, caption, spot?.id ?? null);
      onPublished();
      onClose();
    } catch {
      setError('Publication impossible. Réessaie.');
      setPublishing(false);
    }
  }

  const isVideo = file?.type.startsWith('video/');

  return (
    <div style={css(OVERLAY)}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:14px')}>
        <span style={css('font-size:17px;font-weight:800;color:#f0ece6')}>Nouvelle story</span>
        <button onClick={onClose} aria-label="Fermer" style={css('background:none;border:none;color:#f0ece6;font-size:22px;cursor:pointer;line-height:1')}>✕</button>
      </div>

      <input
        ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
        style={css('display:none')}
        onChange={(e) => {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setPreviewUrl(f ? URL.createObjectURL(f) : null);
        }}
      />

      <div
        onClick={() => inputRef.current?.click()}
        style={css('flex:1;min-height:0;border-radius:18px;border:1.5px dashed rgba(212,160,48,.4);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;margin-bottom:14px')}
      >
        {previewUrl ? (
          isVideo
            ? <video src={previewUrl} controls playsInline style={css('max-width:100%;max-height:100%;object-fit:contain')} />
            : <img src={previewUrl} alt="" style={css('max-width:100%;max-height:100%;object-fit:contain')} />
        ) : (
          <div style={css('text-align:center;color:rgba(240,236,230,.6);font-size:14px;padding:30px')}>
            <div style={css('font-size:34px;margin-bottom:8px')}>📷</div>
            Touche pour choisir une photo ou une vidéo
          </div>
        )}
      </div>

      <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} placeholder="Légende (optionnel)" style={css(`${FIELD};margin-bottom:10px`)} />

      {spot ? (
        <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:10px')}>
          <span style={css('flex:1;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.25);border-radius:14px;padding:10px 14px;color:#E8B84B;font-size:13px;font-weight:700')}>📍 {spot.name}</span>
          <button onClick={() => { setSpot(null); setSpotQuery(''); }} style={css('background:none;border:none;color:rgba(240,236,230,.6);font-size:18px;cursor:pointer')}>✕</button>
        </div>
      ) : (
        <div style={css('position:relative;margin-bottom:10px')}>
          <input value={spotQuery} onChange={(e) => setSpotQuery(e.target.value)} placeholder="Taguer un spot (optionnel)" style={css(FIELD)} />
          {matches.length > 0 && (
            <div style={css('position:absolute;bottom:100%;left:0;right:0;margin-bottom:6px;background:#1d1610;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden')}>
              {matches.map((s) => (
                <button key={s.id} onClick={() => setSpot(s)} style={css('display:block;width:100%;text-align:left;background:none;border:none;padding:10px 14px;color:#f0ece6;font-size:13px;cursor:pointer')}>📍 {s.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div style={css('color:#E88080;font-size:13px;margin-bottom:8px')}>{error}</div>}

      <button
        onClick={publish} disabled={!file || publishing}
        style={css(`border:none;border-radius:16px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;${file && !publishing ? 'background:#D4A030;color:#1a0f05' : 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.4)'}`)}
      >{publishing ? 'Publication…' : 'Publier la story'}</button>
    </div>
  );
}
