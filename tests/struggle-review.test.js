import test from 'node:test';
import assert from 'node:assert/strict';
import { createStruggleProgress, createStruggleRecord } from '../src/core/review/createStruggleReview.js';

test('막힘 기록은 사용자의 생각을 다듬어 기억 카드로 만든다', () => {
  const createdAt = '2026-09-03T03:00:00.000Z';
  const record = createStruggleRecord({
    problemId: 'JS0001',
    blockage: '접근 방법이 떠오르지 않음',
    prompt: '작은 예제를 손으로 계산해보세요.',
    recall: '  입력을 하나씩 확인한다.  ',
    nextAttempt: '  반복문부터 작성한다.  ',
    createdAt,
  });
  const progress = createStruggleProgress({ status: 'NOT_STARTED' }, record, 0);

  assert.equal(record.recall, '입력을 하나씩 확인한다.');
  assert.equal(progress.status, 'TRYING');
  assert.equal(progress.hintsUsed, 1);
  assert.equal(progress.stuckCount, 1);
  assert.equal(progress.recallCard.nextAttempt, '반복문부터 작성한다.');
  assert.equal(progress.nextReview, '2026-09-04T03:00:00.000Z');
});

test('해결한 문제에서 다시 막히면 복습 상태로 전환한다', () => {
  const record = createStruggleRecord({
    problemId: 'JS0002',
    blockage: '코드는 작성했는데 틀림',
    prompt: '실패할 입력을 만들어보세요.',
    recall: '빈 입력을 확인하지 않았다.',
    nextAttempt: '빈 입력 테스트를 추가한다.',
    createdAt: '2026-09-03T03:00:00.000Z',
  });
  const progress = createStruggleProgress({ status: 'SOLVED', hintsUsed: 2, stuckCount: 1 }, record, 1);

  assert.equal(progress.status, 'REVIEW');
  assert.equal(progress.hintsUsed, 2);
  assert.equal(progress.lastHintsUsed, 1);
  assert.equal(progress.stuckCount, 2);
});
