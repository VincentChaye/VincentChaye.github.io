import { BrowserRouter, HashRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { MapPage } from '@/pages/MapPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { MySpotsPage } from '@/pages/MySpotsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LogbookPage } from '@/pages/LogbookPage';
import { FeedPage } from '@/pages/FeedPage';
import { AdminSpotsPage } from '@/pages/AdminSpotsPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { AdminGearPage } from '@/pages/AdminGearPage';
import { GearPage } from '@/pages/GearPage';
import { GearCataloguePage } from '@/pages/GearCataloguePage';
import { MyProfilePage } from '@/pages/MyProfilePage';
import { MessagesPage } from '@/pages/MessagesPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { useAuthStore } from '@/stores/auth.store';

const SpotPage = lazy(() =>
  import('@/pages/SpotPage').then((m) => ({ default: m.SpotPage })),
);
// Redesign Liquid Glass v2 — vitrine isolée (hors Layout), chargée à la demande.
const RedesignGallery = lazy(() =>
  import('@/redesign').then((m) => ({ default: m.RedesignGallery })),
);
// Swap (design Liquid Glass) câblé aux vraies données — routes additives.
const RedesignSpotPage = lazy(() =>
  import('@/redesign/pages/SpotDetailPage').then((m) => ({ default: m.SpotDetailPage })),
);
const RedesignSearchPage = lazy(() =>
  import('@/redesign/pages/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const RedesignLoginPage = lazy(() =>
  import('@/redesign/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RedesignLogbookPage = lazy(() =>
  import('@/redesign/pages/LogbookPage').then((m) => ({ default: m.LogbookPage })),
);
const RedesignNotificationsPage = lazy(() =>
  import('@/redesign/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const RedesignProfilePage = lazy(() =>
  import('@/redesign/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const RedesignMySpotsPage = lazy(() =>
  import('@/redesign/pages/MySpotsPage').then((m) => ({ default: m.MySpotsPage })),
);
const RedesignSettingsPage = lazy(() =>
  import('@/redesign/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const RedesignForgotPage = lazy(() =>
  import('@/redesign/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const RedesignPublicProfilePage = lazy(() =>
  import('@/redesign/pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage })),
);
const RedesignFriendsPage = lazy(() =>
  import('@/redesign/pages/FriendsPage').then((m) => ({ default: m.FriendsPage })),
);
const RedesignFeedPage = lazy(() =>
  import('@/redesign/pages/FeedPage').then((m) => ({ default: m.FeedPage })),
);
const RedesignGearPage = lazy(() =>
  import('@/redesign/pages/GearPage').then((m) => ({ default: m.GearPage })),
);
const RedesignHomePage = lazy(() =>
  import('@/redesign/pages/HomePage').then((m) => ({ default: m.HomePage })),
);
const RedesignProposePage = lazy(() =>
  import('@/redesign/pages/ProposePage').then((m) => ({ default: m.ProposePage })),
);
const RedesignAdminPage = lazy(() =>
  import('@/redesign/pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const RedesignMessagesPage = lazy(() =>
  import('@/redesign/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const RedesignConversationPage = lazy(() =>
  import('@/redesign/pages/ConversationPage').then((m) => ({ default: m.ConversationPage })),
);
const RedesignMapPage = lazy(() =>
  import('@/redesign/pages/MapPage').then((m) => ({ default: m.MapPage })),
);
const RedesignAdminUsersPage = lazy(() =>
  import('@/redesign/pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const RedesignAdminGearPage = lazy(() =>
  import('@/redesign/pages/AdminGearPage').then((m) => ({ default: m.AdminGearPage })),
);
import { useThemeStore } from '@/stores/theme.store';
import { useMessagesStore } from '@/stores/messages.store';
import { useOutingStore } from '@/stores/outing.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { bootstrapNative } from '@/lib/native-bootstrap';
import { isNativeApp } from '@/lib/platform';

/** Redirige un chemin paramétré vers son jumeau redesign en substituant les params + en gardant la query. */
function ParamRedirect({ to }: { to: string }) {
  const params = useParams();
  const { search } = useLocation();
  const target = Object.entries(params).reduce(
    (acc, [k, v]) => (v != null ? acc.replace(`:${k}`, encodeURIComponent(v)) : acc),
    to,
  );
  return <Navigate to={target + search} replace />;
}

function App() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const { token, isAuthenticated } = useAuthStore();
  const {
    loadConversations,
    _onNewMessage, _onConversationUpdated, _onUserStatus, _onTyping,
    _onGroupUpdated, _onConversationAdded, _onConversationRemoved,
  } = useMessagesStore();
  const {
    _onOutingCreated, _onOutingUpdated,
    _onOutingClaimAdded, _onOutingClaimRemoved,
    _onOutingCompleted, _onOutingDeleted,
  } = useOutingStore();

  useEffect(() => {
    hydrateAuth();
    hydrateTheme();
    bootstrapNative();
  }, [hydrateAuth, hydrateTheme]);

  // Connect / disconnect Socket.io with auth
  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket(token);
    loadConversations();

    socket.on('new_message', _onNewMessage);
    socket.on('conversation_updated', _onConversationUpdated);
    socket.on('user_status', _onUserStatus);
    socket.on('typing', _onTyping);
    socket.on('group_updated', _onGroupUpdated);
    socket.on('conversation_added', _onConversationAdded);
    socket.on('conversation_removed', _onConversationRemoved);
    socket.on('outing_created', _onOutingCreated);
    socket.on('outing_updated', _onOutingUpdated);
    socket.on('outing_claim_added', _onOutingClaimAdded);
    socket.on('outing_claim_removed', _onOutingClaimRemoved);
    socket.on('outing_completed', _onOutingCompleted);
    socket.on('outing_deleted', _onOutingDeleted);

    return () => {
      socket.off('new_message', _onNewMessage);
      socket.off('conversation_updated', _onConversationUpdated);
      socket.off('user_status', _onUserStatus);
      socket.off('typing', _onTyping);
      socket.off('group_updated', _onGroupUpdated);
      socket.off('conversation_added', _onConversationAdded);
      socket.off('conversation_removed', _onConversationRemoved);
      socket.off('outing_created', _onOutingCreated);
      socket.off('outing_updated', _onOutingUpdated);
      socket.off('outing_claim_added', _onOutingClaimAdded);
      socket.off('outing_claim_removed', _onOutingClaimRemoved);
      socket.off('outing_completed', _onOutingCompleted);
      socket.off('outing_deleted', _onOutingDeleted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  const isCapacitor = import.meta.env.MODE === 'capacitor';
  const Router = isCapacitor ? HashRouter : BrowserRouter;
  const routerProps = isCapacitor ? {} : { basename: '/ZoneDeGrimpe' };

  return (
    <Router {...routerProps}>
      <Toaster position="bottom-center" richColors closeButton />
      <Routes>
        {/* Vitrine du redesign — isolée du reste de l'app (pas de Layout). */}
        <Route
          path="/redesign"
          element={
            <Suspense fallback={null}>
              <RedesignGallery />
            </Suspense>
          }
        />
        {/* Swap — routes additives : les pages live restent intactes. */}
        <Route
          path="/redesign/spot/:id"
          element={
            <Suspense fallback={null}>
              <RedesignSpotPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/search"
          element={
            <Suspense fallback={null}>
              <RedesignSearchPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/login"
          element={
            <Suspense fallback={null}>
              <RedesignLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/logbook"
          element={
            <Suspense fallback={null}>
              <RedesignLogbookPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/notifications"
          element={
            <Suspense fallback={null}>
              <RedesignNotificationsPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/profile"
          element={
            <Suspense fallback={null}>
              <RedesignProfilePage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/my-spots"
          element={
            <Suspense fallback={null}>
              <RedesignMySpotsPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/settings"
          element={
            <Suspense fallback={null}>
              <RedesignSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/forgot-password"
          element={
            <Suspense fallback={null}>
              <RedesignForgotPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/profile/:id"
          element={
            <Suspense fallback={null}>
              <RedesignPublicProfilePage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/friends"
          element={
            <Suspense fallback={null}>
              <RedesignFriendsPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/feed"
          element={
            <Suspense fallback={null}>
              <RedesignFeedPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/gear"
          element={
            <Suspense fallback={null}>
              <RedesignGearPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/home"
          element={
            <Suspense fallback={null}>
              <RedesignHomePage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/propose"
          element={
            <Suspense fallback={null}>
              <RedesignProposePage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/admin"
          element={
            <Suspense fallback={null}>
              <RedesignAdminPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/admin/users"
          element={
            <Suspense fallback={null}>
              <RedesignAdminUsersPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/admin/gear"
          element={
            <Suspense fallback={null}>
              <RedesignAdminGearPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/messages"
          element={
            <Suspense fallback={null}>
              <RedesignMessagesPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/messages/:id"
          element={
            <Suspense fallback={null}>
              <RedesignConversationPage />
            </Suspense>
          }
        />
        <Route
          path="/redesign/map"
          element={
            <Suspense fallback={null}>
              <RedesignMapPage />
            </Suspense>
          }
        />
        {isNativeApp ? (
          /* APP NATIVE : l'ancien design n'est JAMAIS rendu. Chaque chemin pointe vers son jumeau
             /redesign/* (les pages redesign n'ont aucune fuite vers l'ancien design). Le catch-all
             rattrape les chemins sans jumeau (ex. /reset-password) → home, pas d'écran blanc. */
          <>
            <Route path="/" element={<Navigate to="/redesign/home" replace />} />
            <Route path="/map" element={<Navigate to="/redesign/map" replace />} />
            <Route path="/feed" element={<Navigate to="/redesign/feed" replace />} />
            <Route path="/messages" element={<Navigate to="/redesign/messages" replace />} />
            <Route path="/messages/:id" element={<ParamRedirect to="/redesign/messages/:id" />} />
            <Route path="/spot/:id" element={<ParamRedirect to="/redesign/spot/:id" />} />
            <Route path="/login" element={<Navigate to="/redesign/login" replace />} />
            <Route path="/register" element={<Navigate to="/redesign/login" replace />} />
            <Route path="/me" element={<Navigate to="/redesign/profile" replace />} />
            <Route path="/profile" element={<Navigate to="/redesign/profile" replace />} />
            <Route path="/profile/:id" element={<ParamRedirect to="/redesign/profile/:id" />} />
            <Route path="/my-spots" element={<Navigate to="/redesign/my-spots" replace />} />
            <Route path="/settings" element={<Navigate to="/redesign/settings" replace />} />
            <Route path="/notifications" element={<Navigate to="/redesign/notifications" replace />} />
            <Route path="/friends" element={<Navigate to="/redesign/friends" replace />} />
            <Route path="/logbook" element={<Navigate to="/redesign/logbook" replace />} />
            <Route path="/gear" element={<Navigate to="/redesign/gear" replace />} />
            <Route path="/forgot-password" element={<Navigate to="/redesign/forgot-password" replace />} />
            <Route path="/admin/spots" element={<Navigate to="/redesign/admin" replace />} />
            <Route path="/admin/users" element={<Navigate to="/redesign/admin/users" replace />} />
            <Route path="/admin/gear" element={<Navigate to="/redesign/admin/gear" replace />} />
            <Route path="*" element={<Navigate to="/redesign/home" replace />} />
          </>
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/my-spots" element={<MySpotsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/me" element={<MyProfilePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/logbook" element={<LogbookPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/admin/spots" element={<AdminSpotsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/gear" element={<GearPage />} />
            <Route path="/gear/catalogue" element={<GearCataloguePage />} />
            <Route path="/admin/gear" element={<AdminGearPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/spot/:id" element={<Suspense fallback={null}><SpotPage /></Suspense>} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}

export default App;
