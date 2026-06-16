/**
 * Identifiants d'écran — repris tels quels des `data-s` / `id="sc-…"` du prototype
 * ZoneDeGrimpe-LiquidGlass-v2.html. Les 19 écrans existent dans la vitrine ; en Phase A
 * seuls 'accueil', 'carte' et 'spot-detail' sont réellement convertis (les autres = placeholder).
 */
export type ScreenId =
  | 'accueil'
  | 'login'
  | 'carte'
  | 'spot-detail'
  | 'fil'
  | 'carnet'
  | 'notifications'
  | 'recherche'
  | 'proposer'
  | 'messagerie'
  | 'profil'
  | 'parametres'
  | 'admin'
  | 'conversation'
  | 'forgot-password'
  | 'mes-spots'
  | 'amis'
  | 'profil-public'
  | 'materiel';

/** Tous les écrans existants de la vitrine (= les `sc-…` du prototype). */
export const ALL_SCREEN_IDS: ScreenId[] = [
  'accueil', 'login', 'carte', 'spot-detail', 'fil', 'carnet', 'notifications',
  'recherche', 'proposer', 'messagerie', 'profil', 'parametres', 'admin',
  'conversation', 'forgot-password', 'mes-spots', 'amis', 'profil-public', 'materiel',
];

/** Écrans convertis (Phase A + Phase B au fur et à mesure). */
export const BUILT_SCREENS: ScreenId[] = [
  'accueil', 'carte', 'spot-detail',
  'login', 'forgot-password', 'fil', 'carnet', 'notifications', 'recherche',
  'proposer', 'messagerie', 'profil', 'parametres',
  'admin', 'conversation', 'mes-spots', 'amis', 'profil-public', 'materiel',
];

/** Clé d'icône pour la tab bar (résolue dans TabBar via icons.tsx). */
export type TabIcon = 'home' | 'map' | 'feed' | 'messages' | 'user';

export interface TabDef {
  id: ScreenId;
  label: string;
  icon: TabIcon;
}

/** Tab bar flottante — 5 onglets (cf. prototype `.tb`). */
export const TABS: TabDef[] = [
  { id: 'accueil', label: 'Accueil', icon: 'home' },
  { id: 'carte', label: 'Carte', icon: 'map' },
  { id: 'fil', label: 'Social', icon: 'feed' },
  { id: 'messagerie', label: 'Messages', icon: 'messages' },
  { id: 'profil', label: 'Profil', icon: 'user' },
];

/** Onglet 'profil' reste actif quand on est sur une page reliée (cf. MAIN_TABS du script). */
export const MAIN_TABS: ScreenId[] = ['accueil', 'carte', 'fil', 'messagerie', 'profil', 'conversation'];

export interface NavGroup {
  title: string;
  items: { id: ScreenId; label: string }[];
}

/** Navigation latérale de la vitrine desktop (`.si` / `#side-nav`) — preview uniquement. */
export const SIDE_NAV: NavGroup[] = [
  {
    title: 'Tabs principaux',
    items: [
      { id: 'accueil', label: 'Accueil' },
      { id: 'carte', label: 'Carte' },
      { id: 'fil', label: 'Social' },
      { id: 'messagerie', label: 'Messages' },
      { id: 'profil', label: 'Profil' },
    ],
  },
  {
    title: 'Sous-pages',
    items: [
      { id: 'carnet', label: 'Carnet' },
      { id: 'login', label: 'Login / Register' },
      { id: 'spot-detail', label: 'Spot Détail' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'recherche', label: 'Recherche' },
      { id: 'proposer', label: 'Proposer un spot' },
      { id: 'parametres', label: 'Paramètres' },
      { id: 'admin', label: 'Admin' },
      { id: 'conversation', label: 'Conversation' },
    ],
  },
  {
    title: 'Nouvelles pages',
    items: [
      { id: 'forgot-password', label: 'Mot de passe oublié' },
      { id: 'mes-spots', label: 'Mes Spots' },
      { id: 'amis', label: 'Amis' },
      { id: 'profil-public', label: 'Profil Public' },
      { id: 'materiel', label: 'Matériel / EPI' },
    ],
  },
];
