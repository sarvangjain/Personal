import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Recording } from '../types';

interface PetMonitorDB extends DBSchema {
  recordings: {
    key: string;
    value: Recording;
    indexes: {
      'by-timestamp': Date;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'pet-monitor-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PetMonitorDB> | null = null;

async function getDB(): Promise<IDBPDatabase<PetMonitorDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PetMonitorDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('recordings')) {
        const recordingsStore = db.createObjectStore('recordings', {
          keyPath: 'id',
        });
        recordingsStore.createIndex('by-timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

export async function saveRecording(recording: Recording): Promise<void> {
  const db = await getDB();
  await db.put('recordings', recording);
  console.log('[Storage] Recording saved:', recording.id);
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  const db = await getDB();
  return db.get('recordings', id);
}

export async function getAllRecordings(): Promise<Recording[]> {
  const db = await getDB();
  const recordings = await db.getAllFromIndex('recordings', 'by-timestamp');
  return recordings.reverse();
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  
  const recording = await db.get('recordings', id);
  if (recording?.blob) {
    URL.revokeObjectURL(URL.createObjectURL(recording.blob));
  }
  
  await db.delete('recordings', id);
  console.log('[Storage] Recording deleted:', id);
}

export async function deleteOldRecordings(maxAgeHours: number = 24): Promise<number> {
  const db = await getDB();
  const recordings = await db.getAll('recordings');
  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  let deletedCount = 0;

  for (const recording of recordings) {
    if (new Date(recording.timestamp) < cutoffTime) {
      await db.delete('recordings', recording.id);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`[Storage] Deleted ${deletedCount} old recordings`);
  }

  return deletedCount;
}

export async function getRecordingsCount(): Promise<number> {
  const db = await getDB();
  return db.count('recordings');
}

export async function getStorageUsage(): Promise<number> {
  const recordings = await getAllRecordings();
  return recordings.reduce((total, rec) => total + (rec.blob?.size || 0), 0);
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value as T | undefined;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('recordings');
  await db.clear('settings');
  console.log('[Storage] All data cleared');
}
