// src/routes/materielSpecs.routes.js
import { Router } from "express";
import { ObjectId } from "mongodb";

export function materielSpecsRouter(db) {
  const r = Router();
  const specs = db.collection("Materiel_Specs");

  // Index utiles
  specs.createIndex({ category: 1 }).catch(() => {});
  specs.createIndex({ brand: 1 }).catch(() => {});
  specs.createIndex({ model: 1 }).catch(() => {});
  specs.createIndex({ category: "text", brand: "text", model: "text" }).catch(() => {});

  // --- Validation basique ---
  function validatePayload(body, { partial = false } = {}) {
    const out = {};

    if (!partial || body.category !== undefined) {
      if (typeof body.category !== "string" || !body.category.trim()) {
        throw new Error("Invalid 'category'");
      }
      out.category = body.category.trim();
    }

    if (!partial || body.brand !== undefined) {
      if (typeof body.brand !== "string" || !body.brand.trim()) {
        throw new Error("Invalid 'brand'");
      }
      out.brand = body.brand.trim();
    }

    if (!partial || body.model !== undefined) {
      if (typeof body.model !== "string" || !body.model.trim()) {
        throw new Error("Invalid 'model'");
      }
      out.model = body.model.trim();
    }

    if (body.specs && typeof body.specs === "object") {
      out.specs = body.specs;
    }

    if (body.type) out.type = body.type;
    if (body.description) out.description = body.description;

    return out;
  }

  const SAFE_PROJECTION = {
    _id: 1,
    category: 1,
    brand: 1,
    model: 1,
    specs: 1,
    type: 1,
    description: 1,
    createdAt: 1,
  };

  // --- Créer une fiche matériel ---
  r.post("/", async (req, res) => {
    try {
      const payload = validatePayload(req.body ?? {});
      const doc = { ...payload, createdAt: new Date() };
      const { insertedId } = await specs.insertOne(doc);
      res.status(201).json({ ok: true, id: insertedId });
    } catch (e) {
      res.status(400).json({ error: "invalid_payload", detail: String(e?.message ?? e) });
    }
  });

  // --- Lister les matériels ---
  r.get("/", async (req, res) => {
    try {
      const { category, search = "", limit = 100, skip = 0 } = req.query;

      const lim = Math.min(parseInt(limit) || 100, 1000);
      const sk = parseInt(skip) || 0;
      const q = String(search || "").trim();

      const query = {};
      if (category) query.category = category;
      if (q) {
        query.$or = [
          { $text: { $search: q } },
          { brand: { $regex: q, $options: "i" } },
          { model: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
        ];
      }

      const [items, total] = await Promise.all([
        specs.find(query, { projection: SAFE_PROJECTION })
          .sort({ category: 1, brand: 1 })
          .skip(sk)
          .limit(lim)
          .toArray(),
        specs.countDocuments(query)
      ]);

      res.json({ items, total, limit: lim, skip: sk });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // --- Lire une fiche spécifique ---
  r.get("/:id", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    const doc = await specs.findOne({ _id: new ObjectId(id) }, { projection: SAFE_PROJECTION });
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

      const result = await specs.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...update, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) return res.status(404).json({ error: "not_found" });
      res.json({ ok: true, modified: result.modifiedCount === 1 });
    } catch (e) {
      res.status(400).json({ error: "invalid_payload", detail: String(e?.message ?? e) });
    }
  });

  // --- Supprimer une fiche ---
  r.delete("/:id", async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    const result = await specs.deleteOne({ _id: new ObjectId(id) });
    res.json({ deleted: result.deletedCount === 1 });
  });

  return r;
}
