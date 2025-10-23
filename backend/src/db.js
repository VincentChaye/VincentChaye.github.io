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

    // Index géospatial (2dsphere) - on utilise 'location' comme champ standard
    const collection = db.collection("climbing_spot");
    
    // Supprimer les anciens index conflictuels
    try {
      await collection.dropIndex({ geometry: "2dsphere" });
    } catch (e) {
      // Index n'existe pas, c'est OK
    }
    
    // Créer l'index sur le champ 'location'
    await collection.createIndex({ location: "2dsphere" });
    console.log(`Connecté à MongoDB (${dbName}), index 2dsphere sur 'location' OK`);

    return { client, db };
  } catch (error) {
    console.error("Erreur de connexion MongoDB :", error.message);
    throw error; // important pour que server.js gère l'erreur
  }
}
