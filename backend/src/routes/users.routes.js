import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth } from "../auth.js";

export function usersRouter(db) {
  const r = Router();
  const users = db.collection("users");

  // Indexes
  users.createIndex({ email: 1 }, { unique: true }).catch(() => { });
  users.createIndex({ displayName: "text", email: "text" }).catch(() => { });

  // ---- Niveaux autorisés
  const LEVELS = ["debutant", "intermediaire", "avance"];
  function normalizeLevel(v) {
    if (v == null) return null;
    const s = String(v).toLowerCase().trim();
    return LEVELS.includes(s) ? s : null;
  }

  // Projection des champs sensibles
  const SAFE_PROJECTION = {
    passwordHash: 0,
    // security: 0, // garde si tu veux masquer
  };

  // --- GET /api/users/me (protégé) ---
  r.get("/me", requireAuth, async (req, res) => {
    try {
      const uid = req.auth?.uid;
      const user = await users.findOne({ _id: new ObjectId(uid) }, { projection: SAFE_PROJECTION });
      if (!user) return res.status(404).json({ error: "not_found" });

      // Valeur par défaut non destructive à l'affichage
      if (!user.profile) user.profile = {};
      if (!user.profile.level) user.profile.level = "debutant";

      return res.json(user); // <-- renvoie l'objet user directement
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // ----------------------
  // Validation minimale payload côté route
  // ----------------------
  function sanitizePartialUpdate(body = {}) {
    const set = {};
    const allowedStatus = ["active", "banned", "pending"];
    const allowedRoles = ["user", "admin", "moderator"];

    if (body.displayName !== undefined) {
      if (typeof body.displayName !== "string" || !body.displayName.trim()) {
        throw new Error("Invalid 'displayName'");
      }
      set.displayName = body.displayName.trim();
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid 'email'");
      }
      set.email = email;
    }

    if (body.roles !== undefined) {
      if (!Array.isArray(body.roles) || body.roles.some(r => !allowedRoles.includes(r))) {
        throw new Error("Invalid 'roles'");
      }
      set.roles = body.roles;
    }

    if (body.status !== undefined) {
      if (!allowedStatus.includes(body.status)) {
        throw new Error("Invalid 'status'");
      }
      set.status = body.status;
    }

    if (body.emailVerified !== undefined) {
      set.emailVerified = !!body.emailVerified;
    }

    if (body.avatarUrl !== undefined) {
      if (body.avatarUrl !== null && typeof body.avatarUrl !== "string") {
        throw new Error("Invalid 'avatarUrl'");
      }
      set.avatarUrl = body.avatarUrl;
    }

    if (body.phone !== undefined) {
      if (body.phone !== null && typeof body.phone !== "string") {
        throw new Error("Invalid 'phone'");
      }
      set.phone = body.phone;
    }

    if (body.preferences !== undefined) {
      if (typeof body.preferences !== "object" || Array.isArray(body.preferences)) {
        throw new Error("Invalid 'preferences'");
      }
      set.preferences = body.preferences;
    }

    if (body.profile !== undefined) {
      if (typeof body.profile !== "object" || Array.isArray(body.profile)) {
        throw new Error("Invalid 'profile'");
      }
      set.profile = body.profile;
    }

    return set;
  }

  // --- (facultatif) POST /api/users ---
  r.post("/", async (req, res) => {
    try {
      const { email, displayName, roles, status, emailVerified, avatarUrl, phone, preferences, profile } = req.body || {};

      const emailNorm = String(email || "").trim().toLowerCase();
      if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: "invalid_payload", detail: "email required" });
      }
      const display = String(displayName || "").trim();
      if (!display) {
        return res.status(400).json({ error: "invalid_payload", detail: "displayName required" });
      }

      const passwordHash = "pending_" + cryptoRandomString();

      const doc = {
        email: emailNorm,
        passwordHash,
        displayName: display,
        avatarUrl: avatarUrl === undefined ? null : avatarUrl,
        phone: phone === undefined ? null : phone,
        roles: Array.isArray(roles) && roles.length ? roles : ["user"],
        status: ["active", "banned", "pending"].includes(status) ? status : "active",
        emailVerified: !!emailVerified,
        preferences: preferences && typeof preferences === "object" ? preferences : {},
        profile: profile && typeof profile === "object" ? profile : { level: "debutant" },
        security: {
          createdAt: new Date(),
          updatedAt: null,
          lastLoginAt: null
        }
      };

      const { insertedId } = await users.insertOne(doc);
      return res.status(201).json({ ok: true, id: insertedId });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({ error: "conflict", detail: "email_already_exists" });
      }
      console.error(e);
      return res.status(400).json({ error: "invalid_payload", detail: String(e?.message ?? e) });
    }
  });

  // --- GET /api/users (liste) ---
  r.get("/", async (req, res) => {
    try {
      const { search = "", limit = 20, skip = 0 } = req.query;
      const lim = Math.max(1, Math.min(parseInt(limit, 10) || 20, 200));
      const sk = Math.max(0, parseInt(skip, 10) || 0);

      const q = String(search || "").trim();
      let filter = {};
      let projection = SAFE_PROJECTION;
      let sort = { "security.createdAt": -1, _id: -1 };

      if (q) {
        const looksLikeEmail = q.includes("@");
        if (looksLikeEmail) {
          filter = { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } };
        } else {
          filter = { $text: { $search: q } };
          projection = { ...SAFE_PROJECTION, score: { $meta: "textScore" } };
          sort = { score: { $meta: "textScore" } };
        }
      }

      let items, total;
      try {
        [items, total] = await Promise.all([
          users.find(filter, { projection }).sort(sort).skip(sk).limit(lim).toArray(),
          users.countDocuments(filter),
        ]);
      } catch {
        const rx = q ? { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } : null;
        filter = q ? { $or: [{ displayName: rx }, { email: rx }] } : {};
        [items, total] = await Promise.all([
          users.find(filter, { projection: SAFE_PROJECTION }).sort({ "security.createdAt": -1, _id: -1 }).skip(sk).limit(lim).toArray(),
          users.countDocuments(filter),
        ]);
      }

      return res.json({ items, total, limit: lim, skip: sk });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // --- GET /api/users/:id ---
  r.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "bad_id" });
      }
      const doc = await users.findOne({ _id: new ObjectId(id) }, { projection: SAFE_PROJECTION });
      if (!doc) return res.status(404).json({ error: "not_found" });
      return res.json(doc);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // --- PATCH /api/users/me ---
  r.patch("/me", requireAuth, async (req, res) => {
    try {
      const uid = new ObjectId(req.auth?.uid);
      const body = req.body || {};
      const $set = {};

      if (body.displayName !== undefined) {
        if (typeof body.displayName !== "string" || !body.displayName.trim()) {
          return res.status(400).json({ error: "invalid_payload", detail: "displayName must be a non-empty string" });
        }
        $set.displayName = body.displayName.trim();
      }

      if (body.avatarUrl !== undefined) {
        if (body.avatarUrl !== null && typeof body.avatarUrl !== "string") {
          return res.status(400).json({ error: "invalid_payload", detail: "avatarUrl must be string or null" });
        }
        $set.avatarUrl = body.avatarUrl === "" ? null : body.avatarUrl;
      }

      if (body.phone !== undefined) {
        if (body.phone !== null && typeof body.phone !== "string") {
          return res.status(400).json({ error: "invalid_payload", detail: "phone must be string or null" });
        }
        $set.phone = body.phone === "" ? null : body.phone;
      }

      // ---- Ajout du niveau
      if (body.level !== undefined) {
        const lvl = normalizeLevel(body.level);
        if (!lvl) {
          return res.status(400).json({ error: "invalid_level", allowed: LEVELS });
        }
        $set["profile.level"] = lvl;
      }

      if (!Object.keys($set).length) {
        const user0 = await users.findOne({ _id: uid }, { projection: SAFE_PROJECTION });
        if (!user0) return res.status(404).json({ error: "not_found" });
        // défaut d'affichage
        if (!user0.profile) user0.profile = {};
        if (!user0.profile.level) user0.profile.level = "debutant";
        return res.json(user0);
      }

      $set["security.updatedAt"] = new Date();

      const result = await users.updateOne({ _id: uid }, { $set });
      if (result.matchedCount === 0) return res.status(404).json({ error: "not_found" });

      const user = await users.findOne({ _id: uid }, { projection: SAFE_PROJECTION });
      if (!user.profile) user.profile = {};
      if (!user.profile.level) user.profile.level = "debutant";
      return res.json(user); // <-- renvoie l'objet user directement
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // --- PATCH /api/users/:id ---
  r.patch("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "bad_id" });
      }

      const updateSet = sanitizePartialUpdate(req.body ?? {});
      if (!Object.keys(updateSet).length) {
        return res.status(400).json({ error: "invalid_payload", detail: "empty_update" });
      }

      const result = await users.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateSet, "security.updatedAt": new Date() } }
      );

      if (result.matchedCount === 0) return res.status(404).json({ error: "not_found" });
      return res.json({ ok: true, modified: result.modifiedCount === 1 });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({ error: "conflict", detail: "email_already_exists" });
      }
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // --- DELETE /api/users/:id ---
  r.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "bad_id" });
      }
      const result = await users.deleteOne({ _id: new ObjectId(id) });
      return res.json({ deleted: result.deletedCount === 1 });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  

  return r;
}

function cryptoRandomString() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
