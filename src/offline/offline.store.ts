import { create } from 'zustand';
import { isOfflineEnabled } from './env';
import { API_BASE_URL } from '@/lib/api';

/* ---------- Types ---------- */

interface OfflineState {
  /** État réseau brut (signal système) */
  online: boolean;
  /** Mode effectif de l'app (peut basculer offline même si online=true sur réseau faible) */
  mode: 'online' | 'offline';
  /** Nombre de mutations en attente (pending + error) dans la file */
  pendingMutations: number;
  /** Indique qu'un 401 a bloqué la synchro — l'utilisateur doit se reconnecter */
  authRequired: boolean;
  /** Appelé sur échec/timeout réseau — 2 échecs consécutifs → mode offline */
  reportFailure(): void;
  /** Requête réussie → reset compteur + mode online */
  reportSuccess(): void;
}

/* ---------- Store ---------- */

/* Compteur d'échecs consécutifs — hors état zustand pour ne pas re-render à chaque échec. */
let _failures = 0;

export const useOfflineStore = create<OfflineState>((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  mode: 'online',
  pendingMutations: 0,
  authRequired: false,

  reportFailure() {
    _failures += 1;
    if (_failures >= 2) set({ mode: 'offline' });
  },

  reportSuccess() {
    _failures = 0;
    set({ mode: 'online' });
  },
}));

/* ---------- Ping interval (nettoyé quand on repasse online) ---------- */
let _pingInterval: ReturnType<typeof setInterval> | null = null;

function clearPing() {
  if (_pingInterval !== null) {
    clearInterval(_pingInterval);
    _pingInterval = null;
  }
}

/* Debounce flush : déclenche le flush de la file après 2 s (évite les appels en rafale) */
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (_flushTimer !== null) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    import('./queue').then((q) => q.flush()).catch(() => { /* pas de connexion — on réessaiera */ });
  }, 2000);
}

function startPing() {
  if (_pingInterval !== null) return; // déjà en cours
  _pingInterval = setInterval(async () => {
    const state = useOfflineStore.getState();
    // Ping uniquement si mode offline mais réseau potentiellement disponible
    if (state.mode !== 'offline' || !state.online) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/spots/count`, {
        signal: AbortSignal.timeout(8000),
        mode: 'cors',
        cache: 'no-store',
      });
      if (res.ok) {
        clearPing();
        _failures = 0;
        useOfflineStore.setState({ mode: 'online' });
        // Retour réseau confirmé par le ping → flush la file
        scheduleFlush();
      }
    } catch {
      // Ping raté — on reste offline
    }
  }, 30_000);
}

/* Écoute les changements de mode pour démarrer/arrêter le ping */
useOfflineStore.subscribe((state) => {
  if (state.mode === 'offline' && state.online) {
    startPing();
  } else if (state.mode === 'online') {
    clearPing();
  }
});

/* ---------- Initialisation (idempotente) ---------- */

let _initialized = false;

export async function initOffline(): Promise<void> {
  if (!isOfflineEnabled()) return;
  if (_initialized) return;
  _initialized = true;

  // --- État initial depuis les APIs système ---
  const setOnline = (online: boolean) => {
    useOfflineStore.setState({ online });
    if (online) {
      // Retour réseau → reset compteur d'échecs + repasse en online
      _failures = 0;
      useOfflineStore.setState({ mode: 'online' });
      clearPing();
      // Retour réseau → flush la file avec debounce
      scheduleFlush();
    } else {
      useOfflineStore.setState({ mode: 'offline' });
    }
  };

  // Fallback web : window online/offline
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
  // État initial web
  setOnline(navigator.onLine);

  // Écoute native Capacitor (dynamique pour éviter les imports statiques hors natif)
  try {
    const { Network } = await import('@capacitor/network');
    // État initial natif
    const status = await Network.getStatus();
    setOnline(status.connected);
    // Changements réseau natifs
    Network.addListener('networkStatusChange', (s) => {
      setOnline(s.connected);
    });
  } catch {
    // Pas sur Capacitor ou plugin indisponible → on reste sur les événements web
  }

  // Charge le compteur initial de mutations en attente
  import('./queue').then(async (q) => {
    await q.refreshPendingCount();
    // Si on est déjà online, tente un flush immédiat
    if (useOfflineStore.getState().mode === 'online') {
      scheduleFlush();
    }
  }).catch(() => { /* IndexedDB indisponible */ });
}
