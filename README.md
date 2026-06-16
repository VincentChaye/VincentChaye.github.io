# ZoneDeGrimpe — App web (React)

Application web de cartographie des spots d'escalade en France : falaises, blocs, salles et magasins.
Sert aussi de **base à l'app mobile Capacitor** (legacy, iOS/Android) en attendant la bascule vers l'app
iOS native.

**[Voir le site](https://vincentchaye.github.io/ZoneDeGrimpe/)** · **[API](https://zonedegrimpe.onrender.com)**

> ℹ️ Ce dépôt = **frontend web uniquement**. Le projet est désormais découpé en 3 repos :
> - **Web (ici)** : `VincentChaye/ZoneDeGrimpe` — React + Vite + Capacitor
> - **Backend / API** : [`VincentChaye/zonedegrimpe-backend`](https://github.com/VincentChaye/zonedegrimpe-backend)
> - **iOS natif (SwiftUI)** : [`VincentChaye/zonedegrimpe-ios`](https://github.com/VincentChaye/zonedegrimpe-ios)

---

## Stack

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS |
| **State** | Zustand |
| **Carte** | MapLibre GL |
| **Animations** | Framer Motion |
| **i18n** | i18next + react-i18next (fr / en / es) |
| **Temps réel** | socket.io-client (messagerie, sorties) |
| **Offline** | IndexedDB (idb) + cache tuiles |
| **Mobile** | Capacitor (iOS / Android) — *legacy, voir ci-dessous* |
| **Déploiement** | GitHub Pages (GitHub Actions, `pages.yml`) |

---

## Démarrage

```bash
cd frontend-react
npm install
npm run dev        # serveur Vite (port 5173), proxy /api → http://localhost:3000
```

Le backend doit tourner à part (repo `zonedegrimpe-backend`, port 3000). Clé requise pour la carte :
`VITE_MAPTILER_KEY` (secret GitHub côté CI ; en local, `.env` dans `frontend-react/`).

## Scripts (`frontend-react/`)
```bash
npm run dev          # dev Vite
npm run build        # build web (base /ZoneDeGrimpe/) → GitHub Pages
npm run build:native # build Capacitor (base ./) pour l'app mobile
npm run preview      # preview du build
npm run cap:sync     # sync Capacitor → android/ ios/
```

---

## Stratégie mobile (transition)

L'app mobile actuelle est le **build Capacitor** de ce frontend (redesign « Liquid Glass », `native-build.yml`
produit l'APK Android et l'IPA iOS). C'est **temporaire** : l'app **iOS native SwiftUI**
([`zonedegrimpe-ios`](https://github.com/VincentChaye/zonedegrimpe-ios)) la remplacera sur iOS quand elle
atteindra la parité fonctionnelle. À ce moment-là, le build iOS de Capacitor sera retiré (et tout Capacitor
si Android n'est plus visé).

---

## Déploiement (GitHub Pages)

`.github/workflows/pages.yml` build `frontend-react` (`npm run build`, base `/ZoneDeGrimpe/`) et déploie sur
GitHub Pages → `https://vincentchaye.github.io/ZoneDeGrimpe/`. **L'URL dépend du nom du repo** (`ZoneDeGrimpe`),
conservé exprès. `native-build.yml` produit les binaires mobiles Capacitor (artefacts CI).

---

## Types de spots

| Type | Description |
|------|-------------|
| `crag` | Falaise · `boulder` Bloc · `indoor` Salle · `shop` Magasin |

---

## Auteur

**Vincent Chaye** — [LinkedIn](https://linkedin.com/in/vincent-chaye)

## Remerciements
- [OpenStreetMap](https://www.openstreetmap.org/) / Overpass (données)
- [MapLibre](https://maplibre.org/) + [MapTiler](https://www.maptiler.com/) (cartographie)
- [MongoDB Atlas](https://www.mongodb.com/atlas) (BDD)
