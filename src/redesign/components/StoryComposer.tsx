import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import { css } from '../lib/css';
import { createStory } from '../lib/stories';
import { CameraIcon, MapPinIcon, SendIcon } from '../lib/icons';

interface SpotLite { id: string; name: string }

/* Portal vers <body> : monté dans `.pw` (transform), un position:fixed resterait confiné
   au stacking context de la page (z:10) et passerait sous la TabBar (`.tbw` z:200). */
const OVERLAY = 'position:fixed;inset:0;z-index:1000;background:#000;display:flex;flex-direction:column';
/* Boutons latéraux façon Instagram : icône seule, pas de fond, lisible via drop-shadow. */
const SIDE_BTN = 'background:none;border:none;color:#fff;cursor:pointer;padding:10px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))';

export function StoryComposer({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [spotQuery, setSpotQuery] = useState('');
  const [spot, setSpot] = useState<SpotLite | null>(null);
  const [spots, setSpots] = useState<SpotLite[]>([]);
  const [spotPanel, setSpotPanel] = useState(false);
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
    if (!q) return [];
    return spots.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [spotQuery, spots]);

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

  return createPortal(
    <div style={css(OVERLAY)}>
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

      {/* Média plein écran */}
      {previewUrl ? (
        <div style={css('position:absolute;inset:0;display:flex;align-items:center;justify-content:center')}>
          {isVideo
            ? <video src={previewUrl} autoPlay loop muted playsInline style={css('max-width:100%;max-height:100%;object-fit:contain')} />
            : <img src={previewUrl} alt="" style={css('max-width:100%;max-height:100%;object-fit:contain')} />}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          style={css('position:absolute;inset:0;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:rgba(240,236,230,.7);font-size:14px')}
        >
          <CameraIcon aria-hidden width={40} height={40} />
          Touche pour choisir une photo ou une vidéo
        </button>
      )}

      {/* Scrims haut/bas pour la lisibilité des contrôles */}
      <div aria-hidden style={css('position:absolute;top:0;left:0;right:0;height:110px;background:linear-gradient(rgba(0,0,0,.55),transparent);pointer-events:none')} />
      <div aria-hidden style={css('position:absolute;bottom:0;left:0;right:0;height:130px;background:linear-gradient(transparent,rgba(0,0,0,.55));pointer-events:none')} />

      {/* Header : titre + fermer, sans fond */}
      <div style={css('position:absolute;top:calc(14px + var(--safe-top, 0px));left:16px;right:12px;display:flex;align-items:center;justify-content:space-between')}>
        <span style={css('font-size:16px;font-weight:800;color:#fff;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))')}>Nouvelle story</span>
        <button onClick={onClose} aria-label="Fermer" style={css(`${SIDE_BTN};font-size:24px;line-height:1`)}>✕</button>
      </div>

      {/* Outils latéraux (droite) façon Instagram */}
      {file && (
        <div style={css('position:absolute;right:8px;top:calc(70px + var(--safe-top, 0px));display:flex;flex-direction:column;gap:4px')}>
          <button onClick={() => inputRef.current?.click()} aria-label="Changer le média" style={css(SIDE_BTN)}>
            <CameraIcon aria-hidden width={24} height={24} />
          </button>
          <button
            onClick={() => setSpotPanel(true)} aria-label="Taguer un spot"
            style={css(`${SIDE_BTN};${spot ? 'color:#E8B84B' : ''}`)}
          >
            <MapPinIcon aria-hidden width={24} height={24} />
          </button>
        </div>
      )}

      {/* Spot tagué : pill flottante */}
      {spot && (
        <div style={css('position:absolute;top:calc(64px + var(--safe-top, 0px));left:16px;display:flex;align-items:center;gap:6px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);border:1px solid rgba(212,160,48,.35);border-radius:999px;padding:7px 12px;color:#E8B84B;font-size:12.5px;font-weight:700')}>
          <MapPinIcon aria-hidden width={13} height={13} /> {spot.name}
          <button onClick={() => { setSpot(null); setSpotQuery(''); }} aria-label="Retirer le spot" style={css('background:none;border:none;color:rgba(240,236,230,.7);font-size:14px;cursor:pointer;padding:0 0 0 4px;line-height:1')}>✕</button>
        </div>
      )}

      {error && (
        <div style={css('position:absolute;bottom:calc(78px + var(--safe-bottom, 0px));left:16px;right:16px;text-align:center;color:#E88080;font-size:13px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))')}>{error}</div>
      )}

      {/* Barre du bas : légende + envoi, au-dessus de la safe area */}
      <div style={css('position:absolute;bottom:calc(16px + var(--safe-bottom, 0px));left:14px;right:14px;display:flex;align-items:center;gap:10px')}>
        <input
          value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500}
          placeholder="Légende (optionnel)"
          style={css('flex:1;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:12px 16px;color:#fff;font-size:14px;outline:none;min-width:0')}
        />
        <button
          onClick={publish} disabled={!file || publishing} aria-label="Publier la story"
          style={css(`width:48px;height:48px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;${file && !publishing ? 'background:#D4A030;color:#1a0f05' : 'background:rgba(255,255,255,.12);color:rgba(240,236,230,.4)'}`)}
        >
          <SendIcon aria-hidden width={20} height={20} style={{ marginLeft: -2, marginTop: 2 }} />
        </button>
      </div>

      {/* Panneau de recherche de spot (sheet bas) */}
      {spotPanel && (
        <div style={css('position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;flex-direction:column;justify-content:flex-end')} onClick={() => setSpotPanel(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={css('background:#1d1610;border-radius:22px 22px 0 0;border-top:1px solid rgba(255,255,255,.1);padding:18px 16px calc(18px + var(--safe-bottom, 0px));display:flex;flex-direction:column;gap:10px;max-height:60%')}
          >
            <div style={css('display:flex;align-items:center;justify-content:space-between')}>
              <span style={css('font-size:15px;font-weight:800;color:#f0ece6')}>Taguer un spot</span>
              <button onClick={() => setSpotPanel(false)} aria-label="Fermer" style={css('background:none;border:none;color:rgba(240,236,230,.6);font-size:20px;cursor:pointer;line-height:1')}>✕</button>
            </div>
            <input
              value={spotQuery} onChange={(e) => setSpotQuery(e.target.value)} placeholder="Rechercher un spot…" autoFocus
              style={css('background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 14px;color:#f0ece6;font-size:14px;outline:none;width:100%')}
            />
            <div style={css('overflow-y:auto;min-height:0')}>
              {matches.map((s) => (
                <button
                  key={s.id} onClick={() => { setSpot(s); setSpotPanel(false); }}
                  style={css('display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;padding:11px 6px;color:#f0ece6;font-size:13.5px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)')}
                ><MapPinIcon aria-hidden width={14} height={14} style={{ flexShrink: 0 }} /> {s.name}</button>
              ))}
              {spotQuery.trim() && matches.length === 0 && (
                <div style={css('padding:14px 6px;color:rgba(240,236,230,.5);font-size:13px')}>Aucun spot trouvé.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
