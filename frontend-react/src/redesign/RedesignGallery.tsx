import { useState } from 'react';
import { cn } from '@/lib/utils';
import './styles/liquid-glass.css';
import { css } from './lib/css';
import { ALL_SCREEN_IDS, BUILT_SCREENS, type ScreenId } from './lib/nav';
import { SidePanel } from './components/SidePanel';
import { PhoneFrame } from './components/PhoneFrame';
import { HomeScreen } from './screens/HomeScreen';
import { MapScreen } from './screens/MapScreen';
import { SpotDetailScreen } from './screens/SpotDetailScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { FeedScreen } from './screens/FeedScreen';
import { LogbookScreen } from './screens/LogbookScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ProposeScreen } from './screens/ProposeScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { MySpotsScreen } from './screens/MySpotsScreen';
import { FriendsScreen } from './screens/FriendsScreen';
import { PublicProfileScreen } from './screens/PublicProfileScreen';
import { GearScreen } from './screens/GearScreen';

/**
 * Vitrine du redesign Liquid Glass v2 (réplique de `.dw` du prototype).
 * Route /redesign, ISOLÉE de l'app (hors <Layout>). En Phase A, 3 écrans témoins sont
 * convertis ; les autres affichent un placeholder. Le CSS est scopé sous `.lg-root`.
 */
export function RedesignGallery() {
  const [active, setActive] = useState<ScreenId>('accueil');

  // Reproduit goTo() du prototype : ignore les ids sans écran (ex: 'filtres' = no-op,
  // comme `if (!next) return` dans le proto). La transition .sc.active est gérée en CSS.
  const goTo = (id: ScreenId) => {
    if (!ALL_SCREEN_IDS.includes(id)) return;
    setActive(id);
  };

  const placeholderActive = !BUILT_SCREENS.includes(active);

  return (
    <div className="lg-root">
      <div className="dw">
        <SidePanel active={active} goTo={goTo} />
        <PhoneFrame active={active} goTo={goTo}>
          <HomeScreen active={active} goTo={goTo} />
          <MapScreen active={active} goTo={goTo} />
          <SpotDetailScreen active={active} goTo={goTo} />
          <LoginScreen active={active} goTo={goTo} />
          <ForgotPasswordScreen active={active} goTo={goTo} />
          <FeedScreen active={active} goTo={goTo} />
          <LogbookScreen active={active} goTo={goTo} />
          <NotificationsScreen active={active} goTo={goTo} />
          <SearchScreen active={active} goTo={goTo} />
          <ProposeScreen active={active} goTo={goTo} />
          <MessagesScreen active={active} goTo={goTo} />
          <ProfileScreen active={active} goTo={goTo} />
          <SettingsScreen active={active} goTo={goTo} />
          <AdminScreen active={active} goTo={goTo} />
          <ConversationScreen active={active} goTo={goTo} />
          <MySpotsScreen active={active} goTo={goTo} />
          <FriendsScreen active={active} goTo={goTo} />
          <PublicProfileScreen active={active} goTo={goTo} />
          <GearScreen active={active} goTo={goTo} />
          <Placeholder show={placeholderActive} />
        </PhoneFrame>
      </div>
    </div>
  );
}

/** Écran provisoire pour les 16 écrans non encore convertis (Phase B). */
function Placeholder({ show }: { show: boolean }) {
  return (
    <div className={cn('sc', show && 'active')} id="sc-placeholder">
      <div style={css('min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 32px;gap:10px')}>
        <div style={css('font-size:20px;font-weight:700;color:#f0ece6')}>Écran à venir</div>
        <div style={css('font-size:13px;color:rgba(240,236,230,.50);line-height:1.5')}>
          Cet écran sera converti en Phase B. Les 3 écrans témoins (Accueil, Carte, Spot Détail) sont
          accessibles via le panneau latéral ou la tab bar.
        </div>
      </div>
    </div>
  );
}
