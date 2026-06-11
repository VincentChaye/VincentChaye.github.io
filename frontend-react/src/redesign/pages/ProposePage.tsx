import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { GlassCard, SectionHeader, Pressable } from '../components/primitives';
import { TypeCard } from '../components/TypeCard';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Proposer un spot (design Liquid Glass) câblé au VRAI backend (écriture).
 * Route additive `/redesign/propose`. `POST /api/spots` (requireAuth) : admin → approuvé direct,
 * user → en attente. Le wizard 4 étapes de la maquette est condensé en un formulaire unique.
 *
 * Honnête : `location` est obligatoire (schema GeoJSON) → géolocalisation réelle + saisie lat/lng
 * manuelle (pas de carte Leaflet ici, c'est l'écran Carte). i18n en dur (FR).
 */

type SpotType = 'crag' | 'boulder' | 'indoor' | 'shop';
const TYPES: { type: SpotType; iconStyle: string; title: string; desc: string }[] = [
  { type: 'crag', iconStyle: 'background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.3)', title: 'Falaise', desc: 'Escalade sur paroi naturelle en extérieur' },
  { type: 'boulder', iconStyle: 'background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.20)', title: 'Bloc', desc: 'Bloc de rocher, escalade sans corde' },
  { type: 'indoor', iconStyle: 'background:rgba(100,130,200,.12);border:1px solid rgba(100,130,200,.20)', title: 'Salle indoor', desc: 'Structure artificielle d\'escalade' },
  { type: 'shop', iconStyle: 'background:rgba(212,160,48,.10);border:1px solid rgba(212,160,48,.18)', title: 'Magasin', desc: 'Magasin d\'escalade, équipement' },
];

const FIELD = 'border-radius:16px;overflow:hidden';
const FIELD_LABEL = 'padding:12px 16px 2px;font-size:11px;font-weight:600;color:rgba(212,160,48,.8);letter-spacing:.3px';
const FIELD_INPUT = 'padding:0 16px 12px;font-size:16px;color:#f0ece6;background:transparent;border:none;outline:none;width:100%;font-family:inherit;box-sizing:border-box';

