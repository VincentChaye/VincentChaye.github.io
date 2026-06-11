# Stories & Stories à la une — Design

**Date** : 2026-06-11
**Statut** : validé

## Objectif

Ajouter des stories éphémères (24h) façon Instagram et des « stories à la une » (highlights, collections permanentes sur le profil) à ZoneDeGrimpe, sur le design Liquid Glass (redesign mobile). L'ancien design web n'est pas touché.

## Décisions produit

- **Contenu d'une story** : photo ou vidéo (max 50 Mo, via Cloudinary), légende optionnelle, tag de spot optionnel cliquable vers la fiche spot.
- **Visibilité** : dépend de `privacy.isPrivate` de l'auteur.
  - Profil privé → seuls les **amis** (friendships acceptées) voient les stories.
  - Profil public → **followers + amis**.
  - Règle appliquée côté serveur sur tous les endpoints de lecture, y compris le contenu des highlights.
- **Highlights** : collections nommées avec couverture (modèle Instagram), permanentes jusqu'à suppression, affichées en ronds sur ProfilePage et PublicProfilePage.
- **Interactions** : « vu par » (liste visible par l'auteur), réaction emoji (notification à l'auteur), réponse en message privé (s'appuie sur la messagerie existante, message avec contexte `storyRef`).

## Architecture (option A retenue)

Backend dédié : route `backend/src/routes/stories.routes.js`, deux collections. Expiration **logique** à 24h (champ `expiresAt` filtré dans les requêtes), pas de TTL destructif sur les stories elles-mêmes — sinon les highlights casseraient. Purge différée : les stories jamais mises à la une sont supprimées automatiquement après 30 jours.

### Collection `stories`

```js
{
  _id, userId,                       // auteur (uid)
  media: { url, type: "image"|"video", width, height, duration },
  caption: string|null,
  spotId: ObjectId|null,
  createdAt, expiresAt,              // expiresAt = createdAt + 24h
  highlighted: boolean,              // true si dans ≥1 highlight
  purgeAt: Date|null,                // createdAt + 30j ; null si highlighted (index TTL dessus)
  views: [{ uid, at }],
  reactions: [{ uid, emoji, at }]
}
```

Index : `{ userId: 1, expiresAt: -1 }` ; index TTL sur `purgeAt`.

### Collection `story_highlights`

```js
{ _id, userId, name, coverUrl, storyIds: [ObjectId], createdAt, updatedAt }
```

### Upload

Nouveau storage Cloudinary `zonedegrimpe/stories` dans `backend/src/upload.js`, photo + vidéo (mêmes formats que `messageMediaStorage`), limite 50 Mo.

## API — `/api/stories`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/stories` | requireAuth | multipart : média + caption + spotId |
| GET | `/api/stories/feed` | requireAuth | stories actives des suivis + amis, groupées par auteur, flag `seen` par story, visibilité serveur |
| GET | `/api/stories/user/:uid` | requireAuth | stories actives d'un user (règle de visibilité) ; l'auteur voit aussi ses stories expirées non purgées (archives) |
| POST | `/api/stories/:id/view` | requireAuth | marque vue (idempotent) |
| GET | `/api/stories/:id/views` | requireAuth | liste « vu par » — auteur uniquement |
| POST | `/api/stories/:id/react` | requireAuth | `{ emoji }` → notification `story_reaction` |
| POST | `/api/stories/:id/reply` | requireAuth | `{ text }` → crée/réutilise la conversation DM, message avec `storyRef` |
| DELETE | `/api/stories/:id` | requireAuth | auteur ou admin |
| GET | `/api/stories/highlights/:uid` | public | highlights d'un user ; contenu filtré par visibilité |
| POST | `/api/stories/highlights` | requireAuth | `{ name, coverUrl?, storyIds }` |
| PATCH | `/api/stories/highlights/:id` | requireAuth | nom, couverture, ajout/retrait de stories (propriétaire) |
| DELETE | `/api/stories/highlights/:id` | requireAuth | propriétaire ou admin |

Ajouter une story à un highlight ⇒ `highlighted: true` + `purgeAt: null`. La retirer de son dernier highlight ⇒ recalcul de `purgeAt`.

Nouveau type de notification : `story_reaction` (helper `createNotification` existant).

## UI (redesign Liquid Glass, `frontend-react/src/redesign/`)

- **FeedPage** : strip horizontal de stories en haut (réintégration du design retiré faute de backend). Premier rond « + Ta story », puis auteurs triés non-vues d'abord ; anneau dégradé = non-vu, gris = vu.
- **StoryViewer** (composant overlay plein écran) : barres de progression segmentées, auto-avance (5 s photo / durée vidéo), tap droite/gauche pour naviguer entre stories puis auteurs, swipe bas pour fermer. Pastille spot cliquable → `/redesign/spot/:id`. Champ « Répondre… » + emojis rapides (🔥 💪 🧗 👏). Pour l'auteur : compteur de vues → bottom sheet « vu par ».
- **Création** : sélection photo/vidéo, légende, recherche de spot, publier.
- **ProfilePage / PublicProfilePage** : rangée de ronds « À la une » sous l'en-tête. Sur son propre profil : « + » pour créer un highlight depuis ses archives (stories expirées non purgées).
- **i18n** : clés ajoutées dans fr/en/es.

## Hors périmètre (YAGNI)

Pas de stickers/dessin/musique, pas de stories de groupe, pas de mentions @user, pas de repartage. Ancien design web non modifié.

## Tests

Backend : règles de visibilité (privé/public × ami/follower/étranger), filtrage `expiresAt`, cycle highlight (story à la une jamais purgée, recalcul de `purgeAt` au retrait), permissions (views réservées à l'auteur, delete auteur/admin).
