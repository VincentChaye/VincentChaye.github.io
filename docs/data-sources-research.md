# Veille — Sources de données climbing externes

**Date** : avril 2026
**Contexte** : la map actuelle importe depuis OpenStreetMap. Qualité inégale ("1 spot par voie" par endroits). Objectif : identifier les meilleures sources alternatives pour couvrir **l'Europe en priorité, extensible au global**.

---

## Résultats de la veille

### 1. OpenBeta — ❌ Écarté

- API GraphQL `api.openbeta.io` injoignable au moment du test
- Jeu de données public (`github.com/OpenBeta/climbing-data`) **USA uniquement** (snapshot Mountain Project 2020)
- Format JSONL, licence CC0
- **Aucune couverture Europe** → inexploitable

### 2. Camptocamp.org — ✅ Meilleure option open pour l'Europe

- API REST publique sans auth : `https://api.camptocamp.org/waypoints?wtyp=climbing_outdoor`
- Géré par une **association à but non lucratif suisse** → pas un concurrent commercial
- Licence **CC BY-SA**

**Couverture observée** (échantillon 20 waypoints) :
- France (~65%)
- Suisse (Jura, Canton Bern)
- Espagne (Catalogne, Lleida)
- Italie (Alpes)
- Slovénie
- Turquie
- États-Unis (Colorado, Utah)

**Forces** :
- Descriptions riches, 7 langues
- Champ `access_period` (restrictions saisonnières)
- Hiérarchie propre areas → waypoints → routes
- `quality` field indique les docs bien édités

**Contraintes techniques à prévoir à l'import** :
- Coordonnées en **EPSG:3857** (Web Mercator) → reprojection WGS84 obligatoire
- Grade / rock_type **absents** du waypoint → requête secondaire `/routes?waypoints=<id>` nécessaire
- `summary` en syntaxe wiki (`[img=...]`, `[[waypoints/...|...]]`) → parsing à faire

**Zones faibles** : Scandinavie, UK, Balkans, Europe de l'Est (hors Slovénie)

### 3. theCrag — 🔴 Concurrent direct, API fermée

- **90 000+ crags / 917 000+ voies** (leurs chiffres)
- Même produit que ZoneDeGrimpe, en plus mature (~25 ans)
- Pages doc retournent **HTTP 403** aux user-agents automatisés
- API nécessite clé d'application + validation (partenariat)
- **À ne pas utiliser** : on ne construit pas sur le dos d'un concurrent frontal

### 4. OSM — 🟡 Source actuelle, à améliorer pas à remplacer

- Seule source vraiment **mondiale et libre** (ODbL)
- Problème "1 spot par voie" = problème de tagging, pas de source
- Fix par filtre Overpass :
  ```
  nwr[sport=climbing][climbing:type!=route][climbing:type!=boulder_problem]
  + nwr[leisure=sports_centre][sport=climbing]
  + nwr[climbing=area]
  ```

---

## Tableau comparatif concurrents/sources

| Source | Concurrent ? | Couverture | API | Licence |
|---|---|---|---|---|
| **theCrag** | 🔴 Frontal | Globale (excellente) | Fermée (clé) | Propriétaire |
| **27crags** | 🟠 Partiel | Nordique/Europe | Fermée | Propriétaire |
| **Vertical Life** | 🟠 Partiel | Alpes/Italie | Fermée | Propriétaire |
| **Mountain Project** | 🟡 US only | USA | Semi-fermée | Propriétaire (REI) |
| **Camptocamp** | 🟢 Non (assoc. mountaineering) | Europe/Alpes + extensions | Publique | CC BY-SA |
| **OSM** | 🟢 Non (infra) | Globale | Publique | ODbL |
| **OpenBeta** | 🟢 Non (open source) | USA seul | GraphQL public | CC0 |

---

## Stratégie retenue

**Positionnement ZoneDeGrimpe** : UX moderne mobile-first, communauté agréable à prendre en main, simplicité vs la complexité de theCrag. Différenciation = accessibilité, pas exhaustivité de données.

**Architecture data à deux couches** :

### Couche 1 — OSM (backbone mondial)
- Couverture globale garantie
- Filtre anti-voies individuelles à ajouter dans `backend/scripts/import-osm.js`

### Couche 2 — Camptocamp (enrichissement Europe/Alpes)
- Nouveau script `backend/scripts/import-camptocamp.js` à créer
- Bbox Europe élargie (≈ `-10, 35, 30, 60`)
- Stockage avec `source: "camptocamp"` + `camptocamp_id`
- Fusion avec OSM via proximité < 200 m + similarité nom (Levenshtein)
- Camptocamp écrase OSM sur doublons (données plus structurées)

### Couche 3 (futur) — theCrag
- Uniquement si partenariat formel envisagé
- Ne pas bloquer la roadmap dessus

---

## Pourquoi pas theCrag, malgré la couverture

1. **Concurrent direct** — on ne veut pas dépendre d'un produit frontal
2. **API fermée** — accès discrétionnaire, peut être coupé
3. **Pas nécessaire** pour notre positionnement (qualité/UX > volume)
4. **Vulnérabilité stratégique** — toute différenciation devient dépendance

---

## Prochaines étapes (à déclencher plus tard)

### Option A — Quick fix OSM
- Modifier `backend/scripts/import-osm.js`
- Ajouter filtre `climbing:type!=route` / `!=boulder_problem`
- Effort : ~½ journée

### Option B — Pipeline complet (recommandé)
- A + nouveau script Camptocamp + dédoublonnage
- Effort : ~2-3 jours
- Résultat : base de spots cohérente, qualité améliorée, extensible

### Option C — Veille
- Ne rien faire maintenant, capitaliser d'abord sur UX/communauté

---

## Références utiles

- Camptocamp API : `https://api.camptocamp.org`
- Doc Camptocamp : `https://www.camptocamp.org/`
- OpenBeta : `https://github.com/OpenBeta/climbing-data`
- theCrag : `https://www.thecrag.com` (accès restreint)
- OSM Overpass : `https://overpass-turbo.eu`
