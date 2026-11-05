// Persistance locale : tout l'état de l'app est un seul objet JSON stocké dans IndexedDB.
// Repli sur localStorage si IndexedDB est indisponible (navigation privée, par exemple).

const DB_NAME = 'workout-log';
const STORE = 'kv';
const KEY = 'state';

let dbPromise = null;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function load() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  }
}

let pending = null;
let timer = null;

export function save(state) {
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(flush, 200);
}

export async function flush() {
  clearTimeout(timer);
  if (!pending) return;
  const snapshot = JSON.parse(JSON.stringify(pending));
  pending = null;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(snapshot, KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch { /* stockage plein ou bloqué */ }
  }
}
