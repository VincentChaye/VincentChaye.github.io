import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/* ---------- Interfaces métier (utilisées dans les phases suivantes) ---------- */

export interface OfflinePack {
  id: string;
  name: string;
  spotId: string;
  radiusKm: number;
  corridor?: { from: [number, number]; to: [number, number]; widthKm: number };
  /** Couche des tuiles du pack — 'dark' pour les anciens packs, 'satellite' depuis la v6.3+ */
  layer: 'dark' | 'satellite';
  /** Plage de zooms du RAYON ; le corridor éventuel est limité à 8–12. */
  zooms: { min: number; max: number };
  tileCount: number;
  bytes: number;
  spotIds: string[];
  status: 'downloading' | 'ready' | 'error' | 'partial';
  createdAt: number;
}

export interface QueuedMutation {
  id: string;
  method: 'POST';
  path: string;
  body: unknown;
  kind: 'spot' | 'logbook';
  createdAt: number;
  status: 'pending' | 'syncing' | 'error';
  error?: string;
  attempts: number;
}

/* ---------- Schéma IndexedDB ---------- */

interface ZdgDB extends DBSchema {
  tiles: {
    key: string; // `${layer}/${z}/${x}/${y}`
    value: { blob: Blob; packIds: string[]; updatedAt: number };
    indexes: { 'by-pack': string };
  };
  spots: {
    key: string; // id du spot
    value: { geometry: unknown; properties: unknown };
  };
  meta: {
    key: string;
    value: unknown;
  };
  routes: {
    key: string; // spotId
    value: { routes: unknown[]; updatedAt: number };
  };
  packs: {
    key: string;
    value: OfflinePack;
    keyPath: 'id';
  };
  queue: {
    key: string;
    value: QueuedMutation;
    keyPath: 'id';
  };
}

/* ---------- Singleton de connexion ---------- */

let _db: IDBPDatabase<ZdgDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ZdgDB>> {
  if (_db) return _db;
  _db = await openDB<ZdgDB>('zdg-offline', 1, {
    upgrade(db) {
      // Tuiles de carte
      const tiles = db.createObjectStore('tiles');
      tiles.createIndex('by-pack', 'packIds', { multiEntry: true });

      // Spots (features GeoJSON brutes)
      db.createObjectStore('spots');

      // Métadonnées clés/valeurs libres
      db.createObjectStore('meta');

      // Voies par spot
      db.createObjectStore('routes');

      // Packs hors ligne
      db.createObjectStore('packs', { keyPath: 'id' });

      // File de mutations offline
      db.createObjectStore('queue', { keyPath: 'id' });
    },
  });
  return _db;
}
