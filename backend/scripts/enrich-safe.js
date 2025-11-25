import { MongoClient, ObjectId } from "mongodb";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// --- CONFIGURATION PRO ---
const DRY_RUN = false;           // <--- LAISSE A TRUE POUR VOIR LES DETAILS D'ABORD
const DB_BATCH_SIZE = 200;      
const AI_CHUNK_SIZE = 15;       
const CONCURRENCY = 5;          
const OVERWRITE_LEVELS = false;

// --- INIT ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI;
const apiKey = process.env.GEMINI_API_KEY;

if (!uri || !apiKey) { console.error("❌ Manque infos .env"); process.exit(1); }

const client = new MongoClient(uri);
const genAI = new GoogleGenerativeAI(apiKey);

// CONFIGURATION DU MODÈLE
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          _id: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          orientation: { type: SchemaType.STRING },
          niveau_min: { type: SchemaType.STRING, description: "Cotation la plus facile (ex: 4a)" },
          niveau_max: { type: SchemaType.STRING, description: "Cotation la plus dure (ex: 8b)." },
          rock_type: { type: SchemaType.STRING },
          soustype: { type: SchemaType.STRING }
        },
        required: ["_id", "niveau_min", "niveau_max"] 
      }
    }
  }
});

// Traitement d'un paquet de spots
async function processAiChunk(spotsColl, spotsChunk, chunkIndex) {
    const tStart = Date.now();
    
    const spotsData = spotsChunk.map(s => ({
        _id: s._id.toString(),
        name: s.name,
        coords: s.location?.coordinates,
        current_min: s.niveau_min,
        current_max: s.niveau_max,
        current_rock: s.info_complementaires?.rock
    }));

    const prompt = `
    DATA: ${JSON.stringify(spotsData)}
    
    TACHE: Complète les données manquantes pour ces ${spotsChunk.length} spots.
    
    RÈGLE COTATIONS (CRITIQUE) : 
    - Tu DOIS fournir 'niveau_min' ET 'niveau_max'.
    - Si tu trouves un niveau unique (ex: "6a"), alors niveau_min="6a" et niveau_max="6a".
    - Ne renvoie JAMAIS null pour les niveaux.
    
    RÈGLE ORIENTATION :
    - Utilise UNIQUEMENT : N, S, E, O, NE, SE, SO, NO.
    `;

    try {
        const result = await model.generateContent(prompt);
        const aiResponse = JSON.parse(result.response.text());

        if (!Array.isArray(aiResponse)) return 0;

        const bulkOps = [];

        for (const item of aiResponse) {
            const original = spotsChunk.find(s => s._id.toString() === item._id);
            if (!original) continue;

            const setFields = {};
            
            const addIfBetter = (field, newVal, force = false) => {
                if (!newVal || newVal === "") return;
                if (force || !original[field] || original[field] === "") {
                    setFields[field] = newVal;
                }
            };

            addIfBetter("description", item.description);
            
            // Orientation (Logique Safe)
            if ((!original.orientation || original.orientation === "") && item.orientation) {
                let o = item.orientation.toUpperCase().trim();
                const map = { "W": "O", "WEST": "O", "SW": "SO", "NW": "NO", "SOUTH": "S", "NORTH": "N", "EAST": "E" };
                if (map[o]) o = map[o];
                
                setFields["orientation"] = o;
                setFields["info_complementaires.orientation"] = o;
            }

            // Niveaux
            addIfBetter("niveau_min", item.niveau_min, OVERWRITE_LEVELS);
            
            let finalMax = item.niveau_max;
            if (!finalMax && item.niveau_min) finalMax = item.niveau_min;
            addIfBetter("niveau_max", finalMax, OVERWRITE_LEVELS);

            // Roche
            if ((!original.info_complementaires?.rock || original.info_complementaires.rock === "") && item.rock_type) {
                setFields["info_complementaires.rock"] = item.rock_type;
            }

            // --- AFFICHAGE DETAILLÉ ---
            if (Object.keys(setFields).length > 0) {
                // On affiche TOUT ce qui va être modifié
                console.log(`\n🔍 [${original.name}] Modifications :`);
                console.log(JSON.stringify(setFields, null, 2).replace(/^/gm, '   ')); // Indentation jolie
            }

            const updateDoc = Object.keys(setFields).length > 0 
                ? { $set: { ...setFields, ai_processed: true } }
                : { $set: { ai_processed: true } };

            bulkOps.push({ updateOne: { filter: { _id: new ObjectId(item._id) }, update: updateDoc } });
        }

        if (bulkOps.length > 0 && !DRY_RUN) {
            await spotsColl.bulkWrite(bulkOps);
        }
        
        return bulkOps.length;

    } catch (err) {
        console.error(`   ❌ Erreur Chunk ${chunkIndex}:`, err.message);
        return 0;
    }
}

async function runParallelBatch() {
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || "ZoneDeGrimpe");
    const spotsColl = db.collection("climbing_spot");

    console.log(`🚀 MODE PRO FINAL (x${CONCURRENCY} threads) | DRY_RUN: ${DRY_RUN}`);

    let running = true;
    while (running) {
        const query = {
            ai_processed: { $ne: true },
            name: { $ne: "" },
            $or: [
                { description: { $in: [null, ""] } },
                { orientation: { $in: [null, ""] } },
                { niveau_min: { $in: [null, ""] } },
                { niveau_max: { $in: [null, ""] } }, 
                { "info_complementaires.rock": { $in: [null, ""] } }
            ]
        };

        const totalRemaining = await spotsColl.countDocuments(query);
        if (totalRemaining === 0) {
            console.log("🎉 TERMINE ! La base est complète.");
            break;
        }

        console.log(`\n📦 Chargement DB... (Reste: ${totalRemaining})`);
        const spots = await spotsColl.find(query).limit(DB_BATCH_SIZE).toArray();

        const chunks = [];
        for (let i = 0; i < spots.length; i += AI_CHUNK_SIZE) {
            chunks.push(spots.slice(i, i + AI_CHUNK_SIZE));
        }

        console.log(`   🔥 Traitement parallèle de ${chunks.length} paquets...`);

        for (let i = 0; i < chunks.length; i += CONCURRENCY) {
            const batchPromises = chunks.slice(i, i + CONCURRENCY).map((chunk, idx) => {
                return processAiChunk(spotsColl, chunk, i + idx + 1);
            });
            await Promise.all(batchPromises);
        }
    }

  } catch (e) {
    console.error("CRASH:", e);
  } finally {
    await client.close();
  }
}

runParallelBatch();