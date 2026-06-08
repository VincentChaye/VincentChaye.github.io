import { useRef, type ReactNode, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isNativeApp } from '@/lib/platform';
import '../styles/liquid-glass.css';
import '../styles/interactions.css';
import '../styles/native.css';
import { usePressFeedback } from '../lib/usePressFeedback';
import { StatusBar } from './StatusBar';
import { HomeIcon, LayersIcon, ActivityIcon, MessageSquareIcon, UserIcon, type IconProps } from '../lib/icons';

/**
 * Coque téléphone minimale pour les PAGES « swap » (frame `.ph` + fond rocheux `.bgs` + zone
 * scroll `.pw`/`.sc`). Le `backdrop-filter` du glass se calcule contre `.bgs` (sinon il s'aplatit).
 *
 * `tab` (optionnel) : affiche la TabBar flottante du bas câblée au routeur (`/redesign/*`) avec
 * l'onglet actif surligné. À mettre sur les 5 écrans principaux ; les sous-pages gardent le bouton
 * retour. `.sc` réserve déjà 110px en bas pour la barre.
 */
export type TabKey = 'accueil' | 'carte' | 'fil' | 'messagerie' | 'profil';

const TAB_ROUTES: { id: TabKey; label: string; route: string; Icon: (p: IconProps) => ReactElement }[] = [
  { id: 'accueil', label: 'Accueil', route: '/redesign/home', Icon: HomeIcon },
  { id: 'carte', label: 'Carte', route: '/redesign/map', Icon: LayersIcon },
  { id: 'fil', label: 'Fil', route: '/redesign/feed', Icon: ActivityIcon },
  { id: 'messagerie', label: 'Messages', route: '/redesign/messages', Icon: MessageSquareIcon },
  { id: 'profil', label: 'Profil', route: '/redesign/profile', Icon: UserIcon },
];

export function PageFrame({ children, tab, flush }: { children: ReactNode; tab?: TabKey; flush?: boolean }) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  usePressFeedback(rootRef); // feedback tactile iOS délégué (cf. lib/usePressFeedback)
  return (
    // `native` (app installée) → plein écran : neutralise le cadre 390×844 (cf. native.css).
    <div className={cn('lg-root', isNativeApp && 'native')} ref={rootRef}>
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: isNativeApp ? 0 : 24 }}>
        <div className="ph">
          <div className="di"><div className="dic" /><div className="dis" /></div>
          <StatusBar />
          <div className="bgs"><div className="bgg" /><div className="bgm" /><div className="gt1" /></div>
          <div className="pw">
            {/* `flush` annule le padding-bottom:110px (réservé à la TabBar) pour les pages avec une
                barre collée en bas (ex. composer de Conversation) → pas de trou sous la barre.
                `sc-enter` = animation d'entrée d'écran (interactions.css), distincte de .sc.active. */}
            {/* flush = barre collée en bas (composer Conversation). En natif, on réserve le home-indicator
                (env safe-area) sinon le composer sticky:bottom:0 colle au bord bas du device. */}
            <div className="sc active sc-enter" style={flush ? { paddingBottom: isNativeApp ? 'env(safe-area-inset-bottom)' : 0 } : undefined}>{children}</div>
          </div>
          {tab && (
            <div className="tbw">
              <div className="tb">
                {TAB_ROUTES.map((t) => (
                  <div key={t.id} className={cn('ti', tab === t.id && 'active')} onClick={() => navigate(t.route)}>
                    <div className="tii"><t.Icon width={20} height={20} /></div>
                    <div className="til">{t.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
