const DB_NAME = 'loopin-learning';
const DB_VERSION = 1;
const STORES = ['progress', 'code', 'notes', 'sessions', 'curriculum'];
export const LOCAL_LEARNING_KEYS = Object.freeze(['loopin-profile', 'loopin-settings', 'loopin-learning-progress', 'loopin-workplace-learning']);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateBackup(data) {
  if (!isRecord(data) || data.version !== 1) throw new Error('지원하지 않는 백업 파일입니다.');
  for (const store of STORES) {
    if (!isRecord(data[store])) throw new Error(`백업의 ${store} 데이터가 올바르지 않습니다. 기존 데이터는 변경하지 않았어요.`);
  }
  if (!isRecord(data.local)) throw new Error('백업의 로컬 설정 데이터가 올바르지 않습니다.');
  const local = {};
  for (const key of LOCAL_LEARNING_KEYS) {
    if (!Object.hasOwn(data.local, key)) continue; // Older backups do not contain newer learning tracks.
    const value = data.local[key];
    if (value !== null) {
      try {
        if (typeof value !== 'string' || !isRecord(JSON.parse(value))) throw new Error();
      } catch {
        throw new Error(`백업의 ${key} 설정이 올바르지 않습니다. 기존 데이터는 변경하지 않았어요.`);
      }
    }
    local[key] = value;
  }
  return { ...data, local };
}

export function clearLocalLearningData() {
  for (const key of LOCAL_LEARNING_KEYS) localStorage.removeItem(key);
}

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
    let transaction;
    try {
      transaction = db.transaction(storeName, mode);
      let request;
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error('데이터 저장이 취소되었습니다.')); };
      // A successful request is not durable until its transaction commits.
      request = action(transaction.objectStore(storeName));
    } catch (error) {
      transaction?.abort();
      db.close();
      reject(error);
    }
  });
}

async function replaceStores(data) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(STORES, 'readwrite');
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error('백업 복구가 취소되었습니다. 기존 학습 기록은 유지됩니다.')); };
      for (const name of STORES) {
        const store = transaction.objectStore(name);
        store.clear();
        for (const [key, value] of Object.entries(data[name])) store.put(value, key);
      }
    } catch (error) {
      transaction?.abort();
      db.close();
      reject(error);
    }
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
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error('학습 기록을 읽지 못했습니다.')); };
    });
  },
  async removeWhere(store, predicate) {
    const entries = await this.getAll(store);
    const keys = Object.entries(entries).filter(([key, value]) => predicate(key, value)).map(([key]) => key);
    await Promise.all(keys.map((key) => this.remove(store, key)));
    return keys.length;
  },
  async exportAll() {
    const result = { version: 1, exportedAt: new Date().toISOString(), local: {} };
    for (const store of STORES) result[store] = await this.getAll(store);
    for (const key of LOCAL_LEARNING_KEYS) result.local[key] = localStorage.getItem(key);
    return result;
  },
  async importAll(data) {
    const validated = validateBackup(data);
    const previousLocal = Object.fromEntries(Object.keys(validated.local).map((key) => [key, localStorage.getItem(key)]));
    const writeLocal = (entries) => {
      for (const [key, value] of Object.entries(entries)) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    };
    try {
      // Check localStorage quota/access before changing IndexedDB. If IndexedDB
      // aborts, its stores roll back together and the local settings are restored.
      writeLocal(validated.local);
      await replaceStores(validated);
    } catch (error) {
      writeLocal(previousLocal);
      throw error;
    }
  },
};

export function getLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