export function ProposePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuthStore();
  const [type, setType] = useState<SpotType>('crag');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [queued, setQueued] = useState(false);

  function geolocate() {
    if (!navigator.geolocation) { setError('Géolocalisation indisponible.'); return; }
    setGeoLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setGeoLoading(false); },
      () => { setError('Impossible de récupérer ta position.'); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (name.trim().length < 1) { setError('Donne un nom au spot.'); return; }
    const latN = parseFloat(lat), lngN = parseFloat(lng);
    if (!Number.isFinite(latN) || latN < -90 || latN > 90 || !Number.isFinite(lngN) || lngN < -180 || lngN > 180) {
      setError('Place le spot (position GPS valide requise).'); return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<{ queued?: boolean }>('/api/spots', {
        method: 'POST', auth: true,
        queueable: 'spot',
        body: JSON.stringify({
          name: name.trim(), type,
          location: { type: 'Point', coordinates: [lngN, latN] },
          niveau_min: min.trim() || null, niveau_max: max.trim() || null,
          description: description.trim() || null,
        }),
      });
      if (result && result.queued) {
        setQueued(true);
      }
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        try { const b = JSON.parse(err.body); setError(b.detail || b.error || 'Erreur lors de l\'envoi.'); }
        catch { setError('Erreur lors de l\'envoi.'); }
      } else setError('Erreur lors de l\'envoi.');
    } finally { setLoading(false); }
  }

  if (!isAuthenticated) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><Pressable className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Retour</Pressable><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Proposer un spot</span></div></NavBar>
        <div style={css('padding:60px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Connecte-toi pour proposer un spot.</div>
          <Pressable onClick={() => navigate('/redesign/login?next=/redesign/propose')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Se connecter</Pressable>
        </div>
      </PageFrame>
    );
  }

  if (done) {
    return (
      <PageFrame>
        <NavBar><div className="nbi"><span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Proposer un spot</span></div></NavBar>
        <div style={css('padding:50px 28px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center')}>
          <div style={css(`width:72px;height:72px;border-radius:50%;${queued ? 'background:rgba(212,160,48,.15);border:1.5px solid rgba(212,160,48,.3);color:#D4A030' : 'background:rgba(80,160,80,.15);border:1.5px solid rgba(80,160,80,.3);color:#88D088'};display:flex;align-items:center;justify-content:center`)}>
            {queued
              ? <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 2v10m0 0 3-3m-3 3-3-3M4.93 19a10 10 0 1 0 14.14 0" /></svg>
              : <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>
            }
          </div>
          <div style={css('font-size:20px;font-weight:800;color:#f0ece6')}>
            {queued ? 'Spot enregistré hors ligne' : (isAdmin ? 'Spot publié !' : 'Spot proposé !')}
          </div>
          <div style={css('font-size:14px;color:rgba(240,236,230,.55);line-height:1.5;max-width:280px')}>
            {queued
              ? 'Il sera envoyé automatiquement dès le retour du réseau.'
              : (isAdmin ? 'Ton spot est en ligne immédiatement.' : 'Merci ! Ta proposition sera examinée par un modérateur avant publication.')}
          </div>
          {!queued && (
            <Pressable onClick={() => navigate('/redesign/my-spots?tab=contrib')} style={css('padding:12px 22px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28)')}>Voir mes contributions</Pressable>
          )}
          {queued && (
            <Pressable onClick={() => navigate('/redesign/offline')} style={css('padding:12px 22px;border-radius:9999px;background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.25);color:#D4A030;font-weight:700;font-size:14px;cursor:pointer')}>Voir la file de synchro</Pressable>
          )}
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <Pressable className="back-btn" onClick={() => navigate(-1)}><BackChevronIcon width={9} height={15} /> Annuler</Pressable>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Proposer un spot</span>
        </div>
      </NavBar>

      <form onSubmit={handleSubmit}>
        <SectionHeader small style={css('padding-top:4px')}>Quel type de spot ?</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
          {TYPES.map((t) => (
            <TypeCard key={t.type} selected={type === t.type} onClick={() => setType(t.type)} iconStyle={t.iconStyle} title={t.title} desc={t.desc} />
          ))}
        </div>

        <SectionHeader small>Informations générales</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:12px')}>
          <GlassCard style={css(FIELD)}>
            <div style={css('position:relative;z-index:2')}>
              <div style={css(FIELD_LABEL)}>Nom du spot *</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Falaise des Trois Pics" style={css(FIELD_INPUT)} />
            </div>
          </GlassCard>
          <GlassCard style={css(FIELD)}>
            <div style={css('position:relative;z-index:2')}>
              <div style={css(FIELD_LABEL)}>Description</div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décris le spot…" rows={3} style={css(`${FIELD_INPUT};resize:none;min-height:60px`)} />
            </div>
          </GlassCard>
          <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
            <GlassCard style={css(FIELD)}><div style={css('position:relative;z-index:2')}><div style={css(FIELD_LABEL)}>Grade min</div><input value={min} onChange={(e) => setMin(e.target.value)} placeholder="4a" style={css(FIELD_INPUT)} /></div></GlassCard>
            <GlassCard style={css(FIELD)}><div style={css('position:relative;z-index:2')}><div style={css(FIELD_LABEL)}>Grade max</div><input value={max} onChange={(e) => setMax(e.target.value)} placeholder="8b" style={css(FIELD_INPUT)} /></div></GlassCard>
          </div>
        </div>

        <SectionHeader small>Localisation *</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:12px')}>
          <Pressable onClick={geolocate} style={css(`border-radius:14px;padding:13px;text-align:center;font-size:14px;font-weight:600;cursor:pointer;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.22);color:#D4A030;display:flex;align-items:center;justify-content:center;gap:8px${geoLoading ? ';opacity:.6' : ''}`)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            {geoLoading ? 'Localisation…' : 'Utiliser ma position actuelle'}
          </Pressable>
          <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
            <GlassCard style={css(FIELD)}><div style={css('position:relative;z-index:2')}><div style={css(FIELD_LABEL)}>Latitude</div><input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="43.800" style={css(FIELD_INPUT)} /></div></GlassCard>
            <GlassCard style={css(FIELD)}><div style={css('position:relative;z-index:2')}><div style={css(FIELD_LABEL)}>Longitude</div><input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="6.500" style={css(FIELD_INPUT)} /></div></GlassCard>
          </div>
        </div>

        <div style={css('padding:20px')}>
          {error && <div style={css('font-size:13px;color:#E88080;background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);border-radius:12px;padding:10px 14px;margin-bottom:12px')}>{error}</div>}
          <button type="submit" disabled={loading} style={css(`padding:16px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.90),rgba(232,184,75,.95));border:1px solid rgba(255,255,255,.25);text-align:center;font-size:16px;font-weight:700;color:#1a0f05;cursor:pointer;box-shadow:0 4px 20px rgba(212,160,48,.35),inset 0 1px 0 rgba(255,255,255,.25);width:100%;font-family:inherit${loading ? ';opacity:.6' : ''}`)}>
            {loading ? 'Envoi…' : isAdmin ? 'Publier le spot' : 'Proposer le spot'}
          </button>
        </div>
      </form>
    </PageFrame>
  );
}
