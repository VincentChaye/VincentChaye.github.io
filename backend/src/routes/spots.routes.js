import { Router } from "express";
import { ObjectId } from "mongodb";
import { createSpotSchema } from "../validators.js";

export function spotsRouter(db) {
  const r = Router();
  const spots = db.collection("climbing_spot");

  // Assure l'index géospatial sur le bon champ
  spots.createIndex({ location: "2dsphere" }).catch(() => {});

  // --- Créer un spot ---
  r.post("/", async (req, res) => {
    try {
      const parsed = createSpotSchema.parse(req.body); // doit inclure location valide
      const doc = { ...parsed, createdAt: new Date() };
      const { insertedId } = await spots.insertOne(doc);
      res.status(201).json({ ok: true, id: insertedId });
    } catch (e) {
      res.status(400).json({ error: "invalid_payload", detail: String(e) });
    }
  });

  // --- Recherche par proximité (PLACÉE AVANT /:id) ---
  r.get("/near", async (req, res) => {
    const { lng, lat, radius = 5000, limit = 100, format = "geojson" } = req.query;
    if (!lng || !lat) return res.status(400).json({ error: "missing_params" });

    try {
      const docs = await spots
        .find({
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
              $maxDistance: parseFloat(radius),
            },
          },
        })
        .limit(+limit)
        .toArray();

      // Format plat (compat front)
      if (format === "flat") {
        const flat = docs.map((d) => ({
          _id: d._id,
          id: d.id ?? d._id.toString(),
          name: d.name ?? "Inconnu",
          type: d.type ?? null,
          soustype: d.soustype ?? null,
          niveau_min: d.niveau_min ?? null,
          niveau_max: d.niveau_max ?? null,
          id_voix: d.id_voix ?? [],
          location: d.location ?? null, // GeoJSON Point [lng, lat]
          url: d.url ?? null,
          info_complementaires: d.info_complementaires ?? null,
          orientation: d.orientation ?? null,
        }));
        return res.json(flat);
      }

      // Par défaut: GeoJSON FeatureCollection
      return res.json({
        type: "FeatureCollection",
        features: docs.map((d) => ({
          type: "Feature",
          geometry: d.location, // <- le bon champ
          properties: {
            id: d._id,
            osm_id: d.id ?? null,
            name: d.name ?? null,
            type: d.type ?? null,
            soustype: d.soustype ?? null,
            niveau_min: d.niveau_min ?? null,
            niveau_max: d.niveau_max ?? null,
            id_voix: d.id_voix ?? [],
            url: d.url ?? null,
            info_complementaires: d.info_complementaires ?? null,
            orientation: d.orientation ?? null,
          },
        })),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // --- Lister (bbox + format) ---
  r.get("/", async (req, res) => {
    try {
      const { minLng, minLat, maxLng, maxLat, limit = 1000, format = "geojson" } = req.query;

      let query = {};
      if (minLng && minLat && maxLng && maxLat) {
        const minx = +minLng, miny = +minLat, maxx = +maxLng, maxy = +maxLat;
        query = {
          location: {
            $geoWithin: {
              $geometry: {
                type: "Polygon",
                coordinates: [[
                  [minx, miny],
                  [maxx, miny],
                  [maxx, maxy],
                  [minx, maxy],
                  [minx, miny]
                ]]
              }
            }
          }
        };
      }

      const docs = await spots.find(query).limit(+limit).toArray();

      if (format === "flat") {
        const flat = docs.map((d) => ({
          _id: d._id,
          id: d.id ?? d._id.toString(),
          name: d.name ?? "Inconnu",
          type: d.type ?? null,
          soustype: d.soustype ?? null,
          niveau_min: d.niveau_min ?? null,
          niveau_max: d.niveau_max ?? null,
          id_voix: d.id_voix ?? [],
          location: d.location ?? null,
          url: d.url ?? null,
          info_complementaires: d.info_complementaires ?? null,
          orientation: d.orientation ?? null,
        }));
        return res.json(flat);
      }

      return res.json({
        type: "FeatureCollection",
        features: docs.map((d) => ({
          type: "Feature",
          geometry: d.location,
          properties: {
            id: d._id,
            osm_id: d.id ?? null,
            name: d.name ?? null,
            type: d.type ?? null,
            soustype: d.soustype ?? null,
            niveau_min: d.niveau_min ?? null,
            niveau_max: d.niveau_max ?? null,
            id_voix: d.id_voix ?? [],
            url: d.url ?? null,
            info_complementaires: d.info_complementaires ?? null,
            orientation: d.orientation ?? null,
          },
        })),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server_error" });
    }
  });

  // --- Lire un spot ---
  r.get("/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: "bad_id" });
    const doc = await spots.findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.json(doc);
  });

  // --- Supprimer un spot ---
  r.delete("/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: "bad_id" });
    const result = await spots.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ deleted: result.deletedCount === 1 });
  });

  return r;
}
