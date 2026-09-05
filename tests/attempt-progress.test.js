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

test('먼 복습 날짜가 있어도 오답과 힌트 정답은 내일 다시 배정한다', () => {
  const now = new Date('2026-09-05T03:00:00Z');
  const current = { status: 'SOLVED', mastery: 65, reviewCount: 2, nextReview: '2026-09-19T03:00:00Z' };
  const wrong = createAttemptProgress(current, { status: 'failed', attempts: 4, now });
  const hinted = createAttemptProgress(current, { status: 'passed', attempts: 4, hintsUsed: 1, now });
  assert.equal(wrong.nextReview, '2026-09-06T03:00:00.000Z');
  assert.equal(hinted.nextReview, '2026-09-06T03:00:00.000Z');
  assert.equal(wrong.reviewCount, 2);
  assert.equal(hinted.reviewCount, 2);
});

test('첫 독립 정답도 내일부터 복습하고 같은 날 반복 제출로 숙련도를 부풀리지 않는다', () => {
  const now = new Date('2026-09-05T03:00:00Z');
  const first = createAttemptProgress({}, { status: 'passed', attempts: 1, now });
  assert.equal(first.nextReview, '2026-09-06T03:00:00.000Z');
  let repeated = first;
  for (let index = 2; index < 20; index += 1) repeated = createAttemptProgress(repeated, { status: 'passed', attempts: index, now });
  assert.equal(repeated.mastery, first.mastery);
  assert.equal(repeated.reviewCount, 0);
  assert.equal(repeated.status, 'SOLVED');
  const failed = createAttemptProgress(repeated, { status: 'failed', attempts: 20, now });
  const retried = createAttemptProgress(failed, { status: 'passed', attempts: 21, now });
  assert.equal(retried.mastery, first.mastery);
});

test('복습 전 재제출은 날짜가 달라도 숙련도를 늘리지 않고 예정일 성공만 인정한다', () => {
  const first = createAttemptProgress({}, { status: 'passed', attempts: 1, now: new Date('2026-09-05T03:00:00Z') });
  const review = createAttemptProgress(first, { status: 'passed', attempts: 2, now: new Date('2026-09-06T04:00:00Z') });
  const early = createAttemptProgress(review, { status: 'passed', attempts: 3, now: new Date('2026-09-07T04:00:00Z') });
  assert.ok(review.mastery > first.mastery);
  assert.equal(review.reviewCount, 1);
  assert.equal(early.mastery, review.mastery);
  assert.equal(early.reviewCount, 1);
  assert.equal(early.nextReview, review.nextReview);
});

test('같은 날 힌트 풀이를 다시 열어도 독립 정답으로 둔갑하지 않는다', () => {
  const now = new Date(2026, 8, 5, 12);
  const hinted = createAttemptProgress({}, { status: 'passed', attempts: 1, hintsUsed: 2, now });
  assert.equal(getResumedHintLevel(hinted, now), 2);
  const reopened = createAttemptProgress(hinted, { status: 'passed', attempts: 2, hintsUsed: 0, now });
  assert.equal(reopened.status, 'SOLVED_WITH_HINT');
  assert.equal(reopened.lastHintsUsed, 2);
  assert.equal(reopened.mastery, hinted.mastery);
  const tomorrow = new Date(2026, 8, 6, 13);
  assert.equal(getResumedHintLevel(reopened, tomorrow), 0);
  const independent = createAttemptProgress(reopened, { status: 'passed', attempts: 3, hintsUsed: 0, now: tomorrow });
  assert.equal(independent.status, 'SOLVED');
  assert.equal(independent.lastHintsUsed, 0);
});

test('같은 문제를 다른 날 풀어도 이전 학습 날짜가 보존되고 잘못된 숫자는 전파되지 않는다', () => {
  const first = createAttemptProgress({}, { status: 'failed', attempts: 1, now: new Date(2026, 8, 5, 12) });
  const second = createAttemptProgress(first, { status: 'passed', attempts: 2, now: new Date(2026, 8, 6, 12) });
  assert.deepEqual(second.studyDays, ['2026-09-05', '2026-09-06']);
  const restored = createAttemptProgress({ ...second, totalTimeSpent: '90', reviewCount: '2', mastery: '30' }, { status: 'failed', attempts: 3, elapsedSinceLastSubmit: '20', now: new Date(2026, 8, 7, 12) });
  assert.equal(restored.totalTimeSpent, 110);
  assert.equal(restored.reviewCount, 2);
  assert.equal(restored.mastery, 30);
});
