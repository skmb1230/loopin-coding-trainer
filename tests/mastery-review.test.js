import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMastery } from '../src/core/mastery/calculateMastery.js';
import { calculateNextReview, isReviewDue } from '../src/core/review/calculateNextReview.js';

test('첫 시도 무힌트 정답이 힌트 정답보다 더 큰 숙련도를 준다', () => {
  const firstTry = calculateMastery(20, { solved: true, firstTry: true, hintsUsed: 0 });
  const hinted = calculateMastery(20, { solved: true, firstTry: false, hintsUsed: 4 });
  assert.ok(firstTry > hinted);
  assert.ok(hinted > 20);
});

test('오답은 학습자를 크게 벌주지 않는다', () => {
  assert.equal(calculateMastery(40, { solved: false }), 40);
  assert.equal(calculateMastery(40, { solved: false, timedOut: true }), 39);
});

test('복습 간격은 1, 3, 7, 14일로 증가한다', () => {
  const start = new Date('2026-09-03T00:00:00.000Z');
  const day = 24 * 60 * 60 * 1000;
  assert.equal((new Date(calculateNextReview(start, 0)) - start) / day, 1);
  assert.equal((new Date(calculateNextReview(start, 1)) - start) / day, 3);
  assert.equal((new Date(calculateNextReview(start, 3)) - start) / day, 14);
  assert.equal(isReviewDue('2026-09-02T00:00:00.000Z', start), true);
});
