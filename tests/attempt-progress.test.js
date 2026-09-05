import test from 'node:test';
import assert from 'node:assert/strict';
import { createAttemptProgress, getResumedHintLevel } from '../src/core/review/createAttemptProgress.js';

test('복습 예정일 전에 반복 제출해도 복습 횟수가 늘거나 MASTERED가 되지 않는다', () => {
  const now = new Date('2026-09-05T03:00:00Z');
  const current = { reviewCount: 2, nextReview: '2026-09-06T03:00:00Z' };
  const early = createAttemptProgress(current, { status: 'passed', attempts: 3, now });
  assert.equal(early.reviewCount, 2);
  assert.equal(early.status, 'SOLVED');
  assert.equal(early.nextReview, current.nextReview);
  const due = createAttemptProgress(current, { status: 'passed', attempts: 4, now: new Date('2026-09-06T04:00:00Z') });
  assert.equal(due.reviewCount, 3);
  assert.equal(due.status, 'MASTERED');
});

test('같은 풀이에서 재제출하면 마지막 제출 이후 시간만 누적한다', () => {
  const first = createAttemptProgress({}, { status: 'failed', attempts: 1, seconds: 60, elapsedSinceLastSubmit: 60 });
  const second = createAttemptProgress(first, { status: 'passed', attempts: 2, seconds: 90, elapsedSinceLastSubmit: 30 });
  assert.equal(second.totalTimeSpent, 90);
});

test('힌트를 본 복습은 독립 복습 횟수를 올리지 않고 내일 다시 연습한다', () => {
  const now = new Date('2026-09-05T03:00:00Z');
  const current = { reviewCount: 2, nextReview: '2026-09-04T03:00:00Z' };
  const assisted = createAttemptProgress(current, { status: 'passed', attempts: 4, hintsUsed: 2, now });
  assert.equal(assisted.reviewCount, 2);
  assert.equal(assisted.status, 'SOLVED_WITH_HINT');
  assert.equal(assisted.nextReview, '2026-09-06T03:00:00.000Z');
});

test('진행 중 힌트 사용은 문제를 다시 열어도 유지하고 다음 복습은 독립적으로 시작한다', () => {
  assert.equal(getResumedHintLevel({ status: 'TRYING', lastHintsUsed: 1 }), 1);
  assert.equal(getResumedHintLevel({ status: 'FAILED', hintsUsed: 3 }), 3);
  assert.equal(getResumedHintLevel({ status: 'SOLVED_WITH_HINT', hintsUsed: 3 }), 0);
  assert.equal(createAttemptProgress({}, { status: 'passed', attempts: 1, hintsUsed: 1 }).status, 'SOLVED_WITH_HINT');
});
