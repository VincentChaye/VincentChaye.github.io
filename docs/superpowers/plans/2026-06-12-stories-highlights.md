# Stories & Stories à la une — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stories éphémères 24h (photo/vidéo, légende, tag spot) avec visibilité amis/followers, interactions (vu par, réaction emoji, réponse DM) et « stories à la une » (highlights permanents) sur les profils — design Liquid Glass uniquement.

**Architecture:** Backend dédié `stories.routes.js` + deux collections MongoDB (`stories`, `story_highlights`). Expiration logique via `expiresAt` (pas de TTL destructif), purge auto à 30 j via index TTL sur `purgeAt` (mis à `null` si la story est à la une). Logique de visibilité extraite en fonctions pures testées avec `node --test`. La réponse à une story réutilise la messagerie existante côté client (conversation DM + socket `message` avec `sharedObject` de type `story` — déjà accepté tel quel par la validation socket).

**Tech Stack:** Express (ESM), MongoDB driver, Cloudinary/multer (déjà en place), node:test (backend), React + TypeScript inline-styles Liquid Glass (`css()` helper), zustand `messages.store` pour les réponses.

**Spec:** `docs/superpowers/specs/2026-06-11-stories-highlights-design.md`

**Conventions du repo à respecter :**
- Routes backend : factory `export function storiesRouter(db)` retournant un `Router`, montée dans `server.js`.
- Erreurs JSON : `{ error: "snake_case" }`, 500 → `{ error: "server_error" }`.
- Frontend redesign : texte FR en dur (PAS de i18n — toutes les pages redesign sont en FR dur, la spec mentionnait i18n mais la convention redesign prime), styles inline via `css()` de `../lib/css`, composants dans `frontend-react/src/redesign/components/`.
- Pas de `Co-Authored-By: Claude` dans les commits.

---

### Task 1: Helpers purs de visibilité + purge (TDD)

**Files:**
- Create: `backend/src/stories.helpers.js`
- Create: `backend/test/stories.helpers.test.js`
- Modify: `backend/package.json` (script `test`)

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `backend/test/stories.helpers.test.js` :

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canViewStories,
  computePurgeAt,
  STORY_TTL_MS,
  PURGE_DELAY_MS,
} from "../src/stories.helpers.js";

test("constantes : 24h et 30 jours", () => {
  assert.equal(STORY_TTL_MS, 24 * 3600 * 1000);
  assert.equal(PURGE_DELAY_MS, 30 * 24 * 3600 * 1000);
});

test("soi-même voit toujours ses stories", () => {
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: true, isFriend: false, isFollower: false }), true);
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: true, isFriend: false, isFollower: false }), true);
});

test("profil privé : seuls les amis voient", () => {
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: false, isFriend: true, isFollower: false }), true);
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: false, isFriend: false, isFollower: true }), false);
  assert.equal(canViewStories({ isPrivate: true }, { isSelf: false, isFriend: false, isFollower: false }), false);
});

test("profil public : amis et followers voient", () => {
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: false, isFriend: true, isFollower: false }), true);
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: false, isFriend: false, isFollower: true }), true);
  assert.equal(canViewStories({ isPrivate: false }, { isSelf: false, isFriend: false, isFollower: false }), false);
});

test("computePurgeAt : +30j si non mise à la une, null sinon", () => {
  const created = new Date("2026-06-12T10:00:00Z");
  assert.deepEqual(computePurgeAt(created, false), new Date(created.getTime() + PURGE_DELAY_MS));
  assert.equal(computePurgeAt(created, true), null);
});
```

Ajouter dans `backend/package.json`, section `scripts` :

```json
"test": "node --test test/"
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module .../src/stories.helpers.js`

- [ ] **Step 3: Implémentation minimale**

Créer `backend/src/stories.helpers.js` :

```js
export const STORY_TTL_MS = 24 * 3600 * 1000;
export const PURGE_DELAY_MS = 30 * 24 * 3600 * 1000;

/**
 * Règle de visibilité des stories d'un auteur.
 * Profil privé → amis uniquement ; profil public → amis + followers.
 */
export function canViewStories({ isPrivate }, { isSelf, isFriend, isFollower }) {
  if (isSelf) return true;
  if (isPrivate) return !!isFriend;
  return !!isFriend || !!isFollower;
}

/** Date de purge auto : +30j, ou null si la story est dans un highlight (jamais purgée). */
export function computePurgeAt(createdAt, highlighted) {
  return highlighted ? null : new Date(createdAt.getTime() + PURGE_DELAY_MS);
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `cd backend && npm test`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/stories.helpers.js backend/test/stories.helpers.test.js backend/package.json
git commit -m "feat(stories): helpers visibilité + purge avec tests node:test"
```

---

### Task 2: Storage Cloudinary pour les stories

**Files:**
- Modify: `backend/src/upload.js`

- [ ] **Step 1: Ajouter le storage**

Dans `backend/src/upload.js`, après le bloc `messageMediaFilter` (ligne ~74), ajouter :

```js
const storyMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: "zonedegrimpe/stories",
      resource_type: isVideo ? "video" : "image",
      ...(isVideo
        ? {}
        : { transformation: [{ width: 1080, height: 1920, crop: "limit", quality: "auto:good" }] }),
    };
  },
});
```

Et à la fin, avec les autres exports multer :

```js
export const uploadStoryMedia = multer({
  storage: storyMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: messageMediaFilter,
});
```

- [ ] **Step 2: Vérifier la syntaxe**

Run: `cd backend && node --check src/upload.js`
Expected: exit 0, aucune sortie

- [ ] **Step 3: Commit**

```bash
git add backend/src/upload.js
git commit -m "feat(stories): storage Cloudinary zonedegrimpe/stories (photo+vidéo 50Mo)"
```

---

### Task 3: Route `/api/stories` — stories de base

**Files:**
- Create: `backend/src/routes/stories.routes.js`
- Modify: `backend/server.js` (import + mount)

- [ ] **Step 1: Créer le fichier route**

Créer `backend/src/routes/stories.routes.js` (les endpoints highlights seront ajoutés en Task 4 — laisser le `return r;` final) :

```js
import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth } from "../auth.js";
import { createNotification } from "../notifications.js";
import { uploadStoryMedia } from "../upload.js";
import { canViewStories, computePurgeAt, STORY_TTL_MS } from "../stories.helpers.js";

