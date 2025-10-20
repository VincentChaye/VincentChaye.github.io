// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDb } from "./src/db.js";
import { spotsRouter } from "./src/routes/spots.routes.js";

dotenv.config();

const app = express();
app.use(express.json());

// --- CORS : env + dev defaults
const devDefaults = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://localhost:3001",
];
const envAllowed = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const allowedList = [...new Set([...devDefaults, ...envAllowed])];

// Autoriser aussi *.azurewebsites.net et *.github.io (https) via check souple
function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/postman
  if (allowedList.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol === "https:" &&
        (u.hostname.endsWith(".azurewebsites.net") || u.hostname.endsWith(".github.io"))) {
      return true;
    }
  } catch {}
  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// --- Health endpoints
app.get("/api/health", (_, res) => res.json({ ok: true }));
app.get("/ping", (_, res) => res.json({ ok: true })); // pour Docker/ingress

// --- DB wiring
const hasUri = !!process.env.MONGODB_URI;

if (hasUri) {
  const { db } = await connectToDb(
    process.env.MONGODB_URI,
    process.env.DB_NAME || "ZoneDeGrimpe"
  );
  app.use("/api/spots", spotsRouter(db));
  console.log("MongoDB mode activé");
} else {
  // fallback temporaire : renvoie une FeatureCollection vide
  app.get("/api/spots", (_, res) =>
    res.json({ type: "FeatureCollection", features: [] })
  );
  console.warn("MONGODB_URI manquante → mode sans DB (liste vide)");
}

// --- Listen (0.0.0.0 pour conteneur)
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`API running on :${port}`));
