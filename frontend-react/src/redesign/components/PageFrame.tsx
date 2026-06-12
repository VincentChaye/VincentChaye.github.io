import { useRef, type ReactNode, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isNativeApp } from '@/lib/platform';
import '../styles/liquid-glass.css';
import '../styles/interactions.css';
import '../styles/native.css';
import '../styles/liquid-glass-enhance.css'; // surcouche « Apple Liquid Glass », importée en dernier (gagne l'ordre source)
import { usePressFeedback } from '../lib/usePressFeedback';
import { StatusBar } from './StatusBar';
import { HomeIcon, LayersIcon, ActivityIcon, MessageSquareIcon, UserIcon, type IconProps } from '../lib/icons';
import { useMessagesStore } from '@/stores/messages.store';
import { useOfflineStore } from '@/offline/offline.store';

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
  { id: 'fil', label: 'Social', route: '/redesign/feed', Icon: ActivityIcon },
  { id: 'messagerie', label: 'Messages', route: '/redesign/messages', Icon: MessageSquareIcon },
  { id: 'profil', label: 'Profil', route: '/redesign/profile', Icon: UserIcon },
];

export function PageFrame({ children, tab, flush }: { children: ReactNode; tab?: TabKey; flush?: boolean }) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadTotal = useMessagesStore((s) => s.unreadTotal);
  const isOfflineMode = useOfflineStore((s) => s.mode === 'offline');
  const pendingMutations = useOfflineStore((s) => s.pendingMutations);
  usePressFeedback(rootRef); // feedback tactile iOS délégué (cf. lib/usePressFeedback)
  return (
    // `native` (app installée) → plein écran : neutralise le cadre 390×844 (cf. native.css).
    // `has-tab` : pages racines de la tab bar → en natif, le bouton Retour est masqué (native.css),
    // le geste/bouton système suffit ; les sous-pages (sans `tab`) le gardent.
    <div className={cn('lg-root', isNativeApp && 'native', tab && 'has-tab')} ref={rootRef}>
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
            <div
              className="sc active sc-enter"
              style={flush ? { paddingBottom: isNativeApp ? 'env(safe-area-inset-bottom)' : 0 } : undefined}
              // `nb-scrolled` sur `.lg-root` → fond verre du header sticky `.nb` (cf. native.css).
              // classList direct (pas de state) : pas de re-render à chaque frame de scroll.
              onScroll={(e) => rootRef.current?.classList.toggle('nb-scrolled', e.currentTarget.scrollTop > 8)}
            >
              {/* Bandeau hors ligne — pilule discrète en haut du contenu, pointer-events:none */}
              {(isOfflineMode || pendingMutations > 0) && (
                <div style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 50,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  pointerEvents: 'none',
                  paddingTop: 8,
                  paddingBottom: 4,
                  flexWrap: 'wrap',
                }}>
                  {/* Pilule « Hors ligne » */}
                  {isOfflineMode && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 14px',
                      borderRadius: 9999,
                      background: 'rgba(12,8,4,.78)',
                      border: '1px solid rgba(212,160,48,.25)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'rgba(212,160,48,.9)',
                      letterSpacing: '0.3px',
                    }}>
                      <span aria-hidden style={{ fontSize: 10 }}>●</span>
                      Hors ligne
                    </div>
                  )}
                  {/* Pilule « N en attente » — visible aussi en mode online */}
                  {pendingMutations > 0 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      borderRadius: 9999,
                      background: 'rgba(12,8,4,.78)',
                      border: '1px solid rgba(212,160,48,.20)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'rgba(212,160,48,.8)',
                      letterSpacing: '0.2px',
                    }}>
                      {/* Icône rotation */}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                      </svg>
                      {pendingMutations} en attente
                    </div>
                  )}
                </div>
              )}
              {children}
            </div>
          </div>
          {tab && (
            <div className="tbw">
              <div className="tb">
                {TAB_ROUTES.map((t) => (
                  <div key={t.id} className={cn('ti', tab === t.id && 'active')} onClick={() => navigate(t.route)}>
                    <div className="tii" style={{ position: 'relative' }}>
                      <t.Icon width={20} height={20} />
                      {t.id === 'messagerie' && unreadTotal > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -8,
                            minWidth: 16,
                            height: 16,
                            padding: '0 4px',
                            borderRadius: 8,
                            background: '#D4A030',
                            color: '#1a0f05',
                            fontSize: 10,
                            fontWeight: 700,
                            lineHeight: '16px',
                            textAlign: 'center',
                            boxSizing: 'border-box',
                          }}
                        >
                          {unreadTotal > 9 ? '9+' : unreadTotal}
                        </span>
                      )}
                    </div>
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
