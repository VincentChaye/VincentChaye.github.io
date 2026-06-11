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
  highlights.createIndex({ storyIds: 1 });

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
            storyCount: allowed ? items.length : h.storyIds.length,
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

  // POST /api/stories/:id/view — marquer vue (idempotent)
  r.post("/:id/view", requireAuth, async (req, res) => {
    let oid;
    try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: "invalid_id" }); }
    try {
      const story = await stories.findOne({ _id: oid }, { projection: { userId: 1 } });
      if (!story) return res.status(404).json({ error: "story_not_found" });

      if (story.userId !== req.auth.uid) {
        const author = await users.findOne({ _id: new ObjectId(story.userId) }, { projection: userProjection });
        if (!author) return res.status(404).json({ error: "user_not_found" });
        if (!(await canView(req.auth.uid, author))) return res.status(403).json({ error: "forbidden" });
      }

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

      const author = await users.findOne({ _id: new ObjectId(story.userId) }, { projection: userProjection });
      if (!author) return res.status(404).json({ error: "user_not_found" });
      if (!(await canView(req.auth.uid, author))) return res.status(403).json({ error: "forbidden" });

      await stories.updateOne(
        { _id: oid },
        [{
          $set: {
            reactions: {
              $concatArrays: [
                { $filter: { input: { $ifNull: ["$reactions", []] }, cond: { $ne: ["$$this.uid", req.auth.uid] } } },
                [{ uid: req.auth.uid, emoji, at: "$$NOW" }],
              ],
            },
          },
        }]
      );

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
