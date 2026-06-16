# Redesign « Liquid Glass v2 » — port TSX du prototype

Port **fidèle au pixel** du prototype HTML `ZoneDeGrimpe-LiquidGlass-v2.html` (iOS 26 Liquid Glass,
thème sombre/ambre) vers une architecture **TSX multi-fichiers**, **isolée** de l'app existante.

But (multi-étapes) : construire ici les écrans du nouveau design **sans toucher** aux pages actuelles,
puis — étape ultérieure — remplacer une à une les pages `src/pages/*` par ces écrans et y brancher les
vraies données.

## Aperçu

Route **`/redesign`** (déclarée dans `src/App.tsx`, **hors `<Layout>`**, chargée en `lazy()`).
Reproduit la vitrine desktop du prototype : panneau latéral + cadre iPhone + tab bar.
Navigation via le panneau latéral ou la tab bar. Aucun impact sur le reste de l'app.

```bash
npm run dev   # puis http://localhost:5173/ZoneDeGrimpe/redesign
```

## Statut

| Phase | Contenu | État |
|-------|---------|------|
| A | CSS scopé + coques + primitives + **3 écrans témoins** (Accueil, Carte, Spot Détail) + vitrine | ✅ fait |
| B | **16 écrans restants** (Login, Social, Carnet, Notifications, Recherche, Proposer, Messagerie, Conversation, Profil, Paramètres, Admin, Mot de passe oublié, Mes Spots, Amis, Profil Public, Matériel) — **les 19 écrans sont convertis et vérifiés pixel-fidèles** | ✅ fait |
| swap | Remplacer `pages/*` par ces écrans + brancher données | ✅ **complet — 18 écrans câblés + vérifiés en données RÉELLES** (login admin `natil01` via Playwright, `npm run build` OK) |
| reste | migrer le CSS verbatim → tokens Tailwind + responsive (retrait cadre téléphone) + i18n `t(...)` | ⬜ à faire |

### Swap — pages câblées aux vraies données (`pages/`)

Routes **additives** (les pages live restent intactes), montées hors `<Layout>` dans `App.tsx` :

