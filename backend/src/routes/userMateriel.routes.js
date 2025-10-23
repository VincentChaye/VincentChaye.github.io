// src/routes/userMateriel.routes.js
import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth } from "../auth.js";

export function userMaterielRouter(db) {
  const r = Router();
  const matos = db.collection("User_Materiel");

  // Index utiles
  matos.createIndex({ userId: 1 }).catch(() => {});
  matos.createIndex({ category: 1 }).catch(() => {});

  // --- Validation / normalisation du payload ---
  function validatePayload(body = {}, { partial = false } = {}) {
    const out = {};

    // category (enum côté validator; ici on vérifie non-vide)
    if (!partial || body.category !== undefined) {
      if (typeof body.category !== "string" || !body.category.trim()) {
        throw new Error("Invalid 'category'");
      }
      out.category = body.category.trim();
    }

    // specs (objet libre)
    if (body.specs && typeof body.specs === "object") {
      out.specs = body.specs;
    }

    // purchase: uniquement { date }
    if (body.purchase && typeof body.purchase === "object") {
      if (body.purchase.date) {
        out.purchase = { date: new Date(body.purchase.date) };
      }
    }

    // lifecycle: normalisation condition + cast dates
    if (body.lifecycle && typeof body.lifecycle === "object") {
      const allowed = ["new", "good", "worn", "retire-soon", "retired", null];
      const lc = { ...body.lifecycle };

      if (!allowed.includes(lc.condition)) {
        lc.condition =
          lc.condition == null
            ? null
            : (String(lc.condition).toLowerCase() === "used" ? "worn" : "good");
      }

      if (lc.lastInspectionAt) lc.lastInspectionAt = new Date(lc.lastInspectionAt);
      if (lc.nextInspectionAt) lc.nextInspectionAt = new Date(lc.nextInspectionAt);
      if (lc.retiredAt) lc.retiredAt = new Date(lc.retiredAt);

      out.lifecycle = lc;
    }

    return out;
  }

  // --- Projection par défaut (conforme validator) ---
  const SAFE_PROJECTION = {
    _id: 1,
    userId: 1,
    category: 1,
    specs: 1,
    purchase: 1,
    lifecycle: 1,
    meta: 1,
  };

  // --------------------------------------------------------------------
  // CREATE: l'utilisateur connecté crée un matos pour LUI
  // --------------------------------------------------------------------
  r.post("/", requireAuth, async (req, res) => {
    try {
      const uid = new ObjectId(req.auth.uid);
      const parsed = validatePayload(req.body, { partial: false });

      const doc = {
        userId: uid, // imposé par le token
        category: parsed.category,
        specs: parsed.specs || {},
        ...(parsed.purchase ? { purchase: parsed.purchase } : {}),
        ...(parsed.lifecycle ? { lifecycle: parsed.lifecycle } : {}),
        meta: { createdAt: new Date(), updatedAt: null, deletedAt: null },
      };

      // Si le client a envoyé purchase.price, on le range en specs.price
      if (req.body?.purchase?.price != null) {
        doc.specs.price = Number(req.body.purchase.price);
      }

      const { insertedId } = await matos.insertOne(doc);
      return res.status(201).json({ ok: true, id: insertedId });
    } catch (e) {
      return res.status(400).json({ error: "invalid_payload", detail: String(e?.message ?? e) });
    }
  });

  // --------------------------------------------------------------------
  // LIST: uniquement le matériel de l'utilisateur connecté
  // --------------------------------------------------------------------
  r.get("/", requireAuth, async (req, res) => {
    try {
      const uid = new ObjectId(req.auth.uid);

      const query = { userId: uid };
      if (req.query.category) query.category = String(req.query.category);

      const lim = Math.min(parseInt(req.query.limit) || 100, 1000);
      const sk = parseInt(req.query.skip) || 0;

      const [items, total] = await Promise.all([
        matos
          .find(query, { projection: SAFE_PROJECTION })
          .sort({ "meta.createdAt": -1, _id: -1 })
          .skip(sk)
          .limit(lim)
          .toArray(),
        matos.countDocuments(query),
      ]);

      return res.json({ items, total, limit: lim, skip: sk });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // --------------------------------------------------------------------
  // READ: un document possédé par l'utilisateur connecté
  // --------------------------------------------------------------------
  r.get("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    const uid = new ObjectId(req.auth.uid);
    const doc = await matos.findOne({ _id: new ObjectId(id), userId: uid }, { projection: SAFE_PROJECTION });
    if (!doc) return res.status(404).json({ error: "not_found" });
    return res.json(doc);
  });

  // --------------------------------------------------------------------
  // PATCH: mise à jour partielle d'un document possédé
  // --------------------------------------------------------------------
  r.patch("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    try {
      const uid = new ObjectId(req.auth.uid);

      // On ignore toute tentative de changer userId
      const body = { ...req.body };
      delete body.userId;

      const update = validatePayload(body, { partial: true });
      if (!Object.keys(update).length) {
        return res.status(400).json({ error: "invalid_payload", detail: "empty_update" });
      }

      // Si purchase.price est envoyé, on le met en specs.price
      if (req.body?.purchase?.price != null) {
        update.specs = { ...(update.specs || {}), price: Number(req.body.purchase.price) };
      }

      const result = await matos.updateOne(
        { _id: new ObjectId(id), userId: uid },
        { $set: { ...update, "meta.updatedAt": new Date() } }
      );

      if (result.matchedCount === 0) return res.status(404).json({ error: "not_found" });
      return res.json({ ok: true, modified: result.modifiedCount === 1 });
    } catch (e) {
      return res.status(400).json({ error: "invalid_payload", detail: String(e?.message ?? e) });
    }
  });

  // --------------------------------------------------------------------
  // DELETE: suppression d'un document possédé
  // --------------------------------------------------------------------
  r.delete("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "bad_id" });

    const uid = new ObjectId(req.auth.uid);
    const result = await matos.deleteOne({ _id: new ObjectId(id), userId: uid });
    return res.json({ deleted: result.deletedCount === 1 });
  });

  return r;
}
