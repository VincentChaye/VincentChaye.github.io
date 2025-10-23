// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDb } from "./src/db.js";
import { spotsRouter } from "./src/routes/spots.routes.js";
import { usersRouter } from "./src/routes/users.routes.js";
import { authRouter } from "./src/routes/auth.routes.js";
import { userMaterielRouter } from "./src/routes/userMateriel.routes.js";
import { materielSpecsRouter } from "./src/routes/materielSpecs.routes.js";
import { analyticsRouter } from "./src/routes/analytics.routes.js";
import { adviceRouter } from "./src/routes/advice.routes.js";



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
  .map((s) => s.trim())
  .filter(Boolean);

const allowedList = [...new Set([...devDefaults, ...envAllowed])];

// Autoriser aussi *.azurewebsites.net et *.github.io (https) via check souple
function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/postman
  if (allowedList.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (
      u.protocol === "https:" &&
      (u.hostname.endsWith(".azurewebsites.net") ||
        u.hostname.endsWith(".github.io"))
    ) {
      return true;
    }
  } catch { }
  return false;
}

// --- CORS configuration with all methods
const corsConfig = {
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  exposedHeaders: ["Content-Type", "Content-Length"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

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

  // Routes avec DB
  app.use("/api/spots", spotsRouter(db));
  app.use("/api/users", usersRouter(db));
  app.use("/api/auth", authRouter(db));
  app.use("/api/user_materiel", userMaterielRouter(db));
  app.use("/api/materiel_specs", materielSpecsRouter(db));
  app.use("/api/analytics", analyticsRouter(db));
  app.use("/api/advice", adviceRouter(db));


  console.log("MongoDB mode activé");
} else {
  // Fallback sans DB
  app.get("/api/spots", (_, res) => res.json({ type: "FeatureCollection", features: [] }));
  app.get("/api/users", (_, res) => res.json({ items: [], total: 0 }));
  app.get("/api/auth", (_, res) => res.status(401).json({ error: "no_db" }));
  app.get("/api/user_materiel", (_, res) => res.json({ items: [], total: 0 }));
  app.get("/api/materiel_specs", (_, res) => res.json({ items: [], total: 0 }));
  app.get("/api/analytics", (_, res) => res.json({ items: [] }));
  app.get("/api/advice", (_, res) => res.json({ items: [] }));


  console.warn("MONGODB_URI manquante → mode sans DB (listes vides)");
}

// --- Listen (0.0.0.0 pour conteneur)
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`API running on :${port}`));
