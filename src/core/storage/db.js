const DB_NAME = 'loopin-learning';
const DB_VERSION = 1;
const STORES = ['progress', 'code', 'notes', 'sessions', 'curriculum'];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(storeName, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export const storage = {
  get: (store, key) => transact(store, 'readonly', (objectStore) => objectStore.get(key)),
  set: (store, key, value) => transact(store, 'readwrite', (objectStore) => objectStore.put(value, key)),
  remove: (store, key) => transact(store, 'readwrite', (objectStore) => objectStore.delete(key)),
  clear: (store) => transact(store, 'readwrite', (objectStore) => objectStore.clear()),
  async getAll(store) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readonly');
      const objectStore = transaction.objectStore(store);
      const keysRequest = objectStore.getAllKeys();
      const valuesRequest = objectStore.getAll();
      transaction.oncomplete = () => {
        resolve(Object.fromEntries(keysRequest.result.map((key, index) => [key, valuesRequest.result[index]])));
        db.close();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  },
  async exportAll() {
    const result = { version: 1, exportedAt: new Date().toISOString(), local: {} };
    for (const store of STORES) result[store] = await this.getAll(store);
    for (const key of ['loopin-profile', 'loopin-settings']) result.local[key] = localStorage.getItem(key);
    return result;
  },
  async importAll(data) {
    if (!data || data.version !== 1) throw new Error('지원하지 않는 백업 파일입니다.');
    for (const store of STORES) {
      await this.clear(store);
      for (const [key, value] of Object.entries(data[store] || {})) await this.set(store, key, value);
    }
    for (const [key, value] of Object.entries(data.local || {})) if (value !== null) localStorage.setItem(key, value);
  },
};

export function getLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
