import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { normalizeSpotType } from '../lib/spotType';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { GlassCard, IconButton, SectionHeader, Tag, type TagVariant } from '../components/primitives';
import { RouteRow } from '../components/RouteRow';
import { ReviewCard } from '../components/ReviewCard';
import { BackChevronIcon, ShareUploadIcon, MapPinIcon, DownloadIcon } from '../lib/icons';
import { FilterPill } from '../components/FilterPill';
import { isOfflineEnabled } from '@/offline/env';
import { useAuthStore } from '@/stores/auth.store';
import { formatBytes } from '@/lib/format';

/**
 * PILOT DU SWAP — Spot Détail (design Liquid Glass) câblé aux vraies données.
 *
 * Route ADDITIVE `/redesign/spot/:id` : la page live `/spot/:id` (SpotPage) reste intacte.
 * Réutilise les MOTIFS du redesign (GlassCard/RouteRow/ReviewCard/NavBar), pas l'écran `.sc`
 * couplé à la vitrine. Le cadre téléphone + fond rocheux (`.bgs`) sont reproduits ici car le
 * `backdrop-filter` du glass se calcule contre ce fond (sinon il s'aplatit).
 *
 * Phase 2 : fallbacks offline (spot + voies depuis IndexedDB) + bouton téléchargement de zone.
 * Périmètre pilote : LECTURE + retour + Itinéraire GPS. Différés (à brancher ensuite) :
 * bookmark, ajout/édition de voie & d'avis, logbook, photos, édition spot, suppression admin.
 * i18n : textes en dur (FR), comme la maquette — à passer en `t(...)` au moment du vrai swap.
 */

interface PilotSpot {
  id: string;
  name: string;
  type: 'crag' | 'boulder' | 'indoor' | 'shop';
  lat: number;
  lng: number;
  orientation: string | null;
  niveau_min: string | null;
  niveau_max: string | null;
  description: string | null;
  rock: string | null;
  avgRating?: number;
  reviewCount?: number;
}
interface PilotRoute { _id: string; name: string; grade?: string; style?: string; height?: number; bolts?: number; }
interface PilotReview { _id: string; username: string; rating: number; comment?: string; createdAt: string; }

const TYPE_LABEL: Record<PilotSpot['type'], string> = { crag: 'Falaise', boulder: 'Bloc', indoor: 'Salle', shop: 'Magasin' };
const TYPE_TAG: Record<PilotSpot['type'], TagVariant> = { crag: 'a', boulder: 'g', indoor: 'b', shop: 'a' };

const STAT_CELL = 'text-align:center;padding:14px 8px;position:relative';
const STAT_VALUE = 'font-size:18px;font-weight:800;color:#f0ece6;margin-bottom:2px';
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.6);text-transform:uppercase;letter-spacing:.5px';
const STAT_DIVIDER = 'position:absolute;right:0;top:20%;bottom:20%;width:1px;background:rgba(212,160,48,.15)';

/** Couleur du badge de cotation selon la bande (1er caractère de la cote). */
function gradeColors(grade?: string): { bg: string; border: string; color: string } {
  const g = (grade ?? '').toLowerCase().trim();
  if (/^[345]/.test(g)) return { bg: 'rgba(100,180,80,.15)', border: 'rgba(100,180,80,.25)', color: '#88D880' };
  if (g.startsWith('6')) return { bg: 'rgba(212,160,48,.12)', border: 'rgba(212,160,48,.22)', color: '#D4A030' };
  if (g.startsWith('7')) return { bg: 'rgba(200,120,60,.14)', border: 'rgba(200,120,60,.25)', color: '#E8924A' };
  if (/^[89]/.test(g)) return { bg: 'rgba(180,80,80,.14)', border: 'rgba(180,80,80,.25)', color: '#E88080' };
  return { bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.10)', color: 'rgba(240,236,230,.6)' };
}

function routeMeta(r: PilotRoute): string {
  return [r.height ? `${r.height}m` : null, r.bolts != null ? `${r.bolts} pts` : null, r.style].filter(Boolean).join(' · ');
}

