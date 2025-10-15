import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToDb } from "./src/db.js";
import { spotsRouter } from "./src/routes/spots.routes.js";

dotenv.config();

const app = express();
app.use(express.json());


const allowedOrigins = [
	"http://localhost:3000",
	"http://127.0.0.1:5500",
];

app.use(
	cors({
		origin: (origin, callback) => {
			// autoriser les requêtes locales sans Origin (ie: curl, postman)
			if (!origin || allowedOrigins.includes(origin)) {
				return callback(null, true);
			}
			return callback(new Error("Not allowed by CORS"));
		},
		credentials: true,
	})
);

app.get("/api/health", (_, res) => res.json({ ok: true }));

const hasUri = !!process.env.MONGODB_URI;

if (hasUri) {
	const { db } = await connectToDb(process.env.MONGODB_URI, process.env.DB_NAME || "ZoneDeGrimpe");
	app.use("/api/spots", spotsRouter(db));
	console.log("MongoDB mode activé");
} else {
	// fallback temporaire : renvoie une FeatureCollection vide
	app.get("/api/spots", (_, res) =>
		res.json({ type: "FeatureCollection", features: [] })
	);
	console.warn(" MONGODB_URI manquante → mode sans DB (liste vide)");
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on :${port}`));
