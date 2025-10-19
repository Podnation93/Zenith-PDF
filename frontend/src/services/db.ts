import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Annotation } from '../types';

const DB_NAME = 'ZenithPDF-DB';
const DB_VERSION = 1;

interface ZenithPDFDB extends DBSchema {
  documents: {
    key: string;
    value: {
      id: string;
      pdf: Blob;
    };
  };
  annotations: {
    key: string;
    value: Annotation;
    indexes: { documentId: string };
  };
  'sync-queue': {
    key: number;
    value: {
      type: 'annotation';
      payload: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ZenithPDFDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ZenithPDFDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ZenithPDFDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotationStore.createIndex('documentId', 'documentId');
        }
        if (!db.objectStoreNames.contains('sync-queue')) {
          db.createObjectStore('sync-queue', { autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// Document Caching
export async function cacheDocument(id: string, pdf: Blob) {
  const db = await getDb();
  return db.put('documents', { id, pdf });
}

export async function getCachedDocument(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  const doc = await db.get('documents', id);
  return doc?.pdf;
}

// Annotation Caching
export async function cacheAnnotations(annotations: Annotation[]) {
  const db = await getDb();
  const tx = db.transaction('annotations', 'readwrite');
  await Promise.all(annotations.map(ann => tx.store.put(ann)));
  return tx.done;
}

export async function getCachedAnnotations(documentId: string): Promise<Annotation[]> {
  const db = await getDb();
  return db.getAllFromIndex('annotations', 'documentId', documentId);
}

// Sync Queue
export async function addToSyncQueue(item: any) {
  const db = await getDb();
  return db.add('sync-queue', item);
}

export async function getSyncQueue(): Promise<any[]> {
  const db = await getDb();
  return db.getAll('sync-queue');
}

export async function clearSyncQueue() {
  const db = await getDb();
  return db.clear('sync-queue');
}
