import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import type { ClimbingRoute, TopoPoint } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { GlassCard, Tag } from '../components/primitives';
import { TopoCanvas } from '../components/TopoCanvas';
import { TOPO_COLORS } from '../lib/topo';
import { BackChevronIcon, CameraIcon, ExpandIcon, TrashIcon, XIcon } from '../lib/icons';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Détail d'une voie (design Liquid Glass) : photo + topo interactif.
 * Le topo = sommets (prises) posés au tap, chaînés par couleur en deux
 * polylines indépendantes : mains et pieds. Édition réservée à l'auteur
 * de la voie et aux admins ; lecture publique. i18n en dur (FR), comme
 * les autres pages redesign.
 */

const STYLE_LABEL: Record<string, string> = {
  sport: 'Sportive',
  trad: 'Trad',
  boulder: 'Bloc',
  multi: 'Grande voie',
  other: 'Autre',
};

/** Même barème de couleur de cotation que SpotDetailPage. */
function gradeColors(grade?: string): { bg: string; border: string; color: string } {
  const g = (grade ?? '').toLowerCase().trim();
  if (/^[345]/.test(g)) return { bg: 'rgba(100,180,80,.15)', border: 'rgba(100,180,80,.25)', color: '#88D880' };
  if (g.startsWith('6')) return { bg: 'rgba(212,160,48,.12)', border: 'rgba(212,160,48,.22)', color: '#D4A030' };
  if (g.startsWith('7')) return { bg: 'rgba(200,120,60,.14)', border: 'rgba(200,120,60,.25)', color: '#E8924A' };
  if (/^[89]/.test(g)) return { bg: 'rgba(180,80,80,.14)', border: 'rgba(180,80,80,.25)', color: '#E88080' };
  return { bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.10)', color: 'rgba(240,236,230,.6)' };
}

