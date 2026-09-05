import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLocalLearningData, LOCAL_LEARNING_KEYS, storage, validateBackup } from '../src/core/storage/db.js';

const blankBackup = () => ({ version: 1, progress: {}, code: {}, notes: {}, sessions: {}, curriculum: {}, local: {} });

function browserGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

function localStorageMock(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

// A small transaction harness: writes become visible only on commit, and a
// request can succeed before its surrounding transaction is later aborted.
function databaseHarness({ failCommit = false, failKey } = {}) {
  const stores = Object.fromEntries(['progress', 'code', 'notes', 'sessions', 'curriculum'].map((name) => [name, new Map([['old', name]])]));
  const transactions = [];
  let closed = 0;
  const database = {
    close() { closed += 1; },
    transaction(names, mode) {
      const included = Array.isArray(names) ? names : [names];
      const pending = Object.fromEntries(included.map((name) => [name, new Map(stores[name])]));
      const requests = [];
      let aborted = false;
      const transaction = {
        error: null,
        abort() { aborted = true; queueMicrotask(() => transaction.onabort?.()); },
        objectStore(name) {
          const request = (action) => {
            const result = { result: action() };
            requests.push(result);
            return result;
          };
          return {
            get: (key) => request(() => pending[name].get(key)),
            getAllKeys: () => request(() => [...pending[name].keys()]),
            getAll: () => request(() => [...pending[name].values()]),
            clear: () => request(() => pending[name].clear()),
            put: (value, key) => {
              if (key === failKey) throw new Error('Cannot clone value');
              return request(() => pending[name].set(key, value));
            },
          };
        },
      };
      transactions.push({ names: included, mode });
      queueMicrotask(() => {
        if (aborted) return;
        for (const request of requests) request.onsuccess?.();
        queueMicrotask(() => {
          if (aborted) return;
          if (failCommit) {
            transaction.error = new Error('Storage quota exceeded');
            transaction.abort();
          } else {
            if (mode === 'readwrite') for (const name of included) stores[name] = pending[name];
            transaction.oncomplete?.();
          }
        });
      });
      return transaction;
    },
  };
  return {
    stores, transactions, closed: () => closed,
    indexedDB: { open() { const request = { result: database }; queueMicrotask(() => request.onsuccess()); return request; } },
  };
}

test('잘못되거나 누락된 백업은 기존 데이터를 변경하기 전에 거절한다', async (t) => {
  const local = localStorageMock({ 'loopin-profile': '{"name":"current"}' });
  browserGlobal(t, 'localStorage', local);
  const backup = blankBackup();
  delete backup.notes;
  await assert.rejects(storage.importAll(backup), /notes/);
  assert.equal(local.getItem('loopin-profile'), '{"name":"current"}');
  assert.throws(() => validateBackup({ ...blankBackup(), local: { 'loopin-settings': 'not json' } }), /설정/);
});

test('백업은 신규 용어 학습을 포함하고 오래된 백업의 누락된 키는 유지한다', async (t) => {
  const db = databaseHarness();
  const local = localStorageMock({ 'loopin-workplace-learning': '{"dailyCount":5}', 'unrelated-app': 'keep' });
  browserGlobal(t, 'indexedDB', db.indexedDB);
  browserGlobal(t, 'localStorage', local);
  const exported = await storage.exportAll();
  assert.equal(exported.local['loopin-workplace-learning'], '{"dailyCount":5}');
  await storage.importAll({ ...blankBackup(), local: { 'unrelated-app': 'overwrite' } });
  assert.equal(local.getItem('loopin-workplace-learning'), '{"dailyCount":5}');
  assert.equal(local.getItem('unrelated-app'), 'keep');
  assert.deepEqual(db.transactions.at(-1).names, ['progress', 'code', 'notes', 'sessions', 'curriculum']);
});

test('개별 요청 성공 후 트랜잭션이 실패하면 저장 성공으로 보고하지 않는다', async (t) => {
  const db = databaseHarness({ failCommit: true });
  browserGlobal(t, 'indexedDB', db.indexedDB);
  await assert.rejects(storage.set('code', 'new', 'answer'), /quota/);
  assert.equal(db.stores.code.has('new'), false);
  assert.ok(db.closed() > 0);
});

test('복구 중 실패하면 모든 기존 스토어와 로컬 설정이 유지된다', async (t) => {
  const db = databaseHarness({ failKey: 'broken' });
  const local = localStorageMock({ 'loopin-profile': '{"name":"old"}' });
  browserGlobal(t, 'indexedDB', db.indexedDB);
  browserGlobal(t, 'localStorage', local);
  await assert.rejects(storage.importAll({ ...blankBackup(), code: { broken: 'answer' }, local: { 'loopin-profile': '{"name":"new"}' } }), /clone/);
  for (const [name, entries] of Object.entries(db.stores)) assert.equal(entries.get('old'), name);
  assert.equal(local.getItem('loopin-profile'), '{"name":"old"}');
});

test('null 백업값은 제거하고 전체 초기화는 이 앱의 로컬 키만 지운다', async (t) => {
  const db = databaseHarness();
  const local = localStorageMock(Object.fromEntries([...LOCAL_LEARNING_KEYS.map((key) => [key, '{}']), ['unrelated-app', 'keep']]));
  browserGlobal(t, 'indexedDB', db.indexedDB);
  browserGlobal(t, 'localStorage', local);
  await storage.importAll({ ...blankBackup(), local: { 'loopin-profile': null } });
  assert.equal(local.getItem('loopin-profile'), null);
  clearLocalLearningData();
  for (const key of LOCAL_LEARNING_KEYS) assert.equal(local.getItem(key), null);
  assert.equal(local.getItem('unrelated-app'), 'keep');
});
