import { Router } from "express";
import { ObjectId } from "mongodb";
import { createSpotSchema } from "../validators.js";

export function spotsRouter(db) {
  const r = Router();
  const spots = db.collection("climbing_spot");

  // Créer un spot
  r.post("/", async (req, res) => {
    try {
      const parsed = createSpotSchema.parse(req.body);
      const doc = { ...parsed, createdAt: new Date() };
      const { insertedId } = await spots.insertOne(doc);
      res.status(201).json({ ok: true, id: insertedId });
    } catch (e) {
      res.status(400).json({ error: "invalid_payload", detail: String(e) });
    }
  });

  // Lister (option bbox)
  r.get("/", async (req, res) => {
    try {
      const { minLng, minLat, maxLng, maxLat, limit = 1000 } = req.query;
      let query = {};
      if (minLng && minLat && maxLng && maxLat) {
        query = {
          geometry: { $geoWithin: { $box: [[+minLng, +minLat], [+maxLng, +maxLat]] } },
        };
      }
      const docs = await spots.find(query).limit(+limit).toArray();
      res.json({
        type: "FeatureCollection",
        features: docs.map((d) => ({
          type: "Feature",
          geometry: d.geometry,
          properties: { id: d._id, name: d.name, grade: d.grade, info: d.info },
        })),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // Lire un spot
  r.get("/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: "bad_id" });
    const doc = await spots.findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json(doc);
  });

  // Supprimer un spot
  r.delete("/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: "bad_id" });
    const result = await spots.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ deleted: result.deletedCount === 1 });
  });

  // Recherche par proximité
  r.get("/near", async (req, res) => {
    const { lng, lat, radius = 5000 } = req.query;
    if (!lng || !lat) return res.status(400).json({ error: "missing_params" });
    try {
      const docs = await spots
        .find({
          geometry: {
            $near: {
              $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
              $maxDistance: parseFloat(radius),
            },
          },
        })
        .limit(100)
        .toArray();
      res.json({
        type: "FeatureCollection",
        features: docs.map((d) => ({
          type: "Feature",
          geometry: d.geometry,
          properties: { id: d._id, name: d.name, grade: d.grade, info: d.info },
        })),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server_error" });
    }
  });

  return r;
}