| Page swap | Route | Page live correspondante | Données |
|-----------|-------|--------------------------|---------|
| `pages/SpotDetailPage.tsx` | `/redesign/spot/:id` | `/spot/:id` (`SpotPage`) | `/api/spots/:id` + `/api/climbing-routes/spot/:id` + `/api/reviews/spot/:id` |
| `pages/SearchPage.tsx` | `/redesign/search` | `/map` (recherche) | `/api/spots` (filtre type + nom côté client) → lignes cliquables vers `/redesign/spot/:id` |
| `pages/LoginPage.tsx` | `/redesign/login` | `/login` + `/register` | **VRAI auth** : POST `/api/auth/login` & `/api/auth/register`, token rangé dans `useAuthStore.login()` → session valable dans toute l'app. `?next=…` pour rediriger après login. OAuth Apple/Google différé (inertes). |
| `pages/LogbookPage.tsx` 🔒 | `/redesign/logbook` | `/logbook` (`LogbookPage`) | `/api/logbook/stats` + `/api/logbook?limit=20` (`auth:true`). Stats 3 cartes + pyramide (triée dur→haut) + dernières ascensions. Non connecté → invite login. |
| `pages/NotificationsPage.tsx` 🔒 | `/redesign/notifications` | `/notifications` (`NotificationsPage`) | réutilise `useNotificationsStore` (`/api/notifications`). Groupes Aujourd'hui/Cette semaine/Plus tôt, texte FR par type (précédence `notif.message`), clic = marquer lu + « Tout lire ». |
| `pages/ProfilePage.tsx` 🔒 | `/redesign/profile` | `/me` (`MyProfilePage`) | identité depuis `useAuthStore` ; stats `/api/logbook/stats` (Ascensions/Spots/Max) + `/api/users/:id/public` (Amis/Contribs). Menu → routes redesign si dispo, sinon live. Déconnexion réelle. |
| `pages/MySpotsPage.tsx` 🔒 | `/redesign/my-spots` | `/my-spots` (`MySpotsPage`) | onglets Favoris (`/api/bookmarks`) + Contributions (`/api/spots/my-submissions`). `?tab=contrib`. Badges statut (Approuvé/En attente/Refusé), clic → `/redesign/spot/:id`. |
| `pages/SettingsPage.tsx` 🔒 | `/redesign/settings` | `/settings` (`SettingsPage`) | Email/Thème/Langue/Version en RÉEL ; toggles Notifications = **vraies** prefs (`PATCH /api/users/me`, `friendRequest`/`newFollower`/…). Édition profil/mdp/thème/langue → délègue à `/settings` live. |
| `pages/ForgotPasswordPage.tsx` | `/redesign/forgot-password` | `/forgot-password` | `POST /api/auth/forgot-password` (200 anti-énumération → confirmation neutre). Quirk du proto corrigé : vrai CTA doré. |
| `pages/PublicProfilePage.tsx` | `/redesign/profile/:id` | `/profile?id=` (`ProfilePage`) | `/api/users/:id/public` + `/api/logbook/user/:id` (403 toléré). Stats Ascensions/**Abonnés**/Amis/Contribs (pas de « spots grimpés » public). « Ajouter ami » = `POST /api/friends/request/:id` ; « Message » → `/messages` live. |
| `pages/FriendsPage.tsx` 🔒 | `/redesign/friends` | `/friends` (`FriendsPage`) | `/api/friends/requests` + `/api/friends`. Accepter/Refuser = `PATCH /api/friends/:id/accept\|decline` réels. Recherche = filtre client. Pas d'« amis en commun »/présence (non exposés). `FriendRow` étendu (avatar/initial/onClick). |
| `pages/FeedPage.tsx` | `/redesign/feed` | `/feed` (`FeedPage`) | `/api/feed/global` (public). Items `logbook`/`spot`. Stories + compteurs likes/commentaires retirés (pas de données). Carte spot → `/redesign/spot/:id`. |
| `pages/GearPage.tsx` 🔒 | `/redesign/gear` | `/gear` (`GearPage`) | réutilise `useGearStore` (`/api/user-materiel/me`). Groupé par catégorie, badge EPI réel (ok/watch/retire). Ajout → `/gear` live, catalogue → `/gear/catalogue`. `Toggle` & `GearRow` inchangés côté galerie. |
| `pages/HomePage.tsx` | `/redesign/home` | `/` (`HomePage`) | compteurs réels `/api/spots/count` + `/api/users/count`. Navigation vers routes redesign. |
| `pages/ProposePage.tsx` 🔒 | `/redesign/propose` | wizard propose | écriture réelle `POST /api/spots` (admin→approuvé, user→pending). Wizard 4 étapes condensé ; `location` via géoloc + lat/lng. `TypeCard` étendu (`onClick`). |
| `pages/AdminPage.tsx` 👑 | `/redesign/admin` | `Admin*Page` | `requireAdmin`. `/api/spots/pending` (+approve/reject), `/api/spot-edits/pending` (+approve/reject), compteurs, `/api/users` récents. « Voir diff » → `/admin/spots` live. |
| `pages/MessagesPage.tsx` 🔒 | `/redesign/messages` | `/messages` | réutilise `useMessagesStore` (socket). DM + groupes, dernier message + non-lus réels. |
| `pages/ConversationPage.tsx` 🔒 | `/redesign/messages/:id` | conversation | openConversation + messages + sendMessage réels. Événements système (`outing_*`) en notices centrées ; partage/PJ → placeholder (texte seul). |
| `pages/MapPage.tsx` | `/redesign/map` | `/map` (`MapPage`) | **vrai Leaflet** (tuiles sombres CARTO) + marqueurs `/api/spots` **clusterisés** (coords = `geometry.coordinates`, pas `properties`), filtres type, marqueur → `/redesign/spot/:id`, recherche → `/redesign/search`, FAB → propose. `FilterPill` étendu (`onClick`). |

> **Niveaux de vérif (Playwright, login admin réel `natil01`)** — à ne pas confondre :
> - **Données réelles** (lecture vérifiée live) : Accueil, Carte, Recherche, Spot, Login, Carnet, Profil,
>   Profil public (`/profile/<myUid>`), Mes Spots, Notifications, Paramètres, Amis, Social, Matériel, Messagerie
>   + Conversation (DM texte + événements système).
> - **Contrat d'écriture vérifié** (mais mutation réelle NON exécutée pour ne pas polluer la prod) :
>   Proposer (`POST /api/spots`), Admin approve/reject, `sendMessage`, accepter/refuser ami. Le pipeline
>   auth-PATCH est confirmé par un `PATCH /api/users/me` idempotent (→200) côté Paramètres.
> - **Layout vérifié via stub** (file vide sur le compte test) : cartes de modération Admin (spots+edits
>   en attente) rendues avec données simulées — les mappings (`submittedBy.displayName`, `spotName`,
>   `changes`) sont confirmés corrects côté backend.

