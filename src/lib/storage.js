import { openDB } from 'idb';

const DB_NAME = 'census-tracker';
const DB_VERSION = 1;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const areas = db.createObjectStore('areas', { keyPath: 'id' });
        areas.createIndex('by-created', 'createdAt');
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('by-area', 'areaId');
        sessions.createIndex('by-started', 'startedAt');
      },
    });
  }
  return dbPromise;
}

export async function getAllAreas() {
  const db = await getDb();
  const areas = await db.getAll('areas');
  return areas.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getArea(id) {
  const db = await getDb();
  return db.get('areas', id);
}

export async function saveArea(area) {
  const db = await getDb();
  await db.put('areas', area);
}

export async function deleteArea(id) {
  const db = await getDb();
  await db.delete('areas', id);
}

export async function getAllSessions() {
  const db = await getDb();
  const sessions = await db.getAll('sessions');
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getSession(id) {
  const db = await getDb();
  return db.get('sessions', id);
}

export async function getActiveSession() {
  const sessions = await getAllSessions();
  return sessions.find((s) => s.status === 'active' || s.status === 'paused');
}

export async function saveSession(session) {
  const db = await getDb();
  await db.put('sessions', session);
}

export async function deleteSession(id) {
  const db = await getDb();
  await db.delete('sessions', id);
}
