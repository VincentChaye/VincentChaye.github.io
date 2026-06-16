import { Capacitor } from '@capacitor/core';

/**
 * Vrai dans l'APP NATIVE installée (iOS/Android), faux sur le web (desktop + navigateur mobile).
 *
 * Deux signaux combinés (ceinture + bretelles) :
 *  - `import.meta.env.MODE === 'capacitor'` : constante de build. L'app native est TOUJOURS buildée
 *    avec `build:native` (= `vite build --mode capacitor`, cf. CI `native-build.yml`) ; le web avec
 *    `npm run build` (mode production). Avantage : reste vrai dans le preview navigateur `dev:native`.
 *  - `Capacitor.isNativePlatform()` : runtime, vrai seulement dans la coquille native. Filet si le
 *    mode de build venait à manquer.
 *
 * Sert à basculer l'app vers le design « Liquid Glass » (redesign) tout en laissant le web sur
 * l'ancien design. NB : le TYPE de routeur (Hash vs Browser) reste keyé sur le mode de build seul
 * (il doit matcher le build, pas le runtime).
 */
export const isNativeApp =
  import.meta.env.MODE === 'capacitor' || Capacitor.isNativePlatform();
