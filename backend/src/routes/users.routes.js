import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth } from "../auth.js";

export function usersRouter(db) {
  const r = Router();
  const users = db.collection("users");

  // Indexes
  // - Unicité email (si doublons existants -> catch silencieux)
  // - Recherche textuelle sur displayName + email
  users.createIndex({ email: 1 }, { unique: true }).catch(() => { });
  users.createIndex({ displayName: "text", email: "text" }).catch(() => { });

  // Projection des champs sensibles
  const SAFE_PROJECTION = {
    passwordHash: 0,
    // NOTE: on masque security car contient des dates internes; enlève-le si tu veux les voir
    // security: 0,
  };

  // --- GET /api/users/me (protégé) ---
  r.get("/me", requireAuth, async (req, res) => {
    try {
      const uid = req.auth?.uid;
      const user = await users.findOne({ _id: new ObjectId(uid) }, { projection: SAFE_PROJECTION });
      if (!user) return res.status(404).json({ error: "not_found" });
      return res.json({ user });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // ----------------------
  // Validation minimale payload côté route
  // (alignée sur le validator: displayName, email, roles[], etc.)
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

    // ⚠️ NE PAS accepter createdAt/updatedAt au niveau racine (interdit par validator)
    // ⚠️ NE PAS accepter 'name' (pas dans le validator)
    // ⚠️ NE PAS accepter 'role' (string) -> utiliser 'roles' (array)
    return set;
  }

  // --- Créer un utilisateur (optionnel) ---
  // Conseil: préférez /api/auth/register. Si vous gardez cette route:
  // - elle DOIT respecter le validator (passwordHash et security.createdAt requis).
  r.post("/", async (req, res) => {
    try {
      const { email, displayName, roles, status, emailVerified, avatarUrl, phone, preferences, profile } = req.body || {};

      // Champs requis par le validator:
      const emailNorm = String(email || "").trim().toLowerCase();
      if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: "invalid_payload", detail: "email required" });
      }
      const display = String(displayName || "").trim();
      if (!display) {
        return res.status(400).json({ error: "invalid_payload", detail: "displayName required" });
      }

      // Cette route n’a pas de mdp -> on crée un compte “sans mot de passe”
      // conforme au validator: passwordHash string REQUIS => on met une sentinelle hashée vide
      // (meilleur: refuser la création ici et forcer /auth/register)
      const passwordHash = "pending_" + cryptoRandomString(); // chaîne non vide

      const doc = {
        email: emailNorm,
        passwordHash,                 // string requis
        displayName: display,
        avatarUrl: avatarUrl === undefined ? null : avatarUrl,
        phone: phone === undefined ? null : phone,
        roles: Array.isArray(roles) && roles.length ? roles : ["user"],
        status: ["active", "banned", "pending"].includes(status) ? status : "active",
        emailVerified: !!emailVerified,
        preferences: preferences && typeof preferences === "object" ? preferences : {},
        profile: profile && typeof profile === "object" ? profile : {},
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

  // --- Lister les utilisateurs (search + pagination) ---
  // GET /api/users?search=&limit=&skip=
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
        // Fallback regex sur displayName/email si $text indispo
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

  // --- Lire un utilisateur ---
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

  // PATCH /api/users/me — mettre à jour son propre profil
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

      // 👇 Ajout du champ téléphone
      if (body.phone !== undefined) {
        if (body.phone !== null && typeof body.phone !== "string") {
          return res.status(400).json({ error: "invalid_payload", detail: "phone must be string or null" });
        }
        $set.phone = body.phone === "" ? null : body.phone;
      }

      if (!Object.keys($set).length) {
        const user = await users.findOne({ _id: uid }, { projection: SAFE_PROJECTION });
        return res.json({ ok: true, user });
      }
      $set["security.updatedAt"] = new Date(); // validator-friendly

      const result = await users.updateOne({ _id: uid }, { $set });
      if (result.matchedCount === 0) return res.status(404).json({ error: "not_found" });

      const user = await users.findOne({ _id: uid }, { projection: SAFE_PROJECTION });
      return res.json({ ok: true, user });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });


  // --- Mettre à jour partiellement un utilisateur ---
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

      // maj date dans security (validator-friendly)
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

  // --- Supprimer un utilisateur ---
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

// petit util pour générer une string non vide si tu gardes POST /
function cryptoRandomString() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
