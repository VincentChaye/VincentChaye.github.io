import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { normalizeSpotType } from '../lib/spotType';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { GlassCard, IconButton, SectionHeader, Tag, type TagVariant } from '../components/primitives';
import { RouteRow } from '../components/RouteRow';
import { ReviewCard } from '../components/ReviewCard';
import { BackChevronIcon, ShareUploadIcon, MapPinIcon } from '../lib/icons';

/**
 * PILOT DU SWAP — Spot Détail (design Liquid Glass) câblé aux vraies données.
 *
 * Route ADDITIVE `/redesign/spot/:id` : la page live `/spot/:id` (SpotPage) reste intacte.
 * Réutilise les MOTIFS du redesign (GlassCard/RouteRow/ReviewCard/NavBar), pas l'écran `.sc`
 * couplé à la vitrine. Le cadre téléphone + fond rocheux (`.bgs`) sont reproduits ici car le
 * `backdrop-filter` du glass se calcule contre ce fond (sinon il s'aplatit).
 *
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
const STAT_LABEL = 'font-size:10px;color:rgba(240,236,230,.45);text-transform:uppercase;letter-spacing:.5px';
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

export function SpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [spot, setSpot] = useState<PilotSpot | null>(null);
  const [routes, setRoutes] = useState<PilotRoute[]>([]);
  const [reviews, setReviews] = useState<PilotReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(false);
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
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiFetch<PilotRoute[]>(`/api/climbing-routes/spot/${id}`).then((r) => setRoutes(Array.isArray(r) ? r : [])).catch(() => setRoutes([]));
    apiFetch<{ items: PilotReview[] } | PilotReview[]>(`/api/reviews/spot/${id}`)
      .then((r) => setReviews(Array.isArray(r) ? r : (r?.items ?? []))).catch(() => setReviews([]));
  }, [id]);

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

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}>
            <BackChevronIcon width={9} height={15} /> Retour
          </div>
          <div className="na">
            <IconButton style={css('cursor:pointer')} onClick={handleShare}>
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
              {spot.description || <span style={css('color:rgba(240,236,230,.4);font-style:italic')}>Pas encore de description pour ce spot.</span>}
            </div>
          </GlassCard>
        </div>

        {/* Voies */}
        <SectionHeader small>Voies d'escalade</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:8px')}>
          {routes.length === 0 ? (
            <GlassCard style={css('border-radius:16px;padding:16px;font-size:13px;color:rgba(240,236,230,.45);text-align:center')}>Aucune voie renseignée pour le moment.</GlassCard>
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

        {/* Avis */}
        <SectionHeader small>Avis récents</SectionHeader>
        <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
          {reviews.length === 0 ? (
            <GlassCard style={css('border-radius:16px;padding:16px;font-size:13px;color:rgba(240,236,230,.45);text-align:center')}>Aucun avis pour le moment.</GlassCard>
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
    </PageFrame>
  );
}
