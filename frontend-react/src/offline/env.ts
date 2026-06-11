import { Capacitor } from '@capacitor/core';

/**
 * Détermine si le mode hors ligne est activé.
 * - Toujours actif sur les plateformes natives (iOS/Android via Capacitor).
 * - Actif en dev web pour pouvoir tester dans Chrome DevTools.
 * - Désactivé en prod web (GitHub Pages → online-only).
 */
export function isOfflineEnabled(): boolean {
  return Capacitor.isNativePlatform() || import.meta.env.DEV;
}
