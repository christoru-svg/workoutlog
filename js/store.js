// Persistance locale : tout l'état de l'app est un seul objet JSON stocké dans IndexedDB.
// Repli sur localStorage si IndexedDB est indisponible (navigation privée, par exemple).

const DB_NAME = 'workout-log';
const STORE = 'kv';
const PHOTOS = 'photos';   // photos rangées à part : la sauvegarde de l'état reste légère
const KEY = 'state';

let dbPromise = null;
let blockedHandler = null;
// Appelé si une autre fenêtre de l'app (ancienne version) garde la base ouverte pendant une mise à jour
export function onBlocked(fn) { blockedHandler = fn; }

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS);
      };
      req.onblocked = () => blockedHandler?.();
      req.onsuccess = () => {
        const db = req.result;
        // Une version plus récente ouverte ailleurs demande la base : on la libère et on recharge.
        db.onversionchange = () => { db.close(); location.reload(); };
        resolve(db);
      };
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

/* Photos des exercices : clé = id de l'exercice, valeur = image en data URL */
export async function loadPhotos() {
  const map = new Map();
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const req = db.transaction(PHOTOS).objectStore(PHOTOS).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { map.set(c.key, c.value); c.continue(); } else resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch { /* pas de photos disponibles */ }
  return map;
}

async function photoTx(fn) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS, 'readwrite');
      fn(tx.objectStore(PHOTOS));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* stockage indisponible */ }
}
export const putPhoto = (id, data) => photoTx((st) => st.put(data, id));
export const delPhoto = (id) => photoTx((st) => st.delete(id));
export const clearPhotos = () => photoTx((st) => st.clear());
