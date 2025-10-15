import { MongoClient, ServerApiVersion } from "mongodb";

let client, db;

export async function connectToDb(uri, dbName) {
  try {
    // Évite de reconnecter si déjà initialisé
    if (db && client) return { client, db };

    // Version API stable, timeout de sécurité
    client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    db = client.db(dbName);

    // Index géospatial (2dsphere)
    const collection = db.collection("climbing_spot");
    await collection.createIndex({ geometry: "2dsphere" });
    console.log(`Connecté à MongoDB (${dbName}), index 2dsphere OK`);

    return { client, db };
  } catch (error) {
    console.error("Erreur de connexion MongoDB :", error.message);
    throw error; // important pour que server.js gère l'erreur
  }
}
