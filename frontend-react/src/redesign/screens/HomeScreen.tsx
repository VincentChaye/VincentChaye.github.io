import { cn } from '@/lib/utils';
import { css } from '../lib/css';
import type { ScreenId } from '../lib/nav';
import { NavBar } from '../components/NavBar';
import { IconButton, SectionHeader } from '../components/primitives';
import { StatsGrid } from '../components/StatsGrid';
import { ListRow } from '../components/ListRow';
import { FeatureCard } from '../components/FeatureCard';
import {
  BellIcon,
  SearchIcon,
  MapPinIcon,
  UsersIcon,
  BookOpenIcon,
  ActivityIcon,
  LayersIcon,
  ShieldIcon,
  InfoIcon,
} from '../lib/icons';

/** SCREEN: ACCUEIL — port fidèle (proto l.282-323). */
export function HomeScreen({ active, goTo }: { active: ScreenId; goTo: (id: ScreenId) => void }) {
  return (
    <div className={cn('sc', active === 'accueil' && 'active')} id="sc-accueil">
      <NavBar style={css('height:100px')}>
        <div style={css('position:absolute;top:62px;right:20px')}>
          <IconButton style={css('cursor:pointer')} onClick={() => goTo('notifications')}>
            <BellIcon width={16} height={16} />
          </IconButton>
        </div>
      </NavBar>

      {/* Hero */}
      <div style={css('padding:4px 20px 0;text-align:center')}>
        <h1 style={css('font-size:38px;font-weight:800;line-height:1.05;letter-spacing:-1.5px;margin-bottom:14px')}>
          Trouve ta
          <br />
          <span style={css('background:linear-gradient(130deg,#D4A030,#F5CC6E 55%,#D4A030);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text')}>
            prochaine voie
          </span>
        </h1>
        <p style={css('font-size:15px;line-height:1.55;color:rgba(240,236,230,.55);margin-bottom:28px;padding:0 8px')}>
          Explore les spots, découvre de nouvelles falaises et partage tes meilleurs blocs.
        </p>
        <div
          onClick={() => goTo('carte')}
          className="morph-btn"
          style={css('display:inline-flex;align-items:center;gap:9px;padding:15px 28px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.90),rgba(232,184,75,.95));border:1px solid rgba(255,255,255,.28);color:#1a0f05;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(212,160,48,.40),inset 0 1px 0 rgba(255,255,255,.30);position:relative;overflow:hidden')}
        >
          <SearchIcon width={16} height={16} strokeWidth={2.5} />
          Explorer la carte
        </div>
        <div style={css('width:62px;height:62px;border-radius:18px;background:rgba(42,110,60,.18);backdrop-filter:blur(20px);border:1px solid rgba(212,160,48,.20);display:flex;align-items:center;justify-content:center;font-size:28px;margin:28px auto 0;box-shadow:0 0 28px rgba(212,160,48,.18)')} />
      </div>

      {/* Stats */}
      <StatsGrid
        items={[
          { icon: <MapPinIcon width={18} height={18} strokeWidth={1.8} />, value: '5 711', label: 'Spots' },
          { icon: <UsersIcon width={18} height={18} strokeWidth={1.8} />, value: '9', label: 'Grimpeurs' },
          { value: 'FR', label: 'France' },
        ]}
      />

      {/* Ton espace */}
      <SectionHeader>Ton espace</SectionHeader>
      <div style={css('padding:0 20px;display:flex;flex-direction:column;gap:10px')}>
        <ListRow
          icon={<BookOpenIcon width={18} height={18} />}
          title="Carnet"
          subtitle="Ton carnet d'ascensions"
          onClick={() => goTo('carnet')}
        />
        <ListRow
          icon={<ActivityIcon width={18} height={18} />}
          title="Fil d'activité"
          subtitle="Activité de tes amis"
          onClick={() => goTo('fil')}
        />
        <ListRow
          icon={<MapPinIcon width={18} height={18} />}
          title="Mes Spots"
          subtitle="Favoris & propositions"
        />
      </div>

      {/* Features */}
      <SectionHeader>Fonctionnalités</SectionHeader>
      <div style={css('padding:0 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
        <FeatureCard
          icon={<LayersIcon width={20} height={20} strokeWidth={1.8} />}
          title="Carte"
          desc="+1000 spots filtrables"
          onClick={() => goTo('carte')}
        />
        <FeatureCard
          icon={<ShieldIcon width={20} height={20} strokeWidth={1.8} />}
          title="Fiches"
          desc="Voies, GPS, avis"
          onClick={() => goTo('spot-detail')}
        />
        <FeatureCard
          icon={<UsersIcon width={20} height={20} strokeWidth={1.8} />}
          title="Communauté"
          desc="Propose et enrichis la base communautaire."
          fullWidth
          onClick={() => goTo('proposer')}
        />
      </div>

      {/* Bandeau « en développement » */}
      <div style={css('margin:24px 20px 0;border-radius:16px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;background:rgba(212,160,48,.07);border:1px solid rgba(212,160,48,.18)')}>
        <div style={css('color:#D4A030;flex-shrink:0;margin-top:1px')}>
          <InfoIcon width={16} height={16} />
        </div>
        <div>
          <div style={css('font-size:13px;font-weight:600;color:#E8B84B;margin-bottom:3px')}>En développement</div>
          <div style={css('font-size:12px;color:rgba(240,236,230,.50);line-height:1.4')}>
            Fonctionnalités en cours. Merci de votre compréhension.
          </div>
        </div>
      </div>
    </div>
  );
}