export function storiesRouter(db) {
  const r = Router();
  const stories = db.collection("stories");
  const highlights = db.collection("story_highlights");
  const users = db.collection("users");
  const follows = db.collection("follows");
  const friendships = db.collection("friendships");
  const spots = db.collection("climbing_spot");

  stories.createIndex({ userId: 1, expiresAt: -1 });
  stories.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 });
  highlights.createIndex({ userId: 1 });

  const userProjection = { displayName: 1, username: 1, avatarUrl: 1, "privacy.isPrivate": 1 };

  /** Relation viewer→author : { isSelf, isFriend, isFollower } */
  async function getRelation(viewerUid, authorUid) {
    if (viewerUid === authorUid) return { isSelf: true, isFriend: false, isFollower: false };
    const [friendship, follow] = await Promise.all([
      friendships.findOne({
        status: "accepted",
        $or: [
          { requesterId: viewerUid, addresseeId: authorUid },
          { requesterId: authorUid, addresseeId: viewerUid },
        ],
      }),
      follows.findOne({ followerId: viewerUid, followingId: authorUid }),
    ]);
    return { isSelf: false, isFriend: !!friendship, isFollower: !!follow };
  }

  /** true si viewerUid peut voir les stories de l'auteur (doc user). */
  async function canView(viewerUid, authorDoc) {
    const relation = await getRelation(viewerUid, String(authorDoc._id));
    return canViewStories({ isPrivate: !!authorDoc.privacy?.isPrivate }, relation);
  }

  function publicStory(s, viewerUid) {
    const isAuthor = s.userId === viewerUid;
    return {
      _id: s._id,
      userId: s.userId,
      media: s.media,
      caption: s.caption,
      spotId: s.spotId,
      spotName: s.spotName ?? null,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      seen: (s.views || []).some((v) => v.uid === viewerUid),
      myReaction: (s.reactions || []).find((x) => x.uid === viewerUid)?.emoji ?? null,
      ...(isAuthor && {
        viewCount: (s.views || []).length,
        reactionCount: (s.reactions || []).length,
        highlighted: !!s.highlighted,
      }),
    };
  }

  // POST /api/stories — créer une story (multipart: media + caption? + spotId?)
  r.post("/", requireAuth, (req, res, next) => {
    uploadStoryMedia.single("media")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "file_too_large" });
        return res.status(400).json({ error: err.message || "upload_failed" });
      }
      next();
    });
  }, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "no_file" });
    try {
      const caption = typeof req.body.caption === "string" ? req.body.caption.trim().slice(0, 500) || null : null;

      let spotId = null;
      let spotName = null;
      if (req.body.spotId) {
        try {
          spotId = new ObjectId(req.body.spotId);
        } catch {
          return res.status(400).json({ error: "invalid_spot_id" });
        }
        const spot = await spots.findOne({ _id: spotId }, { projection: { name: 1 } });
        if (!spot) return res.status(404).json({ error: "spot_not_found" });
        spotName = spot.name;
      }

      const isVideo = req.file.mimetype.startsWith("video/");
      const createdAt = new Date();
      const doc = {
        userId: req.auth.uid,
        media: {
          url: req.file.path,
          publicId: req.file.filename,
          type: isVideo ? "video" : "image",
          mimeType: req.file.mimetype,
        },
        caption,
        spotId,
        spotName,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + STORY_TTL_MS),
        highlighted: false,
        purgeAt: computePurgeAt(createdAt, false),
        views: [],
        reactions: [],
      };
      const inserted = await stories.insertOne(doc);
      res.status(201).json(publicStory({ ...doc, _id: inserted.insertedId }, req.auth.uid));
    } catch (e) {
      console.error("[stories] POST / error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // GET /api/stories/feed — stories actives des suivis + amis, groupées par auteur
  r.get("/feed", requireAuth, async (req, res) => {
    const uid = req.auth.uid;
    try {
      const [followDocs, friendDocs] = await Promise.all([
        follows.find({ followerId: uid }, { projection: { followingId: 1 } }).toArray(),
        friendships.find({
          status: "accepted",
          $or: [{ requesterId: uid }, { addresseeId: uid }],
        }).toArray(),
      ]);
      const friendUids = new Set(friendDocs.map((f) => (f.requesterId === uid ? f.addresseeId : f.requesterId)));
      const followedUids = new Set(followDocs.map((f) => f.followingId));
      const authorUids = [...new Set([...friendUids, ...followedUids, uid])];

      const authorOids = authorUids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      const authors = await users.find({ _id: { $in: authorOids } }, { projection: userProjection }).toArray();
      const authorById = new Map(authors.map((u) => [String(u._id), u]));

      // Visibilité : ami → toujours ; follower seul → seulement si profil public ; soi-même → toujours.
      const visibleUids = authorUids.filter((id) => {
        if (id === uid) return true;
        const author = authorById.get(id);
        if (!author) return false;
        return canViewStories(
          { isPrivate: !!author.privacy?.isPrivate },
          { isSelf: false, isFriend: friendUids.has(id), isFollower: followedUids.has(id) }
        );
      });

      const active = await stories
        .find({ userId: { $in: visibleUids }, expiresAt: { $gt: new Date() } })
        .sort({ createdAt: 1 })
        .toArray();

      const byAuthor = new Map();
      for (const s of active) {
        if (!byAuthor.has(s.userId)) byAuthor.set(s.userId, []);
        byAuthor.get(s.userId).push(publicStory(s, uid));
      }

      const groups = [...byAuthor.entries()].map(([authorUid, items]) => {
        const u = authorById.get(authorUid);
        return {
          user: {
            uid: authorUid,
            username: u?.username ?? null,
            displayName: u?.displayName ?? null,
            avatarUrl: u?.avatarUrl ?? null,
            isSelf: authorUid === uid,
          },
          stories: items,
          allSeen: items.every((s) => s.seen),
        };
      });
      // Soi-même d'abord, puis non-vues, puis plus récentes
      groups.sort((a, b) => {
        if (a.user.isSelf !== b.user.isSelf) return a.user.isSelf ? -1 : 1;
        if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
        return new Date(b.stories.at(-1).createdAt) - new Date(a.stories.at(-1).createdAt);
      });

      res.json({ groups });
    } catch (e) {
      console.error("[stories] GET /feed error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // GET /api/stories/user/:uid — stories actives d'un user (archives si self + ?archive=1)
  r.get("/user/:uid", requireAuth, async (req, res) => {
    const targetUid = req.params.uid;
    if (!ObjectId.isValid(targetUid)) return res.status(400).json({ error: "invalid_uid" });
    try {
      const author = await users.findOne({ _id: new ObjectId(targetUid) }, { projection: userProjection });
      if (!author) return res.status(404).json({ error: "user_not_found" });
      if (!(await canView(req.auth.uid, author))) return res.status(403).json({ error: "forbidden" });

      const isSelf = req.auth.uid === targetUid;
      const wantArchive = isSelf && req.query.archive === "1";
      const query = wantArchive
        ? { userId: targetUid } // archives = tout ce qui n'est pas purgé
        : { userId: targetUid, expiresAt: { $gt: new Date() } };

      const list = await stories.find(query).sort({ createdAt: wantArchive ? -1 : 1 }).limit(100).toArray();
      res.json({ stories: list.map((s) => publicStory(s, req.auth.uid)) });
    } catch (e) {
      console.error("[stories] GET /user error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // POST /api/stories/:id/view — marquer vue (idempotent)
  r.post("/:id/view", requireAuth, async (req, res) => {
    let oid;
    try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: "invalid_id" }); }
    try {
      await stories.updateOne(
        { _id: oid, "views.uid": { $ne: req.auth.uid } },
        { $push: { views: { uid: req.auth.uid, at: new Date() } } }
      );
      res.json({ ok: true });
    } catch (e) {
      console.error("[stories] POST /view error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // GET /api/stories/:id/views — liste « vu par » (auteur uniquement)
  r.get("/:id/views", requireAuth, async (req, res) => {
    let oid;
    try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: "invalid_id" }); }
    try {
      const story = await stories.findOne({ _id: oid });
      if (!story) return res.status(404).json({ error: "story_not_found" });
      if (story.userId !== req.auth.uid) return res.status(403).json({ error: "forbidden" });

      const viewerOids = (story.views || [])
        .filter((v) => ObjectId.isValid(v.uid))
        .map((v) => new ObjectId(v.uid));
      const viewerDocs = await users
        .find({ _id: { $in: viewerOids } }, { projection: { displayName: 1, username: 1, avatarUrl: 1 } })
        .toArray();
      const byId = new Map(viewerDocs.map((u) => [String(u._id), u]));
      const reactionByUid = new Map((story.reactions || []).map((x) => [x.uid, x.emoji]));

      res.json({
        views: (story.views || []).map((v) => {
          const u = byId.get(v.uid);
          return {
            uid: v.uid,
            at: v.at,
            displayName: u?.displayName ?? null,
            username: u?.username ?? null,
            avatarUrl: u?.avatarUrl ?? null,
            emoji: reactionByUid.get(v.uid) ?? null,
          };
        }),
      });
    } catch (e) {
      console.error("[stories] GET /views error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // POST /api/stories/:id/react — { emoji } (une réaction par user, remplaçable)
  r.post("/:id/react", requireAuth, async (req, res) => {
    let oid;
    try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: "invalid_id" }); }
    const emoji = typeof req.body?.emoji === "string" ? req.body.emoji.trim().slice(0, 8) : "";
    if (!emoji) return res.status(400).json({ error: "emoji_required" });
    try {
      const story = await stories.findOne({ _id: oid }, { projection: { userId: 1 } });
      if (!story) return res.status(404).json({ error: "story_not_found" });
      if (story.userId === req.auth.uid) return res.status(400).json({ error: "cannot_react_own_story" });

      await stories.updateOne({ _id: oid }, { $pull: { reactions: { uid: req.auth.uid } } });
      await stories.updateOne({ _id: oid }, { $push: { reactions: { uid: req.auth.uid, emoji, at: new Date() } } });

      const fromUser = await users.findOne(
        { _id: new ObjectId(req.auth.uid) },
        { projection: { displayName: 1, username: 1 } }
      );
      createNotification(db, {
        userId: story.userId,
        type: "story_reaction",
        fromUserId: req.auth.uid,
        fromUsername: fromUser?.displayName || fromUser?.username || "Utilisateur",
        message: `${fromUser?.displayName || "Quelqu'un"} a réagi ${emoji} à votre story`,
        data: { storyId: String(oid) },
      }).catch((e) => console.error("notification error:", e));

      res.json({ ok: true });
    } catch (e) {
      console.error("[stories] POST /react error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // DELETE /api/stories/:id — auteur ou admin ; retire des highlights
  r.delete("/:id", requireAuth, async (req, res) => {
    let oid;
    try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: "invalid_id" }); }
    try {
      const story = await stories.findOne({ _id: oid }, { projection: { userId: 1 } });
      if (!story) return res.status(404).json({ error: "story_not_found" });
      const isAdmin = (req.auth.roles || []).includes("admin");
      if (story.userId !== req.auth.uid && !isAdmin) return res.status(403).json({ error: "forbidden" });

      await highlights.updateMany({ storyIds: oid }, { $pull: { storyIds: oid }, $set: { updatedAt: new Date() } });
      await stories.deleteOne({ _id: oid });
      res.json({ ok: true });
    } catch (e) {
      console.error("[stories] DELETE error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  return r;
}
```

- [ ] **Step 2: Monter la route dans server.js**

Dans `backend/server.js`, après la ligne 23 (`import { feedRouter } ...`) :

```js
import { storiesRouter } from "./src/routes/stories.routes.js";
```

Et après la ligne 140 (`app.use("/api/feed", feedRouter(db));`) :

```js
app.use("/api/stories", storiesRouter(db));
```

- [ ] **Step 3: Vérifier syntaxe + tests**

Run: `cd backend && node --check src/routes/stories.routes.js && node --check server.js && npm test`
Expected: exit 0, 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/stories.routes.js backend/server.js
git commit -m "feat(stories): route /api/stories — création, feed, vues, réactions, suppression"
```

---

### Task 4: Endpoints highlights (`/api/stories/highlights/*`)

**Files:**
- Modify: `backend/src/routes/stories.routes.js`

⚠️ **Ordre des routes Express :** `r.delete("/:id")` matcherait `DELETE /highlights/xxx` si le bloc highlights était déclaré après. **Insérer tout le bloc highlights AVANT `r.post("/:id/view")`** pour que `/highlights/:id` gagne sur `/:id/*`.

- [ ] **Step 1: Ajouter une fonction de recalcul `highlighted`**

Dans `stories.routes.js`, sous `publicStory` :

```js
  /** Recalcule highlighted + purgeAt pour un lot de stories après modif des highlights. */
  async function syncHighlightedFlags(storyOids) {
    if (!storyOids.length) return;
    for (const oid of storyOids) {
      const stillHighlighted = await highlights.countDocuments({ storyIds: oid }, { limit: 1 });
      const story = await stories.findOne({ _id: oid }, { projection: { createdAt: 1 } });
      if (!story) continue;
      await stories.updateOne(
        { _id: oid },
        {
          $set: {
            highlighted: stillHighlighted > 0,
            purgeAt: computePurgeAt(story.createdAt, stillHighlighted > 0),
          },
        }
      );
    }
  }
```

- [ ] **Step 2: Ajouter les endpoints highlights**

Insérer AVANT `r.post("/:id/view", ...)` :

```js
  // GET /api/stories/highlights/:uid — highlights d'un user ; contenu filtré par visibilité
  r.get("/highlights/:uid", requireAuth, async (req, res) => {
    const targetUid = req.params.uid;
    if (!ObjectId.isValid(targetUid)) return res.status(400).json({ error: "invalid_uid" });
    try {
      const author = await users.findOne({ _id: new ObjectId(targetUid) }, { projection: userProjection });
      if (!author) return res.status(404).json({ error: "user_not_found" });
      const allowed = await canView(req.auth.uid, author);

      const list = await highlights.find({ userId: targetUid }).sort({ createdAt: 1 }).toArray();

      const allStoryOids = [...new Set(list.flatMap((h) => h.storyIds.map(String)))].map((s) => new ObjectId(s));
      const storyDocs = allowed && allStoryOids.length
        ? await stories.find({ _id: { $in: allStoryOids } }).toArray()
        : [];
      const storyById = new Map(storyDocs.map((s) => [String(s._id), s]));

      res.json({
        locked: !allowed,
        highlights: list.map((h) => {
          const items = allowed
            ? h.storyIds.map((sid) => storyById.get(String(sid))).filter(Boolean).map((s) => publicStory(s, req.auth.uid))
            : [];
          return {
            _id: h._id,
            name: h.name,
            coverUrl: h.coverUrl ?? items[0]?.media?.url ?? null,
            storyCount: h.storyIds.length,
            stories: items,
          };
        }),
      });
    } catch (e) {
      console.error("[stories] GET /highlights error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // POST /api/stories/highlights — { name, coverUrl?, storyIds: [] }
  r.post("/highlights", requireAuth, async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 40) : "";
    if (!name) return res.status(400).json({ error: "name_required" });
    const rawIds = Array.isArray(req.body?.storyIds) ? req.body.storyIds : [];
    let storyOids;
    try {
      storyOids = rawIds.map((s) => new ObjectId(s));
    } catch {
      return res.status(400).json({ error: "invalid_story_id" });
    }
    if (!storyOids.length) return res.status(400).json({ error: "stories_required" });
    try {
      // Toutes les stories doivent appartenir à l'auteur
      const owned = await stories.countDocuments({ _id: { $in: storyOids }, userId: req.auth.uid });
      if (owned !== storyOids.length) return res.status(403).json({ error: "forbidden" });

      const now = new Date();
      const doc = {
        userId: req.auth.uid,
        name,
        coverUrl: typeof req.body?.coverUrl === "string" ? req.body.coverUrl : null,
        storyIds: storyOids,
        createdAt: now,
        updatedAt: now,
      };
      const inserted = await highlights.insertOne(doc);
      await syncHighlightedFlags(storyOids);
      res.status(201).json({ ...doc, _id: inserted.insertedId });
    } catch (e) {
      console.error("[stories] POST /highlights error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // PATCH /api/stories/highlights/:id — { name?, coverUrl?, addStoryIds?, removeStoryIds? }
  r.patch("/highlights/:id", requireAuth, async (req, res) => {
    let hid;
    try { hid = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: "invalid_id" }); }
    try {
      const h = await highlights.findOne({ _id: hid });
      if (!h) return res.status(404).json({ error: "highlight_not_found" });
      if (h.userId !== req.auth.uid) return res.status(403).json({ error: "forbidden" });

      const $set = { updatedAt: new Date() };
      if (typeof req.body?.name === "string" && req.body.name.trim()) $set.name = req.body.name.trim().slice(0, 40);
      if (typeof req.body?.coverUrl === "string") $set.coverUrl = req.body.coverUrl;

      let addOids = [];
      let removeOids = [];
      try {
        addOids = (Array.isArray(req.body?.addStoryIds) ? req.body.addStoryIds : []).map((s) => new ObjectId(s));
        removeOids = (Array.isArray(req.body?.removeStoryIds) ? req.body.removeStoryIds : []).map((s) => new ObjectId(s));
      } catch {
        return res.status(400).json({ error: "invalid_story_id" });
      }
      if (addOids.length) {
        const owned = await stories.countDocuments({ _id: { $in: addOids }, userId: req.auth.uid });
        if (owned !== addOids.length) return res.status(403).json({ error: "forbidden" });
      }

      const update = { $set };
      if (addOids.length) update.$addToSet = { storyIds: { $each: addOids } };
      await highlights.updateOne({ _id: hid }, update);
      if (removeOids.length) {
        await highlights.updateOne({ _id: hid }, { $pull: { storyIds: { $in: removeOids } } });
      }
      await syncHighlightedFlags([...addOids, ...removeOids]);

      const updated = await highlights.findOne({ _id: hid });
      res.json(updated);
    } catch (e) {
      console.error("[stories] PATCH /highlights error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // DELETE /api/stories/highlights/:id — propriétaire ou admin
  r.delete("/highlights/:id", requireAuth, async (req, res) => {
    let hid;
    try { hid = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: "invalid_id" }); }
    try {
      const h = await highlights.findOne({ _id: hid });
      if (!h) return res.status(404).json({ error: "highlight_not_found" });
      const isAdmin = (req.auth.roles || []).includes("admin");
      if (h.userId !== req.auth.uid && !isAdmin) return res.status(403).json({ error: "forbidden" });

      await highlights.deleteOne({ _id: hid });
      await syncHighlightedFlags(h.storyIds);
      res.json({ ok: true });
    } catch (e) {
      console.error("[stories] DELETE /highlights error:", e);
      res.status(500).json({ error: "server_error" });
    }
  });
```

- [ ] **Step 3: Vérifier syntaxe + tests**

Run: `cd backend && node --check src/routes/stories.routes.js && npm test`
Expected: exit 0, tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/stories.routes.js
git commit -m "feat(stories): endpoints highlights — CRUD + recalcul purgeAt"
```

---

### Task 5: Types + client API frontend

**Files:**
- Create: `frontend-react/src/redesign/lib/stories.ts`
- Modify: `frontend-react/src/types/index.ts:301` (étendre `SharedObjectType`)

- [ ] **Step 1: Étendre SharedObjectType**

Dans `frontend-react/src/types/index.ts` ligne 301 :

```ts
export type SharedObjectType = 'spot' | 'route' | 'logbook' | 'story';
```

- [ ] **Step 2: Créer le client API**

Créer `frontend-react/src/redesign/lib/stories.ts` :

```ts
import { apiFetch } from '@/lib/api';

export interface Story {
  _id: string;
  userId: string;
  media: { url: string; type: 'image' | 'video'; mimeType?: string };
  caption: string | null;
  spotId: string | null;
  spotName: string | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  myReaction: string | null;
  // présents uniquement pour l'auteur
  viewCount?: number;
  reactionCount?: number;
  highlighted?: boolean;
}

export interface StoryGroup {
  user: { uid: string; username: string | null; displayName: string | null; avatarUrl: string | null; isSelf: boolean };
  stories: Story[];
  allSeen: boolean;
}

export interface StoryViewEntry {
  uid: string;
  at: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  emoji: string | null;
}

export interface Highlight {
  _id: string;
  name: string;
  coverUrl: string | null;
  storyCount: number;
  stories: Story[];
}

export function fetchStoriesFeed(): Promise<{ groups: StoryGroup[] }> {
  return apiFetch('/api/stories/feed', { auth: true });
}

export function fetchUserStories(uid: string, archive = false): Promise<{ stories: Story[] }> {
  return apiFetch(`/api/stories/user/${uid}${archive ? '?archive=1' : ''}`, { auth: true });
}

export function createStory(file: File, caption: string, spotId: string | null): Promise<Story> {
  const fd = new FormData();
  fd.append('media', file);
  if (caption.trim()) fd.append('caption', caption.trim());
  if (spotId) fd.append('spotId', spotId);
  return apiFetch('/api/stories', { method: 'POST', body: fd, auth: true });
}

export function markStoryViewed(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/${id}/view`, { method: 'POST', auth: true });
}

export function fetchStoryViews(id: string): Promise<{ views: StoryViewEntry[] }> {
  return apiFetch(`/api/stories/${id}/views`, { auth: true });
}

export function reactToStory(id: string, emoji: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/${id}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
    auth: true,
  });
}

export function deleteStory(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/${id}`, { method: 'DELETE', auth: true });
}

export function fetchHighlights(uid: string): Promise<{ locked: boolean; highlights: Highlight[] }> {
  return apiFetch(`/api/stories/highlights/${uid}`, { auth: true });
}

export function createHighlight(name: string, storyIds: string[], coverUrl?: string): Promise<Highlight> {
  return apiFetch('/api/stories/highlights', {
    method: 'POST',
    body: JSON.stringify({ name, storyIds, ...(coverUrl ? { coverUrl } : {}) }),
    auth: true,
  });
}

export function deleteHighlight(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/stories/highlights/${id}`, { method: 'DELETE', auth: true });
}
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `cd frontend-react && npx tsc -b`
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/redesign/lib/stories.ts frontend-react/src/types/index.ts
git commit -m "feat(stories): client API + type SharedObject story"
```

---

### Task 6: Composant StoryViewer (plein écran)

**Files:**
- Create: `frontend-react/src/redesign/components/StoryViewer.tsx`

Comportement : overlay plein écran ; barres de progression segmentées ; auto-avance 5 s (photo) / fin de vidéo ; tap moitié droite = story suivante (puis groupe suivant), moitié gauche = précédente ; bouton ✕ pour fermer ; marque la vue à l'affichage ; pastille spot cliquable ; pour les stories des autres : champ « Répondre… » + 4 emojis rapides ; pour ses propres stories : compteur de vues ouvrant une bottom sheet « Vu par » + bouton supprimer.

La réponse DM : `POST /api/messages/conversations` (`{ participantUid }`) puis `sendMessage` du store messages avec `sharedObject = { type: 'story', id: story._id, name: 'Story', subtitle: caption, imageUrl: media.url }`.

- [ ] **Step 1: Créer le composant**

Créer `frontend-react/src/redesign/components/StoryViewer.tsx` :

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useMessagesStore } from '@/stores/messages.store';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import {
  type Story, type StoryGroup, type StoryViewEntry,
  markStoryViewed, fetchStoryViews, reactToStory, deleteStory,
} from '../lib/stories';

const PHOTO_MS = 5000;
const QUICK_EMOJIS = ['🔥', '💪', '🧗', '👏'];

const OVERLAY = 'position:fixed;inset:0;z-index:1000;background:#000;display:flex;flex-direction:column';
const BARS = 'position:absolute;top:calc(8px + var(--safe-top, 0px));left:10px;right:10px;display:flex;gap:4px;z-index:5';
const HEAD = 'position:absolute;top:calc(20px + var(--safe-top, 0px));left:14px;right:14px;display:flex;align-items:center;gap:10px;z-index:5';
const FOOT = 'position:absolute;bottom:calc(14px + var(--safe-bottom, 0px));left:14px;right:14px;display:flex;align-items:center;gap:8px;z-index:5';

interface Props {
  groups: StoryGroup[];
  initialGroup: number;
  onClose: () => void;
  /** appelé quand une story vient d'être vue (pour rafraîchir le strip) */
  onSeen?: (storyId: string) => void;
}

function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.floor(m / 60)}h`;
}

export function StoryViewer({ groups, initialGroup, onClose, onSeen }: Props) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const sendMessage = useMessagesStore((s) => s.sendMessage);

  const [gi, setGi] = useState(initialGroup);
  const [si, setSi] = useState(() => {
    const g = groups[initialGroup];
    const firstUnseen = g?.stories.findIndex((s) => !s.seen) ?? 0;
    return firstUnseen >= 0 ? firstUnseen : 0;
  });
  const [progress, setProgress] = useState(0); // 0..1 sur la story courante
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sentFlash, setSentFlash] = useState<string | null>(null);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [views, setViews] = useState<StoryViewEntry[] | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  const group = groups[gi];
  const story: Story | undefined = group?.stories[si];
  const isMine = !!story && !!user && story.userId === user._id;

  const goNext = useCallback(() => {
    if (!group) return;
    if (si < group.stories.length - 1) { setSi(si + 1); return; }
    if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); return; }
    onClose();
  }, [group, si, gi, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (si > 0) { setSi(si - 1); return; }
    if (gi > 0) {
      const prev = groups[gi - 1];
      setGi(gi - 1);
      setSi(Math.max(0, prev.stories.length - 1));
    }
  }, [si, gi, groups]);

  // Marque la vue + reset progression à chaque changement de story
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    elapsedRef.current = 0;
    setReplyText('');
    setViewsOpen(false);
    setViews(null);
    markStoryViewed(story._id).then(() => onSeen?.(story._id)).catch(() => {});
  }, [story?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer photo (les vidéos avancent via onTimeUpdate/onEnded)
  useEffect(() => {
    if (!story || story.media.type === 'video' || paused) return;
    startRef.current = performance.now() - elapsedRef.current;
    const tick = (t: number) => {
      const e = t - startRef.current;
      elapsedRef.current = e;
      if (e >= PHOTO_MS) { goNext(); return; }
      setProgress(e / PHOTO_MS);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story?._id, paused, story?.media.type, goNext]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { paused ? v.pause() : v.play().catch(() => {}); }
  }, [paused, story?._id]);

  if (!story || !group) return null;

  const name = group.user.displayName || group.user.username || 'Grimpeur';

  async function handleReply(text: string, emoji?: string) {
    if (!story) return;
    try {
      if (emoji) await reactToStory(story._id, emoji);
      if (text.trim() || emoji) {
        const conv = await apiFetch<{ _id: string }>('/api/messages/conversations', {
          method: 'POST',
          body: JSON.stringify({ participantUid: story.userId }),
          auth: true,
        });
        await sendMessage(conv._id, emoji && !text.trim() ? emoji : text.trim(), undefined, {
          type: 'story',
          id: story._id,
          name: 'Story',
          subtitle: story.caption,
          imageUrl: story.media.type === 'image' ? story.media.url : null,
        });
      }
      setReplyText('');
      setSentFlash(emoji ?? 'Envoyé ✓');
      setTimeout(() => setSentFlash(null), 1200);
    } catch {
      setSentFlash('Échec ✕');
      setTimeout(() => setSentFlash(null), 1200);
    }
  }

  async function openViews() {
    setPaused(true);
    setViewsOpen(true);
    try { setViews((await fetchStoryViews(story!._id)).views); } catch { setViews([]); }
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette story ?')) return;
    try { await deleteStory(story!._id); onClose(); } catch { /* ignore */ }
  }

  return (
    <div style={css(OVERLAY)}>
      {/* Média + zones tap */}
      <div
        style={css('position:absolute;inset:0;display:flex;align-items:center;justify-content:center')}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {story.media.type === 'video' ? (
          <video
            ref={videoRef} key={story._id} src={story.media.url} autoPlay playsInline
            style={css('max-width:100%;max-height:100%;object-fit:contain')}
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
            onEnded={goNext}
          />
        ) : (
          <img key={story._id} src={story.media.url} alt="" style={css('max-width:100%;max-height:100%;object-fit:contain')} />
        )}
        <div style={css('position:absolute;inset:0 50% 120px 0')} onClick={goPrev} />
        <div style={css('position:absolute;inset:0 0 120px 50%')} onClick={goNext} />
      </div>

      {/* Barres de progression */}
      <div style={css(BARS)}>
        {group.stories.map((s, i) => (
          <div key={s._id} style={css('flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.25);overflow:hidden')}>
            <div style={css(`height:100%;background:#fff;width:${i < si ? 100 : i === si ? progress * 100 : 0}%`)} />
          </div>
        ))}
      </div>

      {/* En-tête auteur */}
      <div style={css(HEAD)}>
        <div
          style={css('display:flex;align-items:center;gap:9px;cursor:pointer')}
          onClick={() => { onClose(); navigate(group.user.isSelf ? '/redesign/profile' : `/redesign/profile/${group.user.uid}`); }}
        >
          <div style={css('width:34px;height:34px;border-radius:50%;overflow:hidden;background:linear-gradient(145deg,rgba(212,160,48,.4),rgba(180,100,20,.3));display:flex;align-items:center;justify-content:center;font-weight:700;color:#E8B84B;font-size:14px')}>
            {group.user.avatarUrl ? <img src={group.user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={css('font-size:13px;font-weight:700;color:#fff')}>{name}</div>
            <div style={css('font-size:11px;color:rgba(255,255,255,.6)')}>{relTime(story.createdAt)}</div>
          </div>
        </div>
        <div style={css('flex:1')} />
        {isMine && (
          <button onClick={handleDelete} aria-label="Supprimer" style={css('background:none;border:none;color:rgba(255,255,255,.7);font-size:16px;cursor:pointer;padding:6px')}>🗑</button>
        )}
        <button onClick={onClose} aria-label="Fermer" style={css('background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:6px;line-height:1')}>✕</button>
      </div>

      {/* Légende + pastille spot */}
      {(story.caption || story.spotId) && (
        <div style={css('position:absolute;bottom:calc(70px + var(--safe-bottom, 0px));left:14px;right:14px;z-index:5;display:flex;flex-direction:column;gap:8px;align-items:flex-start')}>
          {story.spotId && (
            <button
              onClick={() => { onClose(); navigate(`/redesign/spot/${story.spotId}`); }}
              style={css('display:flex;align-items:center;gap:6px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);border:1px solid rgba(212,160,48,.4);border-radius:20px;padding:6px 12px;color:#E8B84B;font-size:12px;font-weight:700;cursor:pointer')}
            >📍 {story.spotName ?? 'Voir le spot'}</button>
          )}
          {story.caption && (
            <div style={css('background:rgba(0,0,0,.55);backdrop-filter:blur(8px);border-radius:12px;padding:8px 12px;color:#fff;font-size:14px;max-width:100%')}>{story.caption}</div>
          )}
        </div>
      )}

      {/* Pied : répondre / vues */}
      <div style={css(FOOT)}>
        {isMine ? (
          <button onClick={openViews} style={css('display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:8px 14px;color:#fff;font-size:13px;font-weight:600;cursor:pointer')}>
            👁 {story.viewCount ?? 0} vue{(story.viewCount ?? 0) > 1 ? 's' : ''}
          </button>
        ) : (
          <>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) handleReply(replyText); }}
              placeholder="Répondre…"
              style={css('flex:1;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:9px 14px;color:#fff;font-size:14px;outline:none;min-width:0')}
            />
            {replyText.trim() ? (
              <button onClick={() => handleReply(replyText)} style={css('background:#D4A030;border:none;border-radius:20px;padding:9px 14px;color:#1a0f05;font-weight:700;font-size:13px;cursor:pointer')}>Envoyer</button>
            ) : (
              QUICK_EMOJIS.map((e) => (
                <button key={e} onClick={() => handleReply('', e)} style={css(`background:none;border:none;font-size:22px;cursor:pointer;padding:2px;${story.myReaction === e ? 'transform:scale(1.25)' : ''}`)}>{e}</button>
              ))
            )}
          </>
        )}
        {sentFlash && <span style={css('color:#fff;font-size:13px;font-weight:600')}>{sentFlash}</span>}
      </div>

      {/* Bottom sheet « Vu par » */}
      {viewsOpen && (
        <div style={css('position:absolute;inset:0;z-index:10;background:rgba(0,0,0,.5)')} onClick={() => { setViewsOpen(false); setPaused(false); }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={css('position:absolute;bottom:0;left:0;right:0;max-height:60%;overflow-y:auto;background:#17120c;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + var(--safe-bottom, 0px))')}
          >
            <div style={css('font-size:15px;font-weight:800;color:#f0ece6;margin-bottom:14px')}>Vu par {views?.length ?? '…'}</div>
            {views === null ? (
              <div style={css('color:rgba(240,236,230,.5);font-size:13px')}>Chargement…</div>
            ) : views.length === 0 ? (
              <div style={css('color:rgba(240,236,230,.5);font-size:13px')}>Personne pour l'instant.</div>
            ) : views.map((v) => (
              <div key={v.uid} style={css('display:flex;align-items:center;gap:10px;padding:7px 0')}>
                <div style={css('width:32px;height:32px;border-radius:50%;overflow:hidden;background:rgba(212,160,48,.2);display:flex;align-items:center;justify-content:center;color:#E8B84B;font-weight:700;font-size:13px')}>
                  {v.avatarUrl ? <img src={v.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : (v.displayName || v.username || '?')[0]?.toUpperCase()}
                </div>
                <span style={css('flex:1;font-size:14px;color:#f0ece6;font-weight:600')}>{v.displayName || v.username || 'Grimpeur'}</span>
                {v.emoji && <span style={css('font-size:18px')}>{v.emoji}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend-react && npx tsc -b`
Expected: exit 0 (`useAuthStore` vient de `@/stores/auth.store`, `useMessagesStore` de `@/stores/messages.store` — mêmes imports que `ConversationPage.tsx:5-6`)

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/redesign/components/StoryViewer.tsx
git commit -m "feat(stories): StoryViewer plein écran — progression, réactions, réponse DM, vu par"
```

---

### Task 7: Composant StoryComposer (création)

**Files:**
- Create: `frontend-react/src/redesign/components/StoryComposer.tsx`

Overlay : choix photo/vidéo (input file), aperçu, légende, recherche de spot (charge `/api/spots` comme le picker de ConversationPage, filtre client), bouton Publier.

- [ ] **Step 1: Créer le composant**

Créer `frontend-react/src/redesign/components/StoryComposer.tsx` :

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { css } from '../lib/css';
import { createStory } from '../lib/stories';

interface SpotLite { id: string; name: string }

const OVERLAY = 'position:fixed;inset:0;z-index:1000;background:rgba(10,7,4,.92);backdrop-filter:blur(14px);display:flex;flex-direction:column;padding:calc(16px + var(--safe-top, 0px)) 18px calc(16px + var(--safe-bottom, 0px))';
const FIELD = 'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 14px;color:#f0ece6;font-size:14px;outline:none;width:100%';

export function StoryComposer({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [spotQuery, setSpotQuery] = useState('');
  const [spot, setSpot] = useState<SpotLite | null>(null);
  const [spots, setSpots] = useState<SpotLite[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // /api/spots renvoie du GeoJSON — même pattern que le spot picker de ConversationPage.tsx:86
    apiFetch<{ features?: { properties: Record<string, unknown> }[] }>('/api/spots')
      .then((d) => setSpots((d?.features ?? []).map((f) => ({
        id: String(f.properties.id ?? f.properties._id),
        name: (f.properties.name as string) || 'Sans nom',
      }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const matches = useMemo(() => {
    const q = spotQuery.trim().toLowerCase();
    if (!q || spot) return [];
    return spots.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [spotQuery, spots, spot]);

  async function publish() {
    if (!file || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      await createStory(file, caption, spot?.id ?? null);
      onPublished();
      onClose();
    } catch {
      setError('Publication impossible. Réessaie.');
      setPublishing(false);
    }
  }

  const isVideo = file?.type.startsWith('video/');

  return (
    <div style={css(OVERLAY)}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:14px')}>
        <span style={css('font-size:17px;font-weight:800;color:#f0ece6')}>Nouvelle story</span>
        <button onClick={onClose} aria-label="Fermer" style={css('background:none;border:none;color:#f0ece6;font-size:22px;cursor:pointer;line-height:1')}>✕</button>
      </div>

      <input
        ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
        style={css('display:none')}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <div
        onClick={() => inputRef.current?.click()}
        style={css('flex:1;min-height:0;border-radius:18px;border:1.5px dashed rgba(212,160,48,.4);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;margin-bottom:14px')}
      >
        {previewUrl ? (
          isVideo
            ? <video src={previewUrl} controls playsInline style={css('max-width:100%;max-height:100%;object-fit:contain')} />
            : <img src={previewUrl} alt="" style={css('max-width:100%;max-height:100%;object-fit:contain')} />
        ) : (
          <div style={css('text-align:center;color:rgba(240,236,230,.6);font-size:14px;padding:30px')}>
            <div style={css('font-size:34px;margin-bottom:8px')}>📷</div>
            Touche pour choisir une photo ou une vidéo
          </div>
        )}
      </div>

      <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} placeholder="Légende (optionnel)" style={css(`${FIELD};margin-bottom:10px`)} />

      {spot ? (
        <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:10px')}>
          <span style={css('flex:1;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.25);border-radius:14px;padding:10px 14px;color:#E8B84B;font-size:13px;font-weight:700')}>📍 {spot.name}</span>
          <button onClick={() => { setSpot(null); setSpotQuery(''); }} style={css('background:none;border:none;color:rgba(240,236,230,.6);font-size:18px;cursor:pointer')}>✕</button>
        </div>
      ) : (
        <div style={css('position:relative;margin-bottom:10px')}>
          <input value={spotQuery} onChange={(e) => setSpotQuery(e.target.value)} placeholder="Taguer un spot (optionnel)" style={css(FIELD)} />
          {matches.length > 0 && (
            <div style={css('position:absolute;bottom:100%;left:0;right:0;margin-bottom:6px;background:#1d1610;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden')}>
              {matches.map((s) => (
                <button key={s.id} onClick={() => setSpot(s)} style={css('display:block;width:100%;text-align:left;background:none;border:none;padding:10px 14px;color:#f0ece6;font-size:13px;cursor:pointer')}>📍 {s.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div style={css('color:#E88080;font-size:13px;margin-bottom:8px')}>{error}</div>}

      <button
        onClick={publish} disabled={!file || publishing}
        style={css(`border:none;border-radius:16px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;${file && !publishing ? 'background:#D4A030;color:#1a0f05' : 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.4)'}`)}
      >{publishing ? 'Publication…' : 'Publier la story'}</button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend-react && npx tsc -b`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/redesign/components/StoryComposer.tsx
git commit -m "feat(stories): StoryComposer — média, légende, tag spot"
```

---

### Task 8: Strip de stories sur le FeedPage

**Files:**
- Create: `frontend-react/src/redesign/components/StoriesStrip.tsx`
- Modify: `frontend-react/src/redesign/pages/FeedPage.tsx`

- [ ] **Step 1: Créer le strip**

Créer `frontend-react/src/redesign/components/StoriesStrip.tsx` :

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { css } from '../lib/css';
import { type StoryGroup, fetchStoriesFeed } from '../lib/stories';
import { StoryViewer } from './StoryViewer';
import { StoryComposer } from './StoryComposer';

const RING_UNSEEN = 'background:linear-gradient(145deg,#E8B84B,#b46414)';
const RING_SEEN = 'background:rgba(255,255,255,.18)';

export function StoriesStrip() {
  const { user, isAuthenticated } = useAuthStore();
  const [groups, setGroups] = useState<StoryGroup[] | null>(null);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);

  const reload = useCallback(() => {
    fetchStoriesFeed().then((d) => setGroups(d.groups)).catch(() => setGroups([]));
  }, []);

  useEffect(() => { if (isAuthenticated) reload(); }, [isAuthenticated, reload]);

  if (!isAuthenticated || groups === null) return null;

  const selfGroup = groups.find((g) => g.user.isSelf) ?? null;
  const others = groups.filter((g) => !g.user.isSelf);
  const myName = user?.displayName || user?.username || '?';

  const markSeen = (storyId: string) => {
    setGroups((gs) => gs?.map((g) => ({
      ...g,
      stories: g.stories.map((s) => (s._id === storyId ? { ...s, seen: true } : s)),
      allSeen: g.stories.every((s) => s._id === storyId || s.seen),
    })) ?? null);
  };

  function Circle({ g }: { g: StoryGroup }) {
    const name = g.user.isSelf ? 'Toi' : (g.user.displayName || g.user.username || 'Grimpeur');
    const idx = groups!.indexOf(g);
    return (
      <button onClick={() => setViewerAt(idx)} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:64px;flex-shrink:0;padding:0')}>
        <div style={css(`width:58px;height:58px;border-radius:50%;padding:2.5px;${g.allSeen ? RING_SEEN : RING_UNSEEN}`)}>
          <div style={css('width:100%;height:100%;border-radius:50%;overflow:hidden;background:#241a10;border:2px solid #0f0a06;display:flex;align-items:center;justify-content:center;color:#E8B84B;font-weight:700;font-size:17px')}>
            {g.user.avatarUrl ? <img src={g.user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : name[0]?.toUpperCase()}
          </div>
        </div>
        <span style={css('font-size:10.5px;color:rgba(240,236,230,.7);max-width:62px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{name}</span>
      </button>
    );
  }

  return (
    <>
      <div style={css('display:flex;gap:12px;overflow-x:auto;padding:12px 20px 4px;scrollbar-width:none')}>
        {/* Ta story : ouvre tes stories si tu en as, sinon le composer ; bouton + toujours visible */}
        <div style={css('position:relative;flex-shrink:0')}>
          {selfGroup ? <Circle g={selfGroup} /> : (
            <button onClick={() => setComposing(true)} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:64px;padding:0')}>
              <div style={css(`width:58px;height:58px;border-radius:50%;padding:2.5px;${RING_SEEN}`)}>
                <div style={css('width:100%;height:100%;border-radius:50%;overflow:hidden;background:#241a10;border:2px solid #0f0a06;display:flex;align-items:center;justify-content:center;color:#E8B84B;font-weight:700;font-size:17px')}>
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={css('width:100%;height:100%;object-fit:cover;opacity:.7')} /> : myName[0]?.toUpperCase()}
                </div>
              </div>
              <span style={css('font-size:10.5px;color:rgba(240,236,230,.7)')}>Ta story</span>
            </button>
          )}
          <button
            onClick={() => setComposing(true)} aria-label="Ajouter une story"
            style={css('position:absolute;right:-1px;bottom:18px;width:20px;height:20px;border-radius:50%;background:#D4A030;color:#1a0f05;border:2px solid #0f0a06;font-size:13px;font-weight:800;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0')}
          >+</button>
        </div>
        {others.map((g) => <Circle key={g.user.uid} g={g} />)}
      </div>

      {viewerAt !== null && (
        <StoryViewer groups={groups} initialGroup={viewerAt} onClose={() => { setViewerAt(null); reload(); }} onSeen={markSeen} />
      )}
      {composing && <StoryComposer onClose={() => setComposing(false)} onPublished={reload} />}
    </>
  );
}
```

- [ ] **Step 2: Intégrer au FeedPage**

Dans `frontend-react/src/redesign/pages/FeedPage.tsx` :

1. Ajouter l'import : `import { StoriesStrip } from '../components/StoriesStrip';`
2. Insérer `<StoriesStrip />` juste après `</NavBar>` (avant le `<div style={css('padding:16px 20px;...`).
3. Mettre à jour le commentaire d'en-tête du fichier : retirer la phrase « Honnête : pas de “stories” … strip stories retiré » et la remplacer par « Strip stories branché sur `/api/stories/feed`. »

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend-react && npx tsc -b && npm run lint`
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/redesign/components/StoriesStrip.tsx frontend-react/src/redesign/pages/FeedPage.tsx
git commit -m "feat(stories): strip de stories sur le feed Liquid Glass"
```

---

### Task 9: « À la une » sur les profils

**Files:**
- Create: `frontend-react/src/redesign/components/HighlightsRow.tsx`
- Modify: `frontend-react/src/redesign/pages/ProfilePage.tsx`
- Modify: `frontend-react/src/redesign/pages/PublicProfilePage.tsx`

- [ ] **Step 1: Créer HighlightsRow**

Créer `frontend-react/src/redesign/components/HighlightsRow.tsx` :

```tsx
import { useCallback, useEffect, useState } from 'react';
import { css } from '../lib/css';
import {
  type Highlight, type Story, type StoryGroup,
  fetchHighlights, fetchUserStories, createHighlight, deleteHighlight,
} from '../lib/stories';
import { StoryViewer } from './StoryViewer';

interface Props {
  uid: string;
  isSelf: boolean;
  /** infos pour fabriquer le groupe du viewer */
  userInfo: { username: string | null; displayName: string | null; avatarUrl: string | null };
}

export function HighlightsRow({ uid, isSelf, userInfo }: Props) {
  const [highlights, setHighlights] = useState<Highlight[] | null>(null);
  const [viewing, setViewing] = useState<Highlight | null>(null);
  const [creating, setCreating] = useState(false);
  const [archive, setArchive] = useState<Story[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    fetchHighlights(uid).then((d) => setHighlights(d.highlights)).catch(() => setHighlights([]));
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);

  if (highlights === null || (highlights.length === 0 && !isSelf)) return null;

  function openCreate() {
    setCreating(true);
    setSelected(new Set());
    setName('');
    fetchUserStories(uid, true).then((d) => setArchive(d.stories)).catch(() => setArchive([]));
  }

  async function save() {
    if (!name.trim() || selected.size === 0 || saving) return;
    setSaving(true);
    try {
      await createHighlight(name.trim(), [...selected]);
      setCreating(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function removeHighlight(h: Highlight) {
    if (!confirm(`Supprimer « ${h.name} » ? (les stories ne sont pas supprimées)`)) return;
    await deleteHighlight(h._id).catch(() => {});
    setViewing(null);
    reload();
  }

  const viewerGroups: StoryGroup[] = viewing && viewing.stories.length
    ? [{ user: { uid, isSelf, ...userInfo }, stories: viewing.stories, allSeen: true }]
    : [];

  return (
    <div style={css('padding:4px 0 2px')}>
      <div style={css('display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:4px 2px')}>
        {highlights.map((h) => (
          <button key={h._id} onClick={() => h.stories.length && setViewing(h)} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:62px;flex-shrink:0;padding:0')}>
            <div style={css('width:54px;height:54px;border-radius:50%;padding:2px;background:rgba(255,255,255,.18)')}>
              <div style={css('width:100%;height:100%;border-radius:50%;overflow:hidden;background:#241a10;border:2px solid #0f0a06;display:flex;align-items:center;justify-content:center;font-size:18px')}>
                {h.coverUrl ? <img src={h.coverUrl} alt="" style={css('width:100%;height:100%;object-fit:cover')} /> : '⭐'}
              </div>
            </div>
            <span style={css('font-size:10.5px;color:rgba(240,236,230,.7);max-width:60px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{h.name}</span>
          </button>
        ))}
        {isSelf && (
          <button onClick={openCreate} style={css('background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;width:62px;flex-shrink:0;padding:0')}>
            <div style={css('width:54px;height:54px;border-radius:50%;border:1.5px dashed rgba(240,236,230,.35);display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.6);font-size:22px')}>+</div>
            <span style={css('font-size:10.5px;color:rgba(240,236,230,.7)')}>Nouveau</span>
          </button>
        )}
      </div>

      {viewing && viewerGroups.length > 0 && (
        <>
          <StoryViewer groups={viewerGroups} initialGroup={0} onClose={() => setViewing(null)} />
          {isSelf && (
            <button onClick={() => removeHighlight(viewing)} style={css('position:fixed;top:calc(20px + var(--safe-top, 0px));right:56px;z-index:1001;background:none;border:none;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;cursor:pointer')}>Supprimer</button>
          )}
        </>
      )}

      {creating && (
        <div style={css('position:fixed;inset:0;z-index:1000;background:rgba(10,7,4,.94);backdrop-filter:blur(14px);display:flex;flex-direction:column;padding:calc(16px + var(--safe-top, 0px)) 18px calc(16px + var(--safe-bottom, 0px))')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:14px')}>
            <span style={css('font-size:17px;font-weight:800;color:#f0ece6')}>Nouvelle « À la une »</span>
            <button onClick={() => setCreating(false)} aria-label="Fermer" style={css('background:none;border:none;color:#f0ece6;font-size:22px;cursor:pointer;line-height:1')}>✕</button>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nom (ex. Fontainebleau)" style={css('background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 14px;color:#f0ece6;font-size:14px;outline:none;margin-bottom:14px')} />
          <div style={css('flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:start')}>
            {archive === null ? (
              <span style={css('color:rgba(240,236,230,.5);font-size:13px;grid-column:1/-1')}>Chargement…</span>
            ) : archive.length === 0 ? (
              <span style={css('color:rgba(240,236,230,.5);font-size:13px;grid-column:1/-1')}>Aucune story dans tes archives. Publie d'abord une story !</span>
            ) : archive.map((s) => {
              const on = selected.has(s._id);
              return (
                <button key={s._id} onClick={() => setSelected((prev) => { const n = new Set(prev); on ? n.delete(s._id) : n.add(s._id); return n; })}
                  style={css(`position:relative;aspect-ratio:9/16;border-radius:12px;overflow:hidden;border:2px solid ${on ? '#D4A030' : 'transparent'};background:#241a10;cursor:pointer;padding:0`)}>
                  {s.media.type === 'image'
                    ? <img src={s.media.url} alt="" style={css('width:100%;height:100%;object-fit:cover')} />
                    : <video src={s.media.url} muted style={css('width:100%;height:100%;object-fit:cover')} />}
                  {on && <span style={css('position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;background:#D4A030;color:#1a0f05;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center')}>✓</span>}
                </button>
              );
            })}
          </div>
          <button onClick={save} disabled={!name.trim() || selected.size === 0 || saving}
            style={css(`margin-top:14px;border:none;border-radius:16px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;${name.trim() && selected.size > 0 && !saving ? 'background:#D4A030;color:#1a0f05' : 'background:rgba(255,255,255,.08);color:rgba(240,236,230,.4)'}`)}
          >{saving ? 'Création…' : `Créer (${selected.size})`}</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Intégrer aux deux profils**

`ProfilePage.tsx` (profil perso, `user` du `useAuthStore`) — import puis insérer sous le bloc identité (avatar + nom, autour de la ligne 95, juste avant les stats) :

```tsx
<HighlightsRow
  uid={user._id}
  isSelf
  userInfo={{ username: user.username ?? null, displayName: user.displayName ?? null, avatarUrl: user.avatarUrl ?? null }}
/>
```

`PublicProfilePage.tsx` — sous l'en-tête profil (après le bloc avatar/nom, avant les stats), avec `id` de `useParams` et `prof` :

```tsx
{isAuthenticated && id && prof && (
  <HighlightsRow
    uid={id}
    isSelf={isSelf}
    userInfo={{ username: prof.username ?? null, displayName: prof.displayName ?? null, avatarUrl: prof.avatarUrl ?? null }}
  />
)}
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend-react && npx tsc -b && npm run lint`
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/redesign/components/HighlightsRow.tsx frontend-react/src/redesign/pages/ProfilePage.tsx frontend-react/src/redesign/pages/PublicProfilePage.tsx
git commit -m "feat(stories): rangée À la une sur profils + création de highlights"
```

---

### Task 10: Bulle « story » dans la messagerie

**Files:**
- Modify: `frontend-react/src/redesign/pages/ConversationPage.tsx:119-131`

- [ ] **Step 1: Rendu du sharedObject story**

Dans `MessageContent` (ConversationPage.tsx), le bloc `if (m.sharedObject)` ne gère que les spots. Ajouter AVANT le rendu générique existant :

```tsx
    if (m.sharedObject?.type === 'story') {
      const o = m.sharedObject;
      return (
        <div style={css('display:flex;flex-direction:column;gap:6px;max-width:210px')}>
          <span style={css(`font-size:11px;${sent ? 'color:rgba(26,15,5,.6)' : 'color:rgba(240,236,230,.5)'}`)}>↪ En réponse à une story</span>
          {o.imageUrl && <img src={o.imageUrl} alt="" style={css('width:120px;border-radius:12px;display:block')} />}
          {o.subtitle && <span style={css(`font-size:12px;font-style:italic;${sent ? 'color:rgba(26,15,5,.7)' : 'color:rgba(240,236,230,.6)'}`)}>{o.subtitle}</span>}
          {m.content?.trim() && <span style={css(sent ? SENT_TEXT : RECV_TEXT)}>{m.content}</span>}
        </div>
      );
    }
```

(Le contenu texte du message est rendu dans la bulle story, donc rien d'autre à changer — le bloc générique `if (m.sharedObject)` reste pour spots/voies.)

- [ ] **Step 2: Typecheck + lint**

Run: `cd frontend-react && npx tsc -b && npm run lint`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/redesign/pages/ConversationPage.tsx
git commit -m "feat(stories): bulle réponse-à-une-story dans la messagerie"
```

---

### Task 11: Vérification de bout en bout

**Files:** aucun nouveau

- [ ] **Step 1: Tests backend + syntaxe**

Run: `cd backend && npm test && node --check server.js`
Expected: tous les tests PASS

- [ ] **Step 2: Build frontend complet**

Run: `cd frontend-react && npm run build`
Expected: build OK sans erreur TS

- [ ] **Step 3: Smoke test manuel (si MongoDB/backend dispo en local)**

Lancer `cd backend && node server.js` + `cd frontend-react && npm run dev`, puis sur `/redesign/feed` :
1. « + » → publier une story photo avec légende + tag spot → elle apparaît dans le strip (anneau doré).
2. Ouvrir la story → progression, pastille spot cliquable, compteur de vues (1 après revisionnage par un autre compte).
3. Depuis un 2ᵉ compte ami/follower : voir la story, réagir 🔥 (notification reçue), répondre → message dans la conversation avec bulle story.
4. Profil : créer une « À la une » depuis les archives, vérifier l'affichage sur le profil public.
5. Compte non ami d'un profil privé : ne voit ni stories ni contenu des highlights (`locked: true`).

- [ ] **Step 4: Commit final éventuel (fixups) — pas de version bump sans demande utilisateur**

---

## Notes de déviation par rapport à la spec

- **Pas d'endpoint `POST /api/stories/:id/reply`** : la réponse réutilise `POST /api/messages/conversations` + socket `message` avec `sharedObject` type `story` (déjà accepté par la validation socket existante, `backend/src/socket.js:82-94`). Moins de code, même résultat.
- **Pas d'i18n** : les pages redesign sont toutes en FR dur (convention du dossier) ; les textes stories suivent.
- **`media.width/height/duration` omis** : multer-storage-cloudinary ne les expose pas directement ; non nécessaires au rendu (object-fit + `onTimeUpdate`).
- **Tests backend = fonctions pures** (`node --test`, zéro dépendance ajoutée) : le repo n'a aucune infra de test HTTP/DB ; la logique à risque (visibilité, purge) est extraite et testée, les handlers restent fins.
