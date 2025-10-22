import { Router } from "express";
import { ObjectId } from "mongodb";

export function usersRouter(db) {
  const r = Router();
  const users = db.collection("users");

  // Indexes utiles
  // - unicité email (si des doublons existent déjà, l'index lèvera une erreur -> catch silencieux)
  // - recherche textuelle sur name + email


  users.createIndex({ email: 1 }, { unique: true }).catch(() => {});
  users.createIndex({ name: "text", email: "text" }).catch(() => {});



  // Petite validation minimale (évite dépendre d'un validator externe)
  function validateUserPayload(body, { partial = false } = {}) {
    const out = {};

    if (!partial || body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        throw new Error("Invalid 'name'");
      }
      out.name = body.name.trim();
    }

    if (!partial || body.email !== undefined) {
      if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        throw new Error("Invalid 'email'");
      }
      out.email = body.email.trim().toLowerCase();
    }

    if (!partial || body.role !== undefined) {
      const role = (body.role ?? "member").toString();
      if (!["member", "admin"].includes(role)) {
        throw new Error("Invalid 'role'");
      }
      out.role = role;
    }

    return out;
  }

  // Projection par défaut pour la liste/lecture (on masque d’éventuels champs sensibles)
  const SAFE_PROJECTION = {
    _id: 1,
    name: 1,
    email: 1,
    role: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  // --- Créer un utilisateur ---
  r.post("/", async (req, res) => {
    try {
      const payload = validateUserPayload(req.body ?? {});
      const doc = {
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { insertedId } = await users.insertOne(doc);
      return res.status(201).json({ ok: true, id: insertedId });
    } catch (e) {
      // Gestion du conflit d'email unique
      if (e?.code === 11000) {
        return res.status(409).json({ error: "conflict", detail: "email_already_exists" });
      }
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

      let filter = {};
      const q = String(search || "").trim();
      if (q) {
        // Recherche "tolérante" : texte si possible + fallback regex
        filter = {
          $or: [
            { $text: { $search: q } },
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        };
      }

      const [items, total] = await Promise.all([
        users
          .find(filter, { projection: SAFE_PROJECTION })
          .sort({ createdAt: -1, _id: -1 })
          .skip(sk)
          .limit(lim)
          .toArray(),
        users.countDocuments(filter),
      ]);

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

  // --- Mettre à jour partiellement un utilisateur ---
  r.patch("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "bad_id" });
      }

      // payload partiel
      const update = validateUserPayload(req.body ?? {}, { partial: true });
      if (!Object.keys(update).length) {
        return res.status(400).json({ error: "invalid_payload", detail: "empty_update" });
      }

      update.updatedAt = new Date();

      const result = await users.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
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