// formatBytes importé depuis @/lib/format

export function SpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [spot, setSpot] = useState<PilotSpot | null>(null);
  const [routes, setRoutes] = useState<PilotRoute[]>([]);
  const [reviews, setReviews] = useState<PilotReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* ---------- Feuille de téléchargement ---------- */
  const [dlOpen, setDlOpen] = useState(false);

  /* ---------- Feuille d'ascension (logbook) ---------- */
  type LogStyle = 'onsight' | 'flash' | 'redpoint' | 'repeat';
  const LOG_STYLES: { value: LogStyle; label: string }[] = [
    { value: 'onsight', label: 'Onsight' },
    { value: 'flash', label: 'Flash' },
    { value: 'redpoint', label: 'Redpoint' },
    { value: 'repeat', label: 'Répétition' },
  ];
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const [logOpen, setLogOpen] = useState(false);
  const [logRouteId, setLogRouteId] = useState('');
  const [logGrade, setLogGrade] = useState('');
  const [logStyle, setLogStyle] = useState<LogStyle>('redpoint');
  const [logDate, setLogDate] = useState(todayStr());
  const [logNotes, setLogNotes] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logStatus, setLogStatus] = useState<'idle' | 'done' | 'queued' | 'error'>('idle');
  const [logError, setLogError] = useState('');
  const [dlRadius, setDlRadius] = useState<5 | 10 | 20>(10);
  const [dlCorridor, setDlCorridor] = useState(false);
  const [corridorFrom, setCorridorFrom] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState('');
  const [estimate, setEstimate] = useState<{ tileCount: number; estBytes: number; tooBig: boolean } | null>(null);
  const [dlProgress, setDlProgress] = useState<{ done: number; total: number } | null>(null);
  const [dlAbort, setDlAbort] = useState<AbortController | null>(null);
  const [dlStatus, setDlStatus] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
  const [dlError, setDlError] = useState('');

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(false);

    // Tentative API puis fallback IndexedDB
    apiFetch<Record<string, unknown>>(`/api/spots/${id}`)
      .then((p) => {
        if (!alive) return;
        if (!p) { setError(true); return; }
        const loc = p.location as { coordinates?: number[] } | undefined;
        const info = p.info_complementaires as { rock?: string } | null | undefined;
        setSpot({
          id: String(p._id ?? p.id ?? id),
          name: (p.name ?? 'Sans nom') as string,
          type: normalizeSpotType(p.type as string),
          lat: (loc?.coordinates?.[1] ?? p.lat) as number,
          lng: (loc?.coordinates?.[0] ?? p.lng) as number,
          orientation: (p.orientation ?? null) as string | null,
          niveau_min: (p.niveau_min ?? null) as string | null,
          niveau_max: (p.niveau_max ?? null) as string | null,
          description: (p.description ?? null) as string | null,
          rock: (info?.rock ?? null) as string | null,
          avgRating: p.avgRating as number | undefined,
          reviewCount: p.reviewCount as number | undefined,
        });
      })
      .catch(async () => {
        if (!alive) return;
        // Repli offline
        try {
          const { getSpotOffline } = await import('@/offline/spots');
          const cached = await getSpotOffline(id) as { geometry?: { coordinates?: number[] }; properties?: Record<string, unknown> } | null;
          if (!alive) return;
          if (cached) {
            const p = cached.properties ?? {};
            const coords = cached.geometry?.coordinates;
            setSpot({
              id: String(p._id ?? p.id ?? id),
              name: (p.name ?? 'Sans nom') as string,
              type: normalizeSpotType(p.type as string),
              lat: (coords?.[1] ?? p.lat) as number,
              lng: (coords?.[0] ?? p.lng) as number,
              orientation: (p.orientation ?? null) as string | null,
              niveau_min: (p.niveau_min ?? null) as string | null,
              niveau_max: (p.niveau_max ?? null) as string | null,
              description: (p.description ?? null) as string | null,
              rock: ((p.info_complementaires as { rock?: string } | null)?.rock ?? null) as string | null,
              avgRating: p.avgRating as number | undefined,
              reviewCount: p.reviewCount as number | undefined,
            });
          } else {
            setError(true);
          }
        } catch {
          if (alive) setError(true);
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // Voies : API puis fallback offline
    apiFetch<PilotRoute[]>(`/api/climbing-routes/spot/${id}`)
      .then((r) => setRoutes(Array.isArray(r) ? r : []))
      .catch(async () => {
        try {
          const { getRoutesOffline } = await import('@/offline/spots');
          const cached = await getRoutesOffline(id);
          setRoutes((cached ?? []) as PilotRoute[]);
        } catch {
          setRoutes([]);
        }
      });
    apiFetch<{ items: PilotReview[] } | PilotReview[]>(`/api/reviews/spot/${id}`)
      .then((r) => setReviews(Array.isArray(r) ? r : (r?.items ?? []))).catch(() => setReviews([]));
  }, [id]);

  /* Mise à jour de l'estimation quand les options changent */
  useEffect(() => {
    if (!dlOpen || !spot) return;
    import('@/offline/packs').then(({ estimatePackForOptions }) => {
      const est = estimatePackForOptions({
        spotId: spot.id,
        spotName: spot.name,
        center: [spot.lng, spot.lat],
        radiusKm: dlRadius,
        corridorFrom: dlCorridor && corridorFrom ? corridorFrom : undefined,
      });
      setEstimate(est);
    });
  }, [dlOpen, dlRadius, dlCorridor, corridorFrom, spot]);

  /* Toggle « inclure le trajet » → demande la géolocalisation */
  const handleCorridorToggle = () => {
    if (dlCorridor) {
      setDlCorridor(false);
      setCorridorFrom(null);
      setGeoError('');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCorridorFrom([pos.coords.longitude, pos.coords.latitude]);
        setDlCorridor(true);
        setGeoError('');
      },
      () => {
        setGeoError('Impossible d\'obtenir la position.');
        setDlCorridor(false);
      },
    );
  };

  const handleDownload = async () => {
    if (!spot) return;
    const ctrl = new AbortController();
    setDlAbort(ctrl);
    setDlStatus('downloading');
    setDlProgress({ done: 0, total: estimate?.tileCount ?? 0 });
    setDlError('');
    try {
      const { createPack } = await import('@/offline/packs');
      await createPack(
        {
          spotId: spot.id,
          spotName: spot.name,
          center: [spot.lng, spot.lat],
          radiusKm: dlRadius,
          corridorFrom: dlCorridor && corridorFrom ? corridorFrom : undefined,
        },
        (done, total) => setDlProgress({ done, total }),
        ctrl.signal,
      );
      setDlStatus('done');
    } catch (err) {
      if (ctrl.signal.aborted) {
        setDlStatus('idle');
      } else {
        setDlStatus('error');
        setDlError(
          err instanceof Error && err.message === 'PACK_TOO_BIG'
            ? 'Zone trop grande, réduis le rayon.'
            : 'Erreur lors du téléchargement.',
        );
      }
    } finally {
      setDlAbort(null);
    }
  };

  const handleCancel = () => {
    dlAbort?.abort();
  };

  /* Ouvre la feuille d'ascension avec les états remis à zéro */
  const openLogSheet = () => {
    setLogRouteId('');
    setLogGrade('');
    setLogStyle('redpoint');
    setLogDate(todayStr());
    setLogNotes('');
    setLogStatus('idle');
    setLogError('');
    setLogOpen(true);
  };

  /* Soumission de l'ascension */
  const handleLogSubmit = async () => {
    if (!spot) return;
    setLogLoading(true);
    setLogError('');
    try {
      const payload: Record<string, unknown> = {
        spotId: spot.id,
        style: logStyle,
        date: logDate,
      };
      // Ajoute seulement les champs renseignés
      if (logRouteId) {
        payload.routeId = logRouteId;
        const selected = routes.find((r) => r._id === logRouteId);
        const grade = logGrade || selected?.grade;
        if (grade) payload.grade = grade;
      } else if (logGrade) {
        payload.grade = logGrade;
      }
      if (logNotes.trim()) payload.notes = logNotes.trim();

      const result = await apiFetch<{ queued?: boolean }>('/api/logbook', {
        method: 'POST',
        auth: true,
        queueable: 'logbook',
        body: JSON.stringify(payload),
      });
      if (result && result.queued) {
        setLogStatus('queued');
      } else {
        setLogStatus('done');
      }
    } catch (err) {
      let msg = 'Erreur lors de l\'enregistrement.';
      if (err instanceof ApiError) {
        try { const b = JSON.parse(err.body) as Record<string, unknown>; msg = String(b.detail ?? b.error ?? msg); }
        catch { /* corps non-JSON */ }
      }
      setLogError(msg);
      setLogStatus('error');
    } finally {
      setLogLoading(false);
    }
  };

  if (loading) {
    return <PageFrame><div style={css('min-height:600px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.5);font-size:14px')}>Chargement…</div></PageFrame>;
  }
  if (error || !spot) {
    return (
      <PageFrame>
        <div style={css('min-height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px;text-align:center')}>
          <div style={css('font-size:15px;color:rgba(240,236,230,.6)')}>Spot introuvable.</div>
          <div onClick={() => navigate(-1)} style={css('padding:10px 18px;border-radius:9999px;background:rgba(212,160,48,.85);color:#1a0f05;font-weight:700;font-size:14px;cursor:pointer')}>Retour</div>
        </div>
      </PageFrame>
    );
  }

  const gradeText = spot.niveau_min || spot.niveau_max ? `${spot.niveau_min || '?'} → ${spot.niveau_max || '?'}` : null;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const reviewCount = spot.reviewCount ?? reviews.length;

  const handleShare = async () => {
    const url = `${window.location.origin}/ZoneDeGrimpe/spot/${spot.id}`;
    try {
      if (navigator.share) await navigator.share({ title: spot.name, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* annulé */ }
  };

  const offlineEnabled = isOfflineEnabled();

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}>
            <BackChevronIcon width={9} height={15} /> Retour
          </div>
          <div className="na" style={css('display:flex;align-items:center;gap:4px')}>
            {offlineEnabled && (
              <IconButton aria-label="Télécharger la zone" style={css('cursor:pointer')} onClick={() => { setDlStatus('idle'); setDlOpen(true); }}>
                <DownloadIcon width={16} height={16} />
              </IconButton>
            )}
            <IconButton aria-label="Partager" style={css('cursor:pointer')} onClick={handleShare}>
              <ShareUploadIcon width={16} height={16} />
            </IconButton>
          </div>
        </div>
      </NavBar>

      <div style={css('position:relative')}>
        {/* Hero */}
        <div style={css('height:190px;background:linear-gradient(160deg,rgba(40,70,30,.9),rgba(20,45,15,.95)),repeating-linear-gradient(45deg,rgba(80,120,50,.2) 0,rgba(80,120,50,.2) 2px,transparent 2px,transparent 10px);display:flex;align-items:flex-end;padding:16px 20px 20px;position:relative')}>
          <div>
            <div style={css('display:flex;gap:6px;margin-bottom:10px')}>
              <Tag variant={TYPE_TAG[spot.type]}>{TYPE_LABEL[spot.type]}</Tag>
              {gradeText && <Tag variant="g">{gradeText}</Tag>}
            </div>
            <div style={css('font-size:22px;font-weight:800;letter-spacing:-.6px;color:#f0ece6;margin-bottom:4px')}>{spot.name}</div>
            <div style={css('font-size:13px;color:rgba(240,236,230,.60);display:flex;align-items:center;gap:5px')}>
              <MapPinIcon width={12} height={12} />
              {spot.rock ? spot.rock : `${spot.lat?.toFixed(3)}, ${spot.lng?.toFixed(3)}`}
            </div>
          </div>
        </div>

        {/* Stats — pas de "Distance" inventée : Voies / Note / Orientation / Avis */}
        <GlassCard style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:16px 20px;border-radius:20px;overflow:hidden')}>
          <div style={css(STAT_CELL)}>
            <div style={css(STAT_VALUE)}>{routes.length}</div>
            <div style={css(STAT_LABEL)}>Voies</div>
            <div style={css(STAT_DIVIDER)} />
          </div>
          <div style={css(STAT_CELL)}>
            <div style={css(STAT_VALUE)}>{spot.avgRating && spot.avgRating > 0 ? spot.avgRating.toFixed(1) : '—'}</div>
            <div style={css(STAT_LABEL)}>Note</div>
            <div style={css(STAT_DIVIDER)} />
          </div>
          <div style={css(STAT_CELL)}>
            <div style={css(STAT_VALUE)}>{spot.orientation || '—'}</div>
            <div style={css(STAT_LABEL)}>Orientation</div>
            <div style={css(STAT_DIVIDER)} />
          </div>
          <div style={css('text-align:center;padding:14px 8px')}>
            <div style={css(STAT_VALUE)}>{reviewCount}</div>
            <div style={css(STAT_LABEL)}>Avis</div>
          </div>
        </GlassCard>

        {/* Description */}
        <div style={css('padding:0 20px')}>
          <GlassCard style={css('border-radius:20px;padding:18px')}>
            <div style={css('position:relative;z-index:2;font-size:14px;line-height:1.6;color:rgba(240,236,230,.70)')}>
              {spot.description || <span style={css('color:rgba(240,236,230,.6);font-style:italic')}>Pas encore de description pour ce spot.</span>}
            </div>
          </GlassCard>
        </div>

        {/* Voies */}
        <SectionHeader small>Voies d'escalade</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:8px')}>
          {routes.length === 0 ? (
            <GlassCard style={css('border-radius:16px;padding:16px;font-size:13px;color:rgba(240,236,230,.6);text-align:center')}>Aucune voie renseignée pour le moment.</GlassCard>
          ) : (
            routes.map((r) => {
              const c = gradeColors(r.grade);
              return (
                <RouteRow
                  key={r._id}
                  grade={r.grade || '—'}
                  gradeBg={c.bg}
                  gradeBorder={c.border}
                  gradeColor={c.color}
                  name={r.name}
                  meta={routeMeta(r) || '—'}
                  tag={null}
                />
              );
            })
          )}
        </div>

        {/* Bouton « Cocher une ascension » — visible uniquement si authentifié */}
        {isAuthenticated && (
          <div style={css('padding:8px 20px 4px')}>
            <div
              onClick={openLogSheet}
              style={css('display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:rgba(240,236,230,.75);font-size:14px;font-weight:600;cursor:pointer')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
              Cocher une ascension
            </div>
          </div>
        )}

        {/* Avis */}
        <SectionHeader small>Avis récents</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
          {reviews.length === 0 ? (
            <GlassCard style={css('border-radius:16px;padding:16px;font-size:13px;color:rgba(240,236,230,.6);text-align:center')}>Aucun avis pour le moment.</GlassCard>
          ) : (
            reviews.map((rv) => (
              <ReviewCard
                key={rv._id}
                avatarBg="rgba(212,160,48,.18)"
                name={rv.username}
                time={new Date(rv.createdAt).toLocaleDateString('fr-FR')}
                text={rv.comment || `Note : ${rv.rating}/5`}
              />
            ))
          )}
        </div>

        {/* CTA — Itinéraire GPS (le reste du périmètre est différé) */}
        <div style={css('padding:20px')}>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={css('display:block;text-decoration:none;padding:14px;border-radius:9999px;font-size:14px;font-weight:700;text-align:center;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid rgba(255,255,255,.26);color:#1a0f05;cursor:pointer;box-shadow:0 4px 18px rgba(212,160,48,.28),inset 0 1px 0 rgba(255,255,255,.28)')}
          >
            Itinéraire GPS
          </a>
        </div>
      </div>

      {/* ============================================================
          Feuille d'ascension (logbook)
          ============================================================ */}
      <>
        {/* Overlay fond */}
        {logOpen && (
          <div
            onClick={() => { if (!logLoading) setLogOpen(false); }}
            style={css('position:fixed;inset:0;z-index:49;background:rgba(0,0,0,0.5)')}
          />
        )}

        {/* Feuille bottom */}
        <div style={css(`position:fixed;bottom:0;left:0;right:0;z-index:50;background:rgba(12,8,4,0.97);backdrop-filter:blur(24px);border-radius:20px 20px 0 0;padding:24px 20px 32px;transition:transform .3s ease;transform:${logOpen ? 'translateY(0)' : 'translateY(100%)'};pointer-events:${logOpen ? 'auto' : 'none'};max-height:85vh;overflow-y:auto`)}>
          {/* Drag handle */}
          <div style={css('width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.3);margin:0 auto 20px')} />

          <div style={css('font-size:17px;font-weight:700;color:#f0ece6;margin-bottom:4px')}>Cocher une ascension</div>
          <div style={css('font-size:13px;color:rgba(240,236,230,.5);margin-bottom:20px')}>{spot?.name}</div>

          {/* Résultat succès */}
          {(logStatus === 'done' || logStatus === 'queued') && (
            <div style={css(`margin-bottom:16px;padding:12px 14px;border-radius:12px;${logStatus === 'queued' ? 'background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.25);color:#D4A030' : 'background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.25);color:#88D880'};font-size:14px;font-weight:600;text-align:center`)}>
              {logStatus === 'queued' ? 'Enregistrée hors ligne — synchro au retour du réseau' : '✓ Ascension enregistrée'}
            </div>
          )}

          {/* Formulaire — masqué après succès */}
          {logStatus !== 'done' && logStatus !== 'queued' && (
            <>
              {/* Voie (optionnel) */}
              {routes.length > 0 && (
                <div style={css('margin-bottom:16px')}>
                  <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px')}>Voie (optionnel)</div>
                  <GlassCard style={css('border-radius:12px;overflow:hidden')}>
                    <div style={css('position:relative;z-index:2')}>
                      <select
                        value={logRouteId}
                        onChange={(e) => {
                          setLogRouteId(e.target.value);
                          const r = routes.find((r) => r._id === e.target.value);
                          if (r?.grade) setLogGrade(r.grade);
                          else setLogGrade('');
                        }}
                        style={css('width:100%;padding:12px 16px;background:transparent;border:none;outline:none;font-size:15px;color:#f0ece6;font-family:inherit;appearance:none;-webkit-appearance:none;cursor:pointer')}
                      >
                        <option value="" style={css('background:#1a0f05;color:#f0ece6')}>— Sans voie précise —</option>
                        {routes.map((r) => (
                          <option key={r._id} value={r._id} style={css('background:#1a0f05;color:#f0ece6')}>
                            {r.name}{r.grade ? ` (${r.grade})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* Style d'ascension */}
              <div style={css('margin-bottom:16px')}>
                <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px')}>Style</div>
                <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
                  {LOG_STYLES.map((s) => (
                    <FilterPill key={s.value} active={logStyle === s.value} onClick={() => setLogStyle(s.value)}>
                      {s.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div style={css('margin-bottom:16px')}>
                <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px')}>Date</div>
                <GlassCard style={css('border-radius:12px;overflow:hidden')}>
                  <div style={css('position:relative;z-index:2')}>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      style={css('width:100%;padding:12px 16px;background:transparent;border:none;outline:none;font-size:15px;color:#f0ece6;font-family:inherit;box-sizing:border-box;appearance:none;-webkit-appearance:none')}
                    />
                  </div>
                </GlassCard>
              </div>

              {/* Notes (optionnel) */}
              <div style={css('margin-bottom:20px')}>
                <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px')}>Notes (optionnel)</div>
                <GlassCard style={css('border-radius:12px;overflow:hidden')}>
                  <div style={css('position:relative;z-index:2')}>
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Conditions, impressions…"
                      rows={2}
                      style={css('width:100%;padding:12px 16px;background:transparent;border:none;outline:none;font-size:15px;color:#f0ece6;font-family:inherit;resize:none;box-sizing:border-box')}
                    />
                  </div>
                </GlassCard>
              </div>

              {/* Erreur */}
              {logStatus === 'error' && logError && (
                <div style={css('margin-bottom:12px;font-size:13px;color:#E88080;text-align:center')}>{logError}</div>
              )}

              {/* Bouton Enregistrer */}
              <div
                onClick={logLoading ? undefined : handleLogSubmit}
                style={css(`width:100%;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-align:center;box-sizing:border-box;${logLoading ? 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.35);cursor:default' : 'background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;cursor:pointer'}`)}>
                {logLoading ? 'Enregistrement…' : 'Enregistrer'}
              </div>
            </>
          )}

          {/* Bouton fermer (après succès) */}
          {(logStatus === 'done' || logStatus === 'queued') && (
            <div
              onClick={() => setLogOpen(false)}
              style={css('width:100%;padding:14px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(240,236,230,.7);font-weight:700;font-size:15px;text-align:center;cursor:pointer;box-sizing:border-box')}>
              Fermer
            </div>
          )}
        </div>
      </>

      {/* ============================================================
          Feuille de téléchargement hors-ligne
          ============================================================ */}
      {offlineEnabled && (
        <>
          {/* Overlay fond */}
          {dlOpen && (
            <div
              onClick={() => { if (dlStatus !== 'downloading') setDlOpen(false); }}
              style={css('position:fixed;inset:0;z-index:49;background:rgba(0,0,0,0.5)')}
            />
          )}

          {/* Feuille bottom */}
          <div style={css(`position:fixed;bottom:0;left:0;right:0;z-index:50;background:rgba(12,8,4,0.97);backdrop-filter:blur(24px);border-radius:20px 20px 0 0;padding:24px 20px 32px;transition:transform .3s ease;transform:${dlOpen ? 'translateY(0)' : 'translateY(100%)'};pointer-events:${dlOpen ? 'auto' : 'none'};max-height:80vh;overflow-y:auto`)}>
            {/* Drag handle */}
            <div style={css('width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.3);margin:0 auto 20px')} />

            <div style={css('font-size:17px;font-weight:700;color:#f0ece6;margin-bottom:4px')}>Télécharger la zone</div>
            <div style={css('font-size:13px;color:rgba(240,236,230,.5);margin-bottom:20px')}>{spot.name}</div>

            {/* Choix du rayon */}
            <div style={css('margin-bottom:20px')}>
              <div style={css('font-size:12px;font-weight:600;color:rgba(240,236,230,.5);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px')}>Rayon</div>
              <div style={css('display:flex;gap:8px')}>
                {([5, 10, 20] as const).map((r) => (
                  <FilterPill key={r} active={dlRadius === r} onClick={() => setDlRadius(r)}>
                    {r} km
                  </FilterPill>
                ))}
              </div>
            </div>

            {/* Toggle couloir */}
            <div style={css('margin-bottom:20px')}>
              <div
                onClick={dlStatus === 'downloading' ? undefined : handleCorridorToggle}
                style={css(`display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);cursor:${dlStatus === 'downloading' ? 'default' : 'pointer'}`)}>
                <div style={css(`width:20px;height:20px;border-radius:6px;border:2px solid ${dlCorridor ? '#D4A030' : 'rgba(255,255,255,.3)'};background:${dlCorridor ? 'rgba(212,160,48,.2)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s`)}>
                  {dlCorridor && <div style={css('width:8px;height:8px;border-radius:2px;background:#D4A030')} />}
                </div>
                <div style={css('flex:1')}>
                  <div style={css('font-size:14px;font-weight:600;color:#f0ece6')}>Inclure le trajet depuis ma position</div>
                  <div style={css('font-size:12px;color:rgba(240,236,230,.5);margin-top:2px')}>Télécharge aussi les tuiles jusqu'à toi</div>
                </div>
              </div>
              {geoError && (
                <div style={css('margin-top:8px;font-size:12px;color:#E88080;padding-left:4px')}>{geoError}</div>
              )}
            </div>

            {/* Estimation */}
            {estimate && (
              <div style={css(`margin-bottom:20px;padding:12px 14px;border-radius:12px;background:${estimate.tooBig ? 'rgba(180,80,80,.12)' : 'rgba(255,255,255,.05)'};border:1px solid ${estimate.tooBig ? 'rgba(180,80,80,.25)' : 'rgba(255,255,255,.10)'}`)}>
                {estimate.tooBig ? (
                  <div style={css('font-size:13px;color:#E88080;font-weight:600')}>
                    Zone trop grande — réduis le rayon ({estimate.tileCount.toLocaleString('fr-FR')} tuiles)
                  </div>
                ) : (
                  <div style={css('font-size:13px;color:rgba(240,236,230,.7)')}>
                    ~{estimate.tileCount.toLocaleString('fr-FR')} tuiles · ~{formatBytes(estimate.estBytes)}
                  </div>
                )}
              </div>
            )}

            {/* Barre de progression */}
            {dlStatus === 'downloading' && dlProgress && (
              <div style={css('margin-bottom:16px')}>
                <div style={css('display:flex;justify-content:space-between;font-size:12px;color:rgba(240,236,230,.6);margin-bottom:6px')}>
                  <span>Téléchargement…</span>
                  <span>{dlProgress.done} / {dlProgress.total}</span>
                </div>
                <div style={css('height:4px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden')}>
                  <div style={css(`height:100%;border-radius:2px;background:#D4A030;transition:width .3s;width:${dlProgress.total > 0 ? Math.round(dlProgress.done / dlProgress.total * 100) : 0}%`)} />
                </div>
              </div>
            )}

            {/* Message succès */}
            {dlStatus === 'done' && (
              <div style={css('margin-bottom:16px;padding:12px 14px;border-radius:12px;background:rgba(80,160,80,.12);border:1px solid rgba(80,160,80,.25);font-size:14px;font-weight:600;color:#88D880;text-align:center')}>
                Zone disponible hors ligne
              </div>
            )}

            {/* Message erreur */}
            {dlStatus === 'error' && dlError && (
              <div style={css('margin-bottom:16px;font-size:13px;color:#E88080;text-align:center')}>{dlError}</div>
            )}

            {/* Boutons action */}
            {dlStatus === 'downloading' ? (
              <div
                onClick={handleCancel}
                style={css('width:100%;padding:14px;border-radius:12px;background:rgba(200,80,80,.18);border:1px solid rgba(200,80,80,.3);color:#E88080;font-weight:700;font-size:15px;text-align:center;cursor:pointer;box-sizing:border-box')}>
                Annuler
              </div>
            ) : dlStatus === 'done' ? (
              <div
                onClick={() => setDlOpen(false)}
                style={css('width:100%;padding:14px;border-radius:12px;background:rgba(80,160,80,.18);border:1px solid rgba(80,160,80,.3);color:#88D880;font-weight:700;font-size:15px;text-align:center;cursor:pointer;box-sizing:border-box')}>
                Fermer
              </div>
            ) : (
              <div
                onClick={(!estimate || estimate.tooBig) ? undefined : handleDownload}
                style={css(`width:100%;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-align:center;box-sizing:border-box;${(!estimate || estimate.tooBig) ? 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.35);cursor:not-allowed' : 'background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;cursor:pointer'}`)}>
                Télécharger
              </div>
            )}
          </div>
        </>
      )}
    </PageFrame>
  );
}
