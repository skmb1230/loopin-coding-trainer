import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftSaver } from '../src/core/storage/draftSaver.js';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('자동저장 대기·실패 상태에서는 탭 종료 전에 입력 보호가 필요하다', async () => {
  const operation = deferred();
  const saver = createDraftSaver(() => operation.promise);
  const save = saver.save('code', 'JS0001:java', 'unfinished');
  assert.equal(saver.status().dirty, true);
  operation.reject(new Error('quota exceeded'));
  await assert.rejects(save, /quota/);
  assert.equal(saver.status().dirty, true);
  await assert.rejects(saver.waitForIdle(), /quota/);
});

test('메모 저장 성공이 코드 저장 실패를 지우지 않으며 재저장으로 복구한다', async () => {
  let codeFails = true;
  const saver = createDraftSaver(async (store) => {
    if (store === 'code' && codeFails) throw new Error('code quota');
  });
  await assert.rejects(saver.save('code', 'JS0001:javascript', 'answer'), /quota/);
  await saver.save('notes', 'JS0001:javascript', 'memo');
  assert.match(saver.status().error.message, /code quota/);
  assert.equal(saver.status().dirty, true);
  codeFails = false;
  saver.retryFailed();
  await saver.waitForIdle();
  assert.deepEqual(saver.status(), { pendingCount: 0, dirty: false, error: null });
});

test('이동 전 저장 대기는 대기 중 들어온 마지막 편집까지 순서대로 완료한다', async () => {
  const first = deferred();
  const last = deferred();
  const values = [];
  const saver = createDraftSaver(async (_store, _key, value) => {
    await (value === 'first' ? first.promise : last.promise);
    values.push(value);
  });
  saver.save('code', 'JS0001:javascript', 'first');
  let left = false;
  const leaving = saver.waitForIdle().then(() => { left = true; });
  saver.save('code', 'JS0001:javascript', 'last');
  first.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(left, false);
  assert.equal(saver.status().dirty, true);
  last.resolve();
  await leaving;
  assert.deepEqual(values, ['first', 'last']);
  assert.equal(saver.status().dirty, false);
});

test('같은 문제라도 다른 언어의 저장 성공은 실패한 언어의 입력을 덮지 않는다', async () => {
  const saver = createDraftSaver(async (_store, key) => {
    if (key.endsWith(':java')) throw new Error('java draft failed');
  });
  await assert.rejects(saver.save('code', 'JS0001:java', 'class Solution {}'));
  await saver.save('code', 'JS0001:javascript', 'function solution() {}');
  await assert.rejects(saver.waitForIdle(), /java draft failed/);
});
