# Review visuel & fonctionnel — Redesign Liquid Glass (2026-06-10)

Review menée sous Playwright (viewport iPhone 390×844, routes `/redesign/*`), serveur dev local
sur données de prod (`zonedegrimpe.onrender.com`).

## Optimisation livrée
- Nouveau calque additif `styles/liquid-glass-enhance.css` (n'édite PAS le fichier généré
  `liquid-glass.css`), importé en dernier dans `PageFrame` + `RedesignGallery`.
- Matériau « Apple Liquid Glass » : arête spéculaire toutes-faces (reflet haut vif → liseré
  faible tout autour → ombre interne basse = épaisseur) sur `.g/.gt/.gk/.ib/.tb/.half-sheet` ;
  flou + saturation accrus (lentille) **sans** toucher la luminance (lisibilité du texte préservée) ;
  pastilles `.ib` rendues vraiment translucides ; pilule d'onglet actif + reflet ; scrim de bas
  adouci/réchauffé (l'ancien `rgba(8,8,8,.85)` aplatissait le contenu) ; gloss diagonal sur le CTA or.
- Accessibilité : `prefers-reduced-transparency` neutralise les liserés ; `prefers-reduced-motion`
  déjà géré en amont. `tsc -b` OK.

## État par écran (review complète — compte test Vincent Chaye)
| Écran | Visuel | Fonctionnel |
|-------|--------|-------------|
| Home | ✅ hero + CTA glossy, stats card détourée, tab bar premium | ✅ CTA → carte |
| Carte | ✅ map sombre, search/FAB/zoom en glass | ⚠️ « 0 spots » au 1er rendu (chargement données), bouton retour sur un onglet racine = discutable |
| Recherche | ✅ rows à arêtes glass, pills or | ✅ filtre Falaise → 295 résultats, row → spot |
| Spot detail | ✅ stats row, cards vides détourées, share en pastille glass | ✅ ouverture depuis la liste |
| Login | ✅ form glass, segmented, Apple/Google | ✅ connexion → redirige, session OK |
| Profil | ✅ avatar+ring, badges stats détourés, menu glass | ✅ données réelles |
| Messages | ✅ rows conversation, avatars, sections Groupes | ✅ ouverture conversation |
| Conversation | ✅ bulles entrantes glass / sortantes or lisibles sur photo | ✅ rendu live |
| Feed | ✅ cards activité, badges cotation, CTA glass | ✅ données réelles |
| Logbook | ✅ pyramide en barres or sur card glass | ✅ stats + liste |
| Settings | ✅ sections groupées, toggles iOS or | ✅ rendu |
| Gear | ✅ cards matériel, badges statut (OK/Suivi) | ✅ rendu |

0 erreur console sur toute la session. `tsc -b` OK.

## Vérifications de couche (preuves, pas à l'œil)
- `getComputedStyle('.tb').backdropFilter` = `blur(40px) saturate(2.2)` → la surcouche est bien live.
- Carte : « 0 spots » au 1er rendu était un **artefact de timing**, pas un bug → après settle, 999
  spots / 13 markers / 12 clusters. Le marker navigue vers `/redesign/spot/:id` (pas de half-sheet
  dans l'app live).
- `.half-sheet` + `.sheet-handle` ne sont rendus que par `SpotSheet` → `MapScreen` (vitrine `/redesign`).
  Vérifié dans la galerie : poignée plus lumineuse + arête spéculaire, lisible. `.gk` (glass épaisse)
  n'est utilisée nulle part → pas de surcharge.

## Caveats (à connaître avant prod)
- **Perf mobile non mesurée sur device.** J'ai monté le flou (`--bmd` 24→30, `--blg` 36→40, tab bar
  →40) ; testé en Chrome desktop headless uniquement. `backdrop-filter` est l'élément le plus coûteux
  de ce design et c'est une app Capacitor → vérifier le framerate sur un vrai téléphone. Mitigation
  déjà prise : **aucun** `backdrop-filter` ajouté sur `.ib` (boutons-icônes nombreux, gratuits avant).
- **CTA or volontairement non glossés** pour ne pas créer d'incohérence (seul `.morph-btn` du home
  aurait reçu le gloss). Le bon correctif « max glass » = composant `<GoldButton>` partagé portant le
  gloss sur tous les CTA or — refactor multi-pages, hors périmètre de cette passe non destructive.

## Pistes (non faites, à valider)
- Composant `<GoldButton>` partagé (unifie + glosse tous les CTA or).
- Accessibilité de fond : le redesign est en `<div>` non-sémantiques (arbre a11y quasi vide) →
  rôles/aria à ajouter si support lecteur d'écran visé.
