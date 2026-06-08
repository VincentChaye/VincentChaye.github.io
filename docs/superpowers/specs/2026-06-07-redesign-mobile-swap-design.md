# Design — Nouveau design (Liquid Glass) sur l'app mobile, ancien design sur le web desktop

Date : 2026-06-07 · Statut : proposé (en attente de revue utilisateur)

## Objectif

L'app **native installée** (build Capacitor iOS/Android) doit afficher le **nouveau design
« Liquid Glass »** (déjà porté + câblé aux vraies données sous `/redesign/*`). Le **site web**
(GitHub Pages, desktop **et** navigateur mobile) garde l'**ancien design** inchangé.

Décision utilisateur : cible = **app native uniquement** (zéro détection de viewport runtime). Admin =
**porter l'admin complet au redesign** (cf. § Admin).

## Levier (mécanisme)

Flag combiné (build-time **+** runtime, ceinture-et-bretelles) :

```ts
const isNativeApp = import.meta.env.MODE === 'capacitor' || Capacitor.isNativePlatform();
```

- `import.meta.env.MODE === 'capacitor'` : vrai **uniquement** dans `build:native` (`vite build --mode
  capacitor`). Confirmé : le CI build l'app native avec `build:native` (Android `native-build.yml:37`,
  iOS `:89`) et tous les scripts `cap:*` ; le web est buildé avec `npm run build` (`pages.yml:38`,
  mode production). Avantage : reste vrai dans le preview navigateur `dev:native`.
- `Capacitor.isNativePlatform()` : runtime, vrai seulement dans la coquille native (déjà utilisé par
  `geolocation.ts` / `native-bootstrap.ts`). Filet si jamais le mode de build était oublié.

Le build web (`npm run build`) ne déclenche **ni l'un ni l'autre** → **le web est garanti inchangé**
(zéro risque de régression desktop). Bonus : `capacitor.config.ts` a `webDir:'dist'` et **aucun
`server.url`** → l'app charge son **propre bundle local**, ce n'est pas un webview du site déployé.

NB : le **type de routeur** (`HashRouter` vs `BrowserRouter`, `App.tsx:161`) reste keyé sur
`import.meta.env.MODE === 'capacitor'` seul (il doit matcher le build, pas le runtime).

Les routes `/redesign/*` restent montées dans **les deux** builds (preview web + app). La bascule :

- **Web (`!isCapacitor`)** : on rend le bloc `<Route element={<Layout/>}>` actuel → ancien design.
- **App (`isCapacitor`)** : à la place, une **table de redirections** `ancien chemin → jumeau /redesign/*`
  + un **catch-all `* → /redesign/home`** (filet anti-écran-blanc pour les chemins sans jumeau, ex.
  `/reset-password`). Les pages redesign n'ont **aucune fuite** vers l'ancien design (vérifié : grep ⇒ 0
  `navigate`/`to` hors `/redesign`), donc l'utilisateur reste dans le nouveau design en permanence.

### Table de redirection (app uniquement)

| Ancien | → Redesign |
|---|---|
| `/` | `/redesign/home` |
| `/map` | `/redesign/map` |
| `/feed` | `/redesign/feed` |
| `/messages` · `/messages/:id` | `/redesign/messages` · `/redesign/messages/:id` |
| `/spot/:id` | `/redesign/spot/:id` |
| `/login` · `/register` | `/redesign/login` (register = toggle `isRegister`, déjà géré) |
| `/me` · `/profile` | `/redesign/profile` |
| `/profile/:id` *(public)* | `/redesign/profile/:id` |
| `/my-spots` · `/settings` · `/notifications` · `/friends` · `/logbook` · `/gear` | jumeaux `/redesign/*` |
| `/forgot-password` | `/redesign/forgot-password` |
| `/admin/spots` | `/redesign/admin` |
| `/admin/users` | `/redesign/admin/users` *(nouvel écran — Phase B)* |
| `/admin/gear` | `/redesign/admin/gear` *(nouvel écran — Phase B)* |
| `*` (catch-all) | `/redesign/home` |

Les chemins paramétrés passent par un petit composant `<ParamRedirect to="/redesign/spot/:id"/>` qui lit
`useParams()` et reconstruit l'URL (`<Navigate>` ne substitue pas les params seul).