Coque commune : **`components/PageFrame.tsx`** (frame `.ph` + fond rocheux `.bgs` + scroll `.pw`/`.sc`)
— importe le CSS scopé. Prop optionnelle **`tab`** : affiche la **TabBar flottante** câblée au routeur
(Accueil/Carte/Social/Messages/Profil → `/redesign/home|map|feed|messages|profile`, onglet actif surligné).
Mise sur les 5 écrans principaux ; les sous-pages gardent le bouton **retour** (← en haut à gauche).
Prop **`flush`** : annule le `padding-bottom:110px` (réservé à la TabBar) — à utiliser sur les pages avec
une barre collée en bas (ex. composer de **Conversation**) pour éviter un trou de 110px sous la barre. **Pattern à répliquer** pour les autres écrans :
- réutilise les **motifs** (`GlassCard`/`RouteRow`/`ReviewCard`/`SearchResultRow`/`NavBar`/`Tag`), PAS
  l'écran `.sc` (couplé à la vitrine) ; navigation via `useNavigate`/`useParams`, plus de `goTo`.
- **`PageFrame`** obligatoire : le `backdrop-filter` du glass se calcule contre `.bgs` (sinon il s'aplatit).
- **états vides honnêtes** (« Aucune voie renseignée », « — » pour note/orientation absentes, « Aucun spot
  ne correspond ») — la plupart des spots OSM ont 0 voie / 0 avis ; tester peuplé ET nu.
- **pas de donnée inventée** : la « Distance » de la maquette → remplacée (« Avis ») ou supprimée (pas de
  géoloc → filtre « Près de moi » retiré dans Recherche).
- **périmètre LECTURE** (+ retour/GPS/partage/navigation). Différés : bookmark, ajout/édition voie & avis,
  logbook, photos, édition spot, suppression admin, recherche serveur, géoloc. **i18n en dur (FR)** → `t(...)`.

> **Quirk fidèle reproduit** : dans le proto, le bouton « Envoyer le lien » de l'écran *Mot de passe oublié*
> a des attributs `style` dupliqués ; le navigateur ne garde que le premier → le bouton rend en carte glass
> à texte sombre (PAS de dégradé doré). On reproduit le rendu réel. À corriger au swap si souhaité.

## Arborescence

```
redesign/
  styles/liquid-glass.css   # GÉNÉRÉ : <style> du proto, VERBATIM, scopé .lg-root (cf. ci-dessous)
  lib/
    css.ts                  # css('a:b;c:d') -> CSSProperties (copie verbatim des style inline)
    icons.tsx               # SVG inline du proto, VERBATIM (ne PAS remapper vers lucide)
    nav.ts                  # ScreenId, TABS, SIDE_NAV
  components/               # primitives + coques + motifs réutilisables (découpage profond)
    primitives.tsx          # GlassCard(.g) IconButton(.ib) Tag(.tag) SectionHeader(.sh) Stars
    PhoneFrame StatusBar NavBar TabBar SidePanel   # coques (échafaudage preview, jetable au swap)
    StatsGrid ListRow FeatureCard FilterPill MapMarker RouteRow ReviewCard SpotSheet   # motifs A
    StoryItem PyramidBar AscentRow SearchResultRow ConversationRow TypeCard   # motifs B
    ProfileMenuRow Toggle FavSpotCard GearRow FriendRow AdminUserRow          # motifs B
  screens/                  # 1 fichier par écran (19) — wrapper .sc + active===id + goTo
    HomeScreen MapScreen SpotDetailScreen                 # A
    LoginScreen ForgotPasswordScreen FeedScreen LogbookScreen NotificationsScreen
    SearchScreen ProposeScreen MessagesScreen ProfileScreen SettingsScreen
    AdminScreen ConversationScreen MySpotsScreen FriendsScreen PublicProfileScreen GearScreen
  RedesignGallery.tsx       # vitrine .dw (state `active` + goTo, tous les écrans montés)
  index.ts
```

## Stratégie CSS (fidélité = priorité)

Le `<style>` du prototype est **conservé tel quel** dans `styles/liquid-glass.css` (c'est le seul moyen de
garantir « sans changer le visuel »). Les sélecteurs globaux (`*`, `html`, `body`, `svg` + toutes les
classes) sont **préfixés `.lg-root`** ; `html`/`body` sont repliés sur `.lg-root` (centrage + fond sombre) ;
`:root` et `@keyframes` restent globaux. Résultat : la feuille ne peut pas repeindre l'app existante.
Bonus : Vite la **code-split** (chunk `redesign-*.css` chargé uniquement sur `/redesign`).

**Régénérer** (si le prototype évolue) — script de scoping (brace-aware) :

```python
# extraire le bloc <style> (lignes 8-227) du prototype dans /tmp/zdg_css_raw.css, puis :
import sys
src = open('/tmp/zdg_css_raw.css').read()
src = src.replace('@keyframes gp{0%,100%{opacity:.7}50%{opacity:1}}50%{opacity:1}}50%{opacity:1}}',
                  '@keyframes gp{0%,100%{opacity:.7}50%{opacity:1}}')  # corrige un keyframe malformé du proto
def split_top_commas(s):
    parts, d, cur = [], 0, ''
    for ch in s:
        d += ch in '([' ; d -= ch in ')]'
        if ch == ',' and d == 0: parts.append(cur); cur = ''
        else: cur += ch
    parts.append(cur); return parts
def prefix(sel):
    out=[]
    for raw in split_top_commas(sel):
        s=raw.strip()
        if not s: continue
        if s in ('html','body'): out.append('.lg-root')
        elif s.startswith(('html ','body ')): out.append('.lg-root '+s[5:])
        else: out.append('.lg-root '+s)
    return ',\n'.join(out)
def process(c):
    out,i,n=[],0,len(c)
    while i<n:
        ch=c[i]
        if ch.isspace(): out.append(ch); i+=1; continue
        if c.startswith('/*',i):
            j=c.find('*/',i+2); j=n-2 if j==-1 else j; out.append(c[i:j+2]); i=j+2; continue
        j=i
        while j<n and c[j]!='{': j+=1
        if j>=n: out.append(c[i:]); break
        prelude=c[i:j]; d=0; k=j
        while k<n:
            if c[k]=='{': d+=1
            elif c[k]=='}':
                d-=1
                if d==0: break
            k+=1
        body=c[j+1:k]; p=prelude.strip()
        if p.startswith(('@keyframes','@font-face')) or (p.startswith('@') and not p.startswith(('@media','@supports'))) or p.startswith(':root'):
            out.append(prelude+'{'+body+'}')
        elif p.startswith(('@media','@supports')):
            out.append(prelude+'{'+process(body)+'}')
        else:
            out.append(prefix(prelude)+'{'+body+'}')
        i=k+1
    return ''.join(out)
open(sys.argv[1],'w').write(process(src))
```

## Idiome de conversion HTML → TSX

- `class=` → `className=` ; `onclick="goTo('x')"` → `onClick={() => goTo('x')}` (prop `goTo`).
- Styles inline VERBATIM via `css('…')` (`lib/css.ts`) — gère camelCase + préfixes vendeur.
- SVG via `lib/icons.tsx` (tracés du proto, tailles/strokes en props). Pas de lucide ici.
- Données = **mock statique** (comme le proto). Le branchement aux stores/API = étape swap.

## Notes pour l'étape de remplacement (swap)

- **Les `screens/*` ne sont pas « drop-in ».** Chaque écran embarque le couplage à la vitrine :
  wrapper `.sc`, bascule `active === id` et appels `goTo(ScreenId)`. Au swap, ça devient une page
  toujours visible + navigation routeur (`useNavigate`) → prévoir un refactor léger par écran.
- **Le glass a besoin d'un fond.** Le `backdrop-filter` se calcule contre le fond rocheux animé du
  `PhoneFrame` (`.bgs/.bgg`). Dans l'app réelle, prévoir une couche de fond équivalente derrière les écrans,
  sinon le glass devient plat.
- Mapping écran → page : `accueil→HomePage`, `carte→MapPage`, `spot-detail→SpotPage`, `fil→FeedPage`,
  `carnet→LogbookPage`, `messagerie→MessagesPage`, `profil→MyProfilePage`, `parametres→SettingsPage`,
  `admin→Admin*Page`, `amis→FriendsPage`, `profil-public→ProfilePage`, `materiel→GearPage`,
  `mes-spots→MySpotsPage`, `login→Login/RegisterPage`, `forgot-password→ForgotPasswordPage`,
  `notifications→NotificationsPage` ; `recherche`/`proposer`/`conversation` = vues sans page dédiée.
- Le brief `zdg/CLAUDE.md` (dans l'archive) = **référence design**, pas le plan de build (il proposait de
  modifier `Header/TabBar/Layout` en place — on a délibérément isolé à la place).
