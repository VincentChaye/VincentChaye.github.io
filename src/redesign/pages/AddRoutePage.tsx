import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import type { ClimbingRoute } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { GlassCard, SectionHeader, Pressable } from '../components/primitives';
import { FilterPill } from '../components/FilterPill';
import { BackChevronIcon, CameraIcon } from '../lib/icons';

/**
 * Ajout d'une voie (design Liquid Glass) — route additive `/redesign/spot/:id/add-route`.
 * `POST /api/climbing-routes` (requireAuth) : admin → approuvée direct, user → en attente.
 * La photo du topo est envoyée dans la foulée (`POST /:id/image`) puis on redirige vers
 * le détail de la voie où l'auteur peut tracer le topo (mains/pieds) sur sa photo.
 * i18n en dur (FR), comme les autres pages redesign.
 */

type RouteStyle = 'sport' | 'trad' | 'boulder' | 'multi' | 'other';
const STYLES: { value: RouteStyle; label: string }[] = [
  { value: 'sport', label: 'Sportive' },
  { value: 'trad', label: 'Trad' },
  { value: 'boulder', label: 'Bloc' },
  { value: 'multi', label: 'Grande voie' },
  { value: 'other', label: 'Autre' },
];

const FIELD = 'border-radius:16px;overflow:hidden';
const FIELD_LABEL = 'padding:12px 16px 2px;font-size:11px;font-weight:600;color:rgba(212,160,48,.8);letter-spacing:.3px';
const FIELD_INPUT = 'padding:0 16px 12px;font-size:16px;color:#f0ece6;background:transparent;border:none;outline:none;width:100%;font-family:inherit;box-sizing:border-box';

export function AddRoutePage() {
  const { id: spotId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuthStore();

  const [spotName, setSpotName] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [style, setStyle] = useState<RouteStyle>('sport');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spotId) return;
    apiFetch<{ name?: string }>(`/api/spots/${spotId}`)
      .then((s) => setSpotName(s?.name ?? ''))
      .catch(() => {});
  }, [spotId]);

  // Libère l'object URL de l'aperçu quand l'image change ou au démontage
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(f);
    setPreview(f ? URL.createObjectURL(f) : '');
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!spotId) return;
    if (!name.trim()) { setError('Donne un nom à la voie.'); return; }
    setLoading(true);
    try {
      const res = await apiFetch<{ route: ClimbingRoute }>('/api/climbing-routes', {
        method: 'POST', auth: true,
        body: JSON.stringify({
          spotId,
          name: name.trim(),
          grade: grade.trim() || undefined,
          style,
        }),
      });
      const newId = res.route?._id;
      if (image && newId) {
        const form = new FormData();
        form.append('image', image);
        // L'échec de l'upload ne bloque pas : la photo peut être rajoutée depuis le détail
        await apiFetch(`/api/climbing-routes/${newId}/image`, { method: 'POST', auth: true, body: form }).catch(() => {});
      }
      if (newId) navigate(`/redesign/route/${newId}`, { replace: true });
      else navigate(`/redesign/spot/${spotId}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        try { const b = JSON.parse(err.body); setError(b.detail || b.error || 'Erreur lors de l\'envoi.'); }
        catch { setError('Erreur lors de l\'envoi.'); }
      } else setError('Erreur lors de l\'envoi.');
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><Pressable className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</Pressable><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Ajouter une voie</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour ajouter une voie.</div>
          <Pressable onClick={() => navigate(`/redesign/login?next=/redesign/spot/${spotId}/add-route`)} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</Pressable>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <Pressable className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Annuler</Pressable>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Ajouter une voie</span>
        </div>
      </NavBar>

      <form onSubmit={handleSubmit}>
        {spotName && (
          <div style={css('padding:8px 20px 0;font-size:13px;color:rgba(240,236,230,.5)')}>{spotName}</div>
        )}

        <SectionHeader small style={css('padding-top:4px')}>La voie</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:12px')}>
          <GlassCard style={css(FIELD)}>
            <div style={css('position:relative;z-index:2')}>
              <div style={css(FIELD_LABEL)}>Nom de la voie *</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: La Fissure du Soleil" style={css(FIELD_INPUT)} />
            </div>
          </GlassCard>
          <GlassCard style={css(FIELD)}>
            <div style={css('position:relative;z-index:2')}>
              <div style={css(FIELD_LABEL)}>Cotation</div>
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="6a+" maxLength={10} style={css(FIELD_INPUT)} />
            </div>
          </GlassCard>
        </div>

        <SectionHeader small>Style</SectionHeader>
        <div style={css('padding:0 20px;display:flex;gap:8px;flex-wrap:wrap')}>
          {STYLES.map((s) => (
            <FilterPill key={s.value} active={style === s.value} onClick={() => setStyle(s.value)}>
              {s.label}
            </FilterPill>
          ))}
        </div>

        <SectionHeader small>Photo du topo</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={css('display:none')}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <GlassCard style={css('border-radius:16px;overflow:hidden')}>
              <div style={css('position:relative;z-index:2')}>
                <img src={preview} alt="Aperçu du topo" style={css('display:block;width:100%;max-height:320px;object-fit:cover')} />
                <div style={css('display:flex;gap:8px;padding:10px')}>
                  <Pressable onClick={() => fileInputRef.current?.click()} style={css('flex:1;padding:10px;border-radius:12px;text-align:center;font-size:13px;font-weight:600;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(240,236,230,.8);cursor:pointer')}>Changer</Pressable>
                  <Pressable onClick={() => handleFile(null)} style={css('flex:1;padding:10px;border-radius:12px;text-align:center;font-size:13px;font-weight:600;background:rgba(200,80,80,.14);border:1px solid rgba(200,80,80,.25);color:#E88080;cursor:pointer')}>Retirer</Pressable>
                </div>
              </div>
            </GlassCard>
          ) : (
            <Pressable
              onClick={() => fileInputRef.current?.click()}
              style={css('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:28px 16px;border-radius:16px;border:1.5px dashed rgba(212,160,48,.35);background:rgba(212,160,48,.07);color:#D4A030;font-size:14px;font-weight:600;cursor:pointer;text-align:center')}
            >
              <CameraIcon width={22} height={22} />
              Ajouter une photo de la paroi
              <span style={css('font-size:12px;font-weight:400;color:rgba(240,236,230,.5)')}>Tu pourras tracer le topo dessus juste après</span>
            </Pressable>
          )}
        </div>

        <div style={css('padding:20px')}>
          {error && <div style={css('font-size:13px;color:#E88080;background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);border-radius:12px;padding:10px 14px;margin-bottom:12px')}>{error}</div>}
          <button type="submit" disabled={loading} style={css(`padding:16px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.90),rgba(232,184,75,.95));border:1px solid rgba(255,255,255,.25);text-align:center;font-size:16px;font-weight:700;color:#1a0f05;cursor:pointer;box-shadow:0 4px 20px rgba(212,160,48,.35),inset 0 1px 0 rgba(255,255,255,.25);width:100%;font-family:inherit${loading ? ';opacity:.6' : ''}`)}>
            {loading ? 'Envoi…' : isAdmin ? 'Publier la voie' : 'Proposer la voie'}
          </button>
          {!isAdmin && (
            <div style={css('margin-top:10px;font-size:12px;color:rgba(240,236,230,.45);text-align:center')}>Ta voie sera visible des autres après validation par un modérateur.</div>
          )}
        </div>
      </form>
    </PageFrame>
  );
}
