import { Router } from "express";
import { ObjectId } from "mongodb";

export function userMaterielRouter(db) {
  const r = Router();
  const matos = db.collection("User_Materiel");

  // Index utile pour filtrer par utilisateur
  matos.createIndex({ userId: 1 }).catch(() => {});
  matos.createIndex({ "specs.category": 1 }).catch(() => {});

  // --- Validation minimale ---
  function validatePayload(body, { partial = false } = {}) {
    const out = {};

    if (!partial || body.userId !== undefined) {
      if (!body.userId || !ObjectId.isValid(body.userId)) {
        throw new Error("Invalid or missing 'userId'");
      }
      out.userId = new ObjectId(body.userId);
    }

    if (!partial || body.category !== undefined) {
      if (typeof body.category !== "string" || !body.category.trim()) {
        throw new Error("Invalid 'category'");
      }
      out.category = body.category.trim();
    }

    if (body.specs) out.specs = body.specs;
    if (body.purchase) out.purchase = body.purchase;
    if (body.lifecycle) out.lifecycle = body.lifecycle;

    return out;
  }

  // Projection par défaut (pour liste)
  const SAFE_PROJECTION = {
    _id: 1,
    userId: 1,
    category: 1,
    specs: 1,
    purchase: 1,
    lifecycle: 1,
    createdAt: 1,
  };

  // --- Créer un matériel ---
  r.post("/", async (req, res) => {
    try {
      const payload = validatePayload(req.body ?? {});
      const doc = { ...payload, createdAt: new Date() };
      const { insertedId } = await matos.insertOne(doc);
      res.status(201).json({ ok: true, id: insertedId });
    } catch (e) {
      res.status(400).json({ error: "invalid_payload", detail: String(e?.message ?? e) });
    }
  });

  // --- Lister tout / ou par userId ---
  r.get("/", async (req, res) => {
    try {
      const { userId, category, limit = 100, skip = 0 } = req.query;

      const query = {};
      if (userId && ObjectId.isValid(userId)) query.userId = new ObjectId(userId);
      if (category) query.category = category;

      const lim = Math.min(parseInt(limit) || 100, 1000);
      const sk = parseInt(skip) || 0;

      const [items, total] = await Promise.all([
        matos.find(query, { projection: SAFE_PROJECTION })
             .skip(sk)
             .limit(lim)
             .sort({ createdAt: -1 })
             .toArray(),
        matos.countDocuments(query)
      ]);

      res.json({ items, total, limit: lim, skip: sk });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // --- Lire un matériel par ID ---
  r.get("/:id", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    const doc = await matos.findOne({ _id: new ObjectId(id) }, { projection: SAFE_PROJECTION });
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json(doc);
  });

  // --- Mise à jour partielle ---
  r.patch("/:id", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    try {
      const update = validatePayload(req.body ?? {}, { partial: true });
      if (!Object.keys(update).length) {
        return res.status(400).json({ error: "invalid_payload", detail: "empty_update" });
      }

      const result = await matos.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...update, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) return res.status(404).json({ error: "not_found" });
      res.json({ ok: true, modified: result.modifiedCount === 1 });
    } catch (e) {
      res.status(400).json({ error: "invalid_payload", detail: String(e?.message ?? e) });
    }
  });

  // --- Supprimer un matériel ---
  r.delete("/:id", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    const result = await matos.deleteOne({ _id: new ObjectId(id) });
    res.json({ deleted: result.deletedCount === 1 });
  });

  return r;
}