Note edge (mineure) : l'ancien `/profile` public utilise `?id=` (query) là où le redesign utilise
`/redesign/profile/:id` (path). `/profile` sans id → `/redesign/profile` (profil perso). Cas rare
(aucune fuite interne ne l'emprunte) ; documenté, non bloquant.

### Audit « liens qui sortent vers le web » (2026-06-07)

Recherche exhaustive `src/` : **aucun** `<a href="/route">` interne (pas de full-reload qui sortirait du
SPA), **aucun** `window.location` / `Browser.open` / InAppBrowser, **aucun** lien vers le frontend déployé
(`github.io` / `vincentchaye` — seule occurrence = du *texte* d'affichage dans `screens/`, harnais mort).
Les seuls liens externes (`target="_blank"` `https:`) sont **légitimes** : itinéraire Maps
(`SpotDetailPage`/`SpotPage`), vidéos dans les messages, attributions tuiles OSM/CARTO/Esri — ils
*doivent* ouvrir le navigateur système, dans l'app comme sur le web. Ce ne sont **pas** des fuites vers
l'ancien design. La garantie « aucun écran ancien dans l'app » vient de la table de redirection +
catch-all, pas de la suppression de liens. *(Option future : ouvrir ces liens externes via le plugin
Capacitor `Browser` pour rester dans l'app — UX, hors scope.)*

## Plein écran natif (`PageFrame` + `native.css`)

Sur un vrai téléphone, le cadre `.ph` **fixe 390×844 arrondi** serait letterboxé (fond sombre autour sur
tout device > 390×844) et la **fausse barre d'état `.sb`** doublerait celle de l'OS. Les 19 pages redesign
passent **toutes** par `PageFrame` → un seul levier suffit :

- `PageFrame` ajoute la classe `native` sur `.lg-root` quand `isCapacitor`, et met le padding du wrapper
  externe à `0` (au lieu de `24`).
- Nouveau `redesign/styles/native.css` (importé par `PageFrame`), scopé `.lg-root.native` :
  - `.ph { width:100dvw; height:100dvh; border-radius:0; box-shadow:none; }`
  - `border-radius:0` sur `.bgs` / `.pw` / `.sc`
  - `.di` (faux notch) et `.sb` (fausse barre d'état) → `display:none`
  - `env(safe-area-inset-top/bottom)` sur `.sc` et la tab bar `.tbw` (notch + home-indicator).
    `viewport-fit=cover` est **déjà** dans `index.html`.

**Honnêteté / limite de vérification** : cette couche est **correcte-par-construction mais NON vérifiable
sans émulateur/device** dans cette session. Le comportement d'overlay de la barre d'état OS (Capacitor
`StatusBar`, `overlaysWebView`) n'est **pas confirmé** → on ajoute les `safe-area-inset` par défaut comme
filet. À valider sur émulateur avant release. (Même registre de franchise que pour les animations.)

## Admin — port complet au redesign

`RedesignAdminPage` (`/redesign/admin`) = **modération seule** (spots + spot-edits en attente + 5 users
récents). Manquent : gestion users complète (`/admin/users`, 278 L : recherche+pagination, toggle rôle
admin, ban/unban, delete) et admin matériel (`/admin/gear`, 280 L : CRUD `materiel-specs`).

**Phase B** porte les deux en design Liquid Glass, **réutilisant les APIs existantes** (aucun changement
backend) :

- `redesign/pages/AdminUsersPage.tsx` → route `/redesign/admin/users`. APIs : `GET /api/users?...`,
  `PATCH /api/users/:id` (roles + status), `DELETE /api/users/:id`.
- `redesign/pages/AdminGearPage.tsx` → route `/redesign/admin/gear`. APIs : `GET/POST/PATCH/DELETE
  /api/materiel-specs`.
- Le dashboard `/redesign/admin` gagne deux entrées (« Gérer les utilisateurs », « Matériel ») vers ces
  écrans. Les composants glass (`SectionHeader`, `Tag`, `AdminUserRow`, rows, inputs) sont réutilisés.

## Phasage (un seul livrable, deux étapes ordonnées ; rien n'est commité avant validation)

- **Phase A** — Bascule : `isCapacitor` dans `App.tsx`, table de redirection (admin users/gear pointent
  déjà vers les futures routes redesign), `native.css` + classe `native` sur `PageFrame`, script
  `"dev:native": "vite --mode capacitor"`. **Aucune régression web.**
- **Phase B** — Port admin users + gear au redesign (ci-dessus).

Comme **tout `redesign/` est untracked** et qu'on ne commite qu'après validation, il n'y a **pas
d'interim en prod** : pas d'îlot d'ancien design dans l'app à aucun moment.

## Vérification

- `npm run build` (web) : build OK, ancien design **intact** (diff routes = uniquement ajout du gate
  `isCapacitor`). Smoke web : `/` et `/map` inchangés, le CSS glass ne fuit pas hors `.lg-root`.
- `vite build --mode capacitor` : build OK.
- Preview via `dev:native` + Playwright : chaîne cœur **login → home → map → spot → messages → profil →
  admin → admin/users → admin/gear** contre le **vrai backend** (le « 19 écrans câblés aux vraies
  données » est hérité, pas re-vérifié cette session → on le re-teste ici).
- Plein écran : check CSS en forçant viewport téléphone + classe `native` (proxy ; device réel = à
  valider sur émulateur).

## Hors scope

- Mode clair (le redesign est sombre-only).
- Refactor DRY des maps type→libellé/couleur (noté ailleurs).
- Suppression du harnais `screens/` + `RedesignGallery` (preview), gardé.
- Vérification sur device/émulateur réel (à faire avant release).