const TOOL_BTN = 'display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:9999px;font-size:13px;font-weight:600;cursor:pointer;user-select:none';

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();

  const [route, setRoute] = useState<ClimbingRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* ---------- Topo (state local jusqu'au PUT) ---------- */
  const [points, setPoints] = useState<TopoPoint[]>([]);
  const [editing, setEditing] = useState(false);
  const [activeColor, setActiveColor] = useState<TopoPoint['color']>('hand');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [fullscreenTopo, setFullscreenTopo] = useState(false);

  /* ---------- Upload photo ---------- */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(false);
    apiFetch<ClimbingRoute>(`/api/climbing-routes/${id}`)
      .then((r) => {
        if (!alive) return;
        if (!r) { setError(true); return; }
        setRoute(r);
        setPoints(r.topo?.points ?? []);
      })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const canEdit = !!route && (isAdmin || route.createdBy?.uid === user?._id);

  /* Bloque le scroll de la page derrière l'overlay plein écran */
  useEffect(() => {
    if (!fullscreenTopo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [fullscreenTopo]);

  const addPoint = (x: number, y: number) => {
    setPoints((prev) => {
      const maxOrder = prev.filter((p) => p.color === activeColor).reduce((m, p) => Math.max(m, p.order), -1);
      return [...prev, { color: activeColor, order: maxOrder + 1, x, y }];
    });
    setDirty(true);
    setSaveStatus('idle');
  };

  const removePoint = (point: TopoPoint) => {
    setPoints((prev) => prev.filter((p) => !(p.color === point.color && p.order === point.order)));
    setDirty(true);
    setSaveStatus('idle');
  };

  /* Retire le dernier point posé de la couleur active */
  const undo = () => {
    setPoints((prev) => {
      const chain = prev.filter((p) => p.color === activeColor);
      if (chain.length === 0) return prev;
      const last = chain.reduce((m, p) => (p.order > m.order ? p : m));
      return prev.filter((p) => !(p.color === activeColor && p.order === last.order));
    });
    setDirty(true);
    setSaveStatus('idle');
  };

  const clearAll = () => {
    setPoints([]);
    setDirty(true);
    setSaveStatus('idle');
  };

  const save = async () => {
    if (!id || saving) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      await apiFetch(`/api/climbing-routes/${id}/topo`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ points }),
      });
      setDirty(false);
      setSaveStatus('done');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const stopEditing = () => {
    if (dirty && !window.confirm('Des modifications du topo ne sont pas enregistrées. Quitter quand même ?')) return;
    // Restaure le topo sauvegardé si on abandonne des changements
    if (dirty) setPoints(route?.topo?.points ?? []);
    setDirty(false);
    setEditing(false);
    setSaveStatus('idle');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await apiFetch<{ imageUrl: string }>(`/api/climbing-routes/${id}/image`, {
        method: 'POST',
        auth: true,
        body: form,
      });
      setRoute((prev) => (prev ? { ...prev, imageUrl: res.imageUrl } : prev));
    } catch {
      setUploadError("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <PageFrame><div style={css('min-height:600px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div></PageFrame>;
  }
  if (error || !route) {
    return (
      <PageFrame>
        <div style={css('min-height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Voie introuvable.</div>
          <div onClick={() => navigate(-1)} style={css('padding:10px 18px;border-radius:9999px;background:rgba(212,160,48,.85);color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer')}>Retour</div>
        </div>
      </PageFrame>
    );
  }

  const c = gradeColors(route.grade);
  const meta = [
    route.style ? STYLE_LABEL[route.style] ?? route.style : null,
    route.height ? `${route.height} m` : null,
    route.bolts != null ? `${route.bolts} pts` : null,
  ].filter(Boolean).join(' · ');
  const hasTopo = points.length > 0;

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}>
            <BackChevronIcon width={9} height={15} /> Retour
          </div>
        </div>
      </NavBar>

      <div style={css('position:relative;padding-bottom:24px')}>
        {/* En-tête voie */}
        <div style={css('display:flex;align-items:center;gap:14px;padding:18px 20px 14px')}>
          <div style={css(`width:52px;height:52px;border-radius:15px;background:${c.bg};border:1px solid ${c.border};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:${c.color};flex-shrink:0`)}>
            {route.grade || '—'}
          </div>
          <div style={css('min-width:0;flex:1')}>
            <div style={css('font-size:20px;font-weight:800;letter-spacing:-.4px;color:#f0ece6;margin-bottom:3px')}>{route.name}</div>
            <div style={css('font-size:13px;color:rgba(240,236,230,.6)')}>{meta || '—'}</div>
          </div>
          {route.status === 'pending' && <Tag variant="g">En attente</Tag>}
        </div>

        {route.description && (
          <div style={css('padding:0 20px 14px')}>
            <GlassCard style={css('border-radius:16px;padding:14px 16px')}>
              <div style={css('position:relative;z-index:2;font-size:13px;line-height:1.55;color:rgba(240,236,230,.7)')}>{route.description}</div>
            </GlassCard>
          </div>
        )}

        {/* ============================ Topo ============================ */}
        <div style={css('padding:0 20px')}>
          {route.imageUrl ? (
            <GlassCard style={css('border-radius:20px;overflow:hidden')}>
              <div style={css('position:relative;z-index:2')}>
                <div style={css('position:relative')}>
                  <TopoCanvas
                    imageUrl={route.imageUrl}
                    points={points}
                    editable={editing && canEdit}
                    onAddPoint={addPoint}
                    onRemovePoint={removePoint}
                  />
                  <div
                    onClick={() => setFullscreenTopo(true)}
                    title="Plein écran"
                    style={css('position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:12px;background:rgba(10,8,4,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#f0ece6')}
                  >
                    <ExpandIcon width={17} height={17} />
                  </div>
                </div>

                {/* Légende */}
                {(hasTopo || editing) && (
                  <div style={css('display:flex;align-items:center;gap:16px;padding:10px 16px;border-top:1px solid rgba(255,255,255,.08)')}>
                    {(['hand', 'foot'] as const).map((color) => (
                      <div
                        key={color}
                        onClick={editing ? () => setActiveColor(color) : undefined}
                        style={css(`display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:rgba(240,236,230,.75);${editing ? `cursor:pointer;padding:6px 12px;border-radius:9999px;border:1px solid ${activeColor === color ? TOPO_COLORS[color].stroke : 'rgba(255,255,255,.12)'};background:${activeColor === color ? 'rgba(255,255,255,.08)' : 'transparent'}` : ''}`)}
                      >
                        <span style={css(`width:11px;height:11px;border-radius:9999px;background:${TOPO_COLORS[color].fill};flex-shrink:0`)} />
                        {TOPO_COLORS[color].label}
                      </div>
                    ))}
                    {editing && (
                      <div style={css('margin-left:auto;font-size:11px;color:rgba(240,236,230,.45)')}>
                        Touche la photo pour poser une prise
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          ) : (
            <GlassCard style={css('border-radius:20px;padding:32px 20px;text-align:center')}>
              <div style={css('position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:12px')}>
                <CameraIcon width={28} height={28} style={css('color:rgba(240,236,230,.4)')} />
                <div style={css('font-size:13px;color:rgba(240,236,230,.55)')}>Aucune photo pour cette voie.</div>
                {canEdit && (
                  <div
                    onClick={uploading ? undefined : () => fileInputRef.current?.click()}
                    style={css(`${TOOL_BTN};${uploading ? 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.35)' : 'background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05'}`)}
                  >
                    <CameraIcon width={15} height={15} />
                    {uploading ? 'Envoi…' : 'Ajouter une photo'}
                  </div>
                )}
                {uploadError && <div style={css('font-size:12px;color:#E88080')}>{uploadError}</div>}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Barre d'édition du topo */}
        {route.imageUrl && canEdit && (
          <div style={css('padding:14px 20px 0')}>
            {!editing ? (
              <div style={css('display:flex;gap:10px')}>
                <div
                  onClick={() => setEditing(true)}
                  style={css(`${TOOL_BTN};flex:1;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05`)}
                >
                  {hasTopo ? 'Modifier le topo' : 'Créer le topo'}
                </div>
                <div
                  onClick={uploading ? undefined : () => fileInputRef.current?.click()}
                  style={css(`${TOOL_BTN};background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(240,236,230,.75)`)}
                >
                  <CameraIcon width={15} height={15} />
                  {uploading ? 'Envoi…' : 'Photo'}
                </div>
              </div>
            ) : (
              <div style={css('display:flex;flex-direction:column;gap:10px')}>
                <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
                  <div onClick={undo} style={css(`${TOOL_BTN};background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(240,236,230,.75)`)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
                    Annuler
                  </div>
                  <div onClick={clearAll} style={css(`${TOOL_BTN};background:rgba(200,80,80,.14);border:1px solid rgba(200,80,80,.25);color:#E88080`)}>
                    <TrashIcon width={14} height={14} />
                    Tout effacer
                  </div>
                  <div onClick={stopEditing} style={css(`${TOOL_BTN};margin-left:auto;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(240,236,230,.75)`)}>
                    Fermer
                  </div>
                </div>
                <div
                  onClick={saving || !dirty ? undefined : save}
                  style={css(`${TOOL_BTN};padding:13px;${saving || !dirty ? 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.35)' : 'background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05'}`)}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer le topo'}
                </div>
                {saveStatus === 'done' && (
                  <div style={css('font-size:13px;font-weight:600;color:#88D880;text-align:center')}>Topo enregistré</div>
                )}
                {saveStatus === 'error' && (
                  <div style={css('font-size:13px;color:#E88080;text-align:center')}>Erreur lors de l'enregistrement du topo.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message lecture seule sans topo */}
        {route.imageUrl && !canEdit && !hasTopo && (
          <div style={css('padding:12px 20px 0;font-size:12px;color:rgba(240,236,230,.45);text-align:center')}>
            Aucun topo pour cette voie.
          </div>
        )}

        {/* ================= Topo plein écran (zoom/pan) ================= */}
        {fullscreenTopo && route.imageUrl && (
          <div style={css('position:fixed;inset:0;z-index:1200;background:rgba(10,8,4,.97);display:flex;flex-direction:column')}>
            {/* Barre haute : aide + fermer */}
            <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 16px 12px')}>
              <div style={css('font-size:12px;color:rgba(240,236,230,.5)')}>
                {editing && canEdit ? 'Pince ou molette pour zoomer · glisse pour te déplacer · tap pour poser une prise' : 'Pince ou molette pour zoomer · glisse pour te déplacer'}
              </div>
              <div
                onClick={() => setFullscreenTopo(false)}
                style={css('width:38px;height:38px;border-radius:9999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#f0ece6;flex-shrink:0')}
              >
                <XIcon width={18} height={18} />
              </div>
            </div>

            {/* Canvas centré, zoomable */}
            <div style={css('flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:0')}>
              <TopoCanvas
                imageUrl={route.imageUrl}
                points={points}
                editable={editing && canEdit}
                onAddPoint={addPoint}
                onRemovePoint={removePoint}
                zoomable
                imgMaxHeight={`calc(100dvh - ${editing && canEdit ? 200 : 130}px)`}
              />
            </div>

            {/* Barre basse : sélecteur de couleur + annuler en édition, légende sinon */}
            <div style={css('display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px calc(14px + env(safe-area-inset-bottom))')}>
              {(['hand', 'foot'] as const).map((color) => (
                <div
                  key={color}
                  onClick={editing && canEdit ? () => setActiveColor(color) : undefined}
                  style={css(`display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:rgba(240,236,230,.75);${editing && canEdit ? `cursor:pointer;padding:7px 13px;border-radius:9999px;border:1px solid ${activeColor === color ? TOPO_COLORS[color].stroke : 'rgba(255,255,255,.12)'};background:${activeColor === color ? 'rgba(255,255,255,.08)' : 'transparent'}` : ''}`)}
                >
                  <span style={css(`width:11px;height:11px;border-radius:9999px;background:${TOPO_COLORS[color].fill};flex-shrink:0`)} />
                  {TOPO_COLORS[color].label}
                </div>
              ))}
              {editing && canEdit && (
                <div onClick={undo} style={css(`${TOOL_BTN};margin-left:auto;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(240,236,230,.75)`)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
                  Annuler
                </div>
              )}
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={css('display:none')} />
      </div>
    </PageFrame>
  );
}
