import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { IconButton, Pressable, SectionHeader } from '../components/primitives';
import { StatsGrid } from '../components/StatsGrid';
import { ListRow } from '../components/ListRow';
import { FeatureCard } from '../components/FeatureCard';
import { BellIcon, SearchIcon, MapPinIcon, UsersIcon, BookOpenIcon, ActivityIcon, LayersIcon, ShieldIcon, InfoIcon } from '../lib/icons';

/**
 * SWAP — Accueil (design Liquid Glass) câblé aux vraies données (PUBLIC).
 * Route additive `/redesign/home`. Compteurs réels `/api/spots/count` + `/api/users/count`.
 * Navigation vers les routes redesign. i18n en dur (FR).
 */

export function HomePage() {
  const navigate = useNavigate();
  const [spotCount, setSpotCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ count: number }>('/api/spots/count').then((d) => setSpotCount(d?.count ?? null)).catch(() => {});
    apiFetch<{ count: number }>('/api/users/count').then((d) => setUserCount(d?.count ?? null)).catch(() => {});
  }, []);

  const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('fr-FR'));

  return (
    <PageFrame tab="accueil">
      <NavBar style={css('height:calc(100px + var(--safe-top))')}>
        <div style={css('position:absolute;top:calc(62px + var(--safe-top));right:20px')}>
          <IconButton aria-label="Notifications" style={css('cursor:pointer')} onClick={() => navigate('/redesign/notifications')}>
            <BellIcon width={16} height={16} />
          </IconButton>
        </div>
      </NavBar>

      {/* Hero */}
      <div style={css('padding:4px 20px 0;text-align:center')}>
        <h1 style={css('font-size:38px;font-weight:800;line-height:1.05;letter-spacing:-1.5px;margin-bottom:14px')}>
          Trouve ta<br />
          <span style={css('background:linear-gradient(130deg,#D4A030,#F5CC6E 55%,#D4A030);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text')}>prochaine voie</span>
        </h1>
        <p style={css('font-size:15px;line-height:1.55;color:rgba(240,236,230,.55);margin-bottom:28px;padding:0 8px')}>
          Explore les spots, découvre de nouvelles falaises et partage tes meilleurs blocs.
        </p>
        <Pressable onClick={() => navigate('/redesign/map')} className="morph-btn" style={css('display:inline-flex;align-items:center;gap:9px;padding:15px 28px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.90),rgba(232,184,75,.95));border:1px solid rgba(255,255,255,.28);color:#1a0f05;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(212,160,48,.40),inset 0 1px 0 rgba(255,255,255,.30);position:relative;overflow:hidden')}>
          <SearchIcon width={16} height={16} strokeWidth={2.5} />
          Explorer la carte
        </Pressable>
        <div style={css('width:62px;height:62px;border-radius:18px;background:rgba(42,110,60,.18);backdrop-filter:blur(20px);border:1px solid rgba(212,160,48,.20);display:flex;align-items:center;justify-content:center;font-size:28px;margin:28px auto 0;box-shadow:0 0 28px rgba(212,160,48,.18)')} />
      </div>

      {/* Stats — réelles */}
      <StatsGrid
        items={[
          { icon: <MapPinIcon width={18} height={18} strokeWidth={1.8} />, value: fmt(spotCount), label: 'Spots' },
          { icon: <UsersIcon width={18} height={18} strokeWidth={1.8} />, value: fmt(userCount), label: 'Grimpeurs' },
          { value: 'FR', label: 'France' },
        ]}
      />

      {/* Ton espace */}
      <SectionHeader>Ton espace</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        <ListRow icon={<BookOpenIcon width={18} height={18} />} title="Carnet" subtitle="Ton carnet d'ascensions" onClick={() => navigate('/redesign/logbook')} />
        <ListRow icon={<ActivityIcon width={18} height={18} />} title="Social" subtitle="Activité de la communauté" onClick={() => navigate('/redesign/feed')} />
        <ListRow icon={<MapPinIcon width={18} height={18} />} title="Mes Spots" subtitle="Favoris & propositions" onClick={() => navigate('/redesign/my-spots')} />
      </div>

      {/* Features */}
      <SectionHeader>Fonctionnalités</SectionHeader>
      <div style={css('padding:0 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        <FeatureCard icon={<LayersIcon width={20} height={20} strokeWidth={1.8} />} title="Carte" desc={`${fmt(spotCount)} spots filtrables`} onClick={() => navigate('/redesign/map')} />
        <FeatureCard icon={<ShieldIcon width={20} height={20} strokeWidth={1.8} />} title="Fiches" desc="Voies, GPS, avis" onClick={() => navigate('/redesign/search')} />
        <FeatureCard icon={<UsersIcon width={20} height={20} strokeWidth={1.8} />} title="Communauté" desc="Propose et enrichis la base communautaire." fullWidth onClick={() => navigate('/redesign/propose')} />
      </div>

      {/* Bandeau « en développement » */}
      <div style={css('margin:24px 20px 0;border-radius:16px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;background:rgba(212,160,48,.07);border:1px solid rgba(212,160,48,.18)')}>
        <div style={css('color:#D4A030;flex-shrink:0;margin-top:1px')}><InfoIcon width={16} height={16} /></div>
        <div>
          <div style={css('font-size:13px;font-weight:600;color:#E8B84B;margin-bottom:3px')}>Nouveau design</div>
          <div style={css('font-size:12px;color:rgba(240,236,230,.50);line-height:1.4')}>Tu navigues dans la refonte « Liquid Glass ». Certaines actions renvoient encore vers l'app actuelle.</div>
        </div>
      </div>
      <div style={css('height:20px')} />
    </PageFrame>
  );
}
