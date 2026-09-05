import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addLocalDays, createDailySession, createWorkplaceState, getWorkplaceSummary,
  localDayKey, markWorkplaceTermSeen, normalizeWorkplaceState, recordWorkplaceAnswer,
} from '../src/core/workplace/learning.js';

const terms = [
  { id: 'migration', category: 'computer' },
  { id: 'porting', category: 'computer' },
  { id: 'cannibalization', category: 'business' },
  { id: 'feasibility', category: 'product' },
  { id: 'pipeline', category: 'sales' },
  { id: 'align', category: 'workplace' },
];
const start = (options = {}, now = '2026-09-05') => createDailySession(createWorkplaceState(), terms, options, now);
const answer = (state, id, correct, now = '2026-09-05', assisted = false) => recordWorkplaceAnswer(state, id, { correct, assisted }, now);

test('uses the local day near UTC midnight and calendar review dates across DST', () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Seoul';
    assert.equal(localDayKey('2026-09-04T16:00:00Z'), '2026-09-05');
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(localDayKey('2026-09-05T02:00:00Z'), '2026-09-04');
    assert.equal(localDayKey('2026-09-05'), '2026-09-05');
    assert.equal(addLocalDays('2026-03-07', 1), '2026-03-08');
    assert.equal(addLocalDays('2026-03-08', 1), '2026-03-09');
    assert.equal(addLocalDays('2026-10-31', 3), '2026-11-03');
    assert.equal(addLocalDays('2028-02-28', 1), '2028-02-29');
    assert.throws(() => localDayKey('2026-02-31'), TypeError);
    assert.throws(() => localDayKey(), TypeError);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('starts five by default, filters categories, and prioritizes manually chosen terms', () => {
  assert.equal(start().session.termIds.length, 5);
  const selected = start({ count: 2, categories: ['computer'], termIds: ['porting', 'pipeline'] });
  assert.deepEqual(selected.session.termIds, ['porting', 'migration']);
  assert.deepEqual(selected.preferences.termIds, ['porting']);
  assert.equal(start({ count: 999 }).preferences.count, 20);
  assert.equal(start({ count: 0 }).preferences.count, 1);
  assert.deepEqual(start({ categories: ['sales'], count: 5 }).session.termIds, ['pipeline']);
});

test('automatic unseen recommendations cycle through fields despite grouped catalog order', () => {
  const grouped = ['computer', 'business', 'product', 'sales', 'workplace'].flatMap(category => [
    { id: `${category}-first`, category },
    { id: `${category}-second`, category },
  ]);
  const balanced = createDailySession(createWorkplaceState(), grouped, { count: 7 }, '2026-09-05');
  assert.deepEqual(balanced.session.termIds, ['computer-first', 'business-first', 'product-first', 'sales-first', 'workplace-first', 'computer-second', 'business-second']);
  const filtered = createDailySession(createWorkplaceState(), grouped, { count: 3, categories: ['business', 'sales'] }, '2026-09-05');
  assert.deepEqual(filtered.session.termIds, ['business-first', 'sales-first', 'business-second']);
});

test('reload resumes the exact queue and preserves submitted answers', () => {
  let state = start({ count: 3, termIds: ['pipeline'] });
  state = answer(state, 'pipeline', false);
  const roundtrip = JSON.parse(JSON.stringify(state));
  const resumed = createDailySession(roundtrip, [...terms].reverse(), {}, '2026-09-05');
  assert.deepEqual(resumed, state);
  assert.equal(resumed.session.answers.pipeline.attempts, 1);
});

test('same-day count and category changes preserve all started terms and answers', () => {
  let state = start({ count: 3, termIds: ['migration', 'porting', 'cannibalization'] });
  state = answer(state, 'migration', true);
  state = answer(state, 'porting', false);
  state = markWorkplaceTermSeen(state, 'cannibalization', '2026-09-05');
  const changed = createDailySession(state, terms, { count: 1, categories: ['sales'], termIds: ['pipeline'] }, '2026-09-05');
  assert.deepEqual(changed.session.termIds, ['migration', 'porting', 'cannibalization', 'pipeline']);
  assert.deepEqual(changed.session.answers, state.session.answers);
  assert.equal(changed.preferences.count, 1);
  const expanded = createDailySession(changed, terms, { count: 4 }, '2026-09-05');
  assert.deepEqual(expanded.session.termIds, ['migration', 'porting', 'cannibalization', 'pipeline']);
  assert.equal(expanded.session.answers.migration.firstCorrect, true);
});

test('adding explicit choices never silently drops them behind already-completed work', () => {
  const catalog = [...terms, { id: 'scope', category: 'product' }, { id: 'revenue', category: 'business' }];
  let state = createDailySession(createWorkplaceState(), catalog, { count: 5 }, '2026-09-05');
  const finishedIds = [...state.session.termIds];
  for (const id of finishedIds) state = answer(state, id, true);
  const additions = catalog.filter(term => !finishedIds.includes(term.id)).map(term => term.id);
  const changed = createDailySession(state, catalog, { count: 3, termIds: additions }, '2026-09-05');
  assert.equal(changed.preferences.count, 3);
  assert.deepEqual(changed.session.termIds, [...finishedIds, ...additions]);
  assert.equal(changed.session.termIds.length, 8);
  assert.deepEqual(changed.session.answers, state.session.answers);
  assert.equal(getWorkplaceSummary(changed, catalog, '2026-09-05').completedCount, 5);
  assert.equal(getWorkplaceSummary(changed, catalog, '2026-09-05').remainingCount, 3);
});

test('due missed words precede due mastered words, then unseen words on a new day', () => {
  let state = start({ count: 2, termIds: ['porting', 'migration'] });
  state = answer(state, 'porting', false);
  state = answer(state, 'migration', true);
  const next = createDailySession(state, terms, { count: 3 }, '2026-09-06');
  assert.deepEqual(next.session.termIds, ['porting', 'migration', 'cannibalization']);
  assert.deepEqual(next.preferences.termIds, []);
  assert.deepEqual(next.session.answers, {});
  assert.equal(getWorkplaceSummary(next, terms, '2026-09-06').dueCount, 2);
});

test('wrong then correct retries complete today but preserve first error and tomorrow review', () => {
  const initial = start({ count: 1 });
  const snapshot = JSON.stringify(initial);
  const wrong = answer(initial, 'migration', false);
  assert.equal(JSON.stringify(initial), snapshot, 'input state remains unchanged');
  assert.equal(wrong.terms.migration.nextReviewDay, '2026-09-06');
  assert.equal(getWorkplaceSummary(wrong, terms, '2026-09-05').retryCount, 1);
  const retry = answer(wrong, 'migration', true);
  assert.equal(retry.session.answers.migration.correct, true);
  assert.equal(retry.session.answers.migration.firstCorrect, false);
  assert.equal(retry.session.answers.migration.hadError, true);
  assert.equal(retry.terms.migration.learned, false);
  assert.equal(retry.terms.migration.reviewStage, 0);
  assert.equal(retry.terms.migration.nextReviewDay, '2026-09-06');
  assert.equal(getWorkplaceSummary(retry, terms, '2026-09-05').complete, true);
  assert.equal(getWorkplaceSummary(retry, terms, '2026-09-05').firstCorrectCount, 0);
  assert.deepEqual(answer(retry, 'migration', true), retry, 'completed submissions cannot farm mastery');
  const tomorrow = answer(createDailySession(retry, terms, {}, '2026-09-06'), 'migration', true, '2026-09-06');
  assert.equal(tomorrow.terms.migration.learned, true);
  assert.equal(tomorrow.terms.migration.nextReviewDay, '2026-09-07');
});

test('reading and revealing never teach mastery, even if an assisted answer is correct', () => {
  const reading = markWorkplaceTermSeen(start({ count: 1 }), 'migration', '2026-09-05');
  assert.equal(reading.terms.migration.learned, false);
  assert.equal(reading.terms.migration.totalAttempts, 0);
  assert.equal(reading.terms.migration.nextReviewDay, null);
  assert.equal(getWorkplaceSummary(reading, terms, '2026-09-05').answeredCount, 0);
  assert.equal(markWorkplaceTermSeen(reading, 'migration', '2026-09-05').terms.migration.seenCount, 1);
  const revealed = answer(reading, 'migration', true, '2026-09-05', true);
  assert.equal(revealed.session.answers.migration.correct, false);
  assert.equal(revealed.session.answers.migration.assisted, true);
  const retry = answer(revealed, 'migration', true);
  assert.equal(retry.session.answers.migration.correct, true);
  assert.equal(retry.session.answers.migration.assisted, true);
  assert.equal(retry.terms.migration.learned, false);
  assert.equal(retry.terms.migration.nextReviewDay, '2026-09-06');
});

test('recreating a damaged same-day session cannot erase its first error or farm intervals', () => {
  const wrong = answer(start({ count: 1 }), 'migration', false);
  const restored = createDailySession({ ...wrong, session: null }, terms, { count: 1, termIds: ['migration'] }, '2026-09-05');
  const retry = answer(restored, 'migration', true);
  assert.equal(retry.session.answers.migration.firstCorrect, false);
  assert.equal(retry.session.answers.migration.hadError, true);
  assert.equal(retry.terms.migration.learned, false);
  assert.equal(retry.terms.migration.nextReviewDay, '2026-09-06');
  const correct = answer(start({ count: 1 }), 'migration', true);
  const recreated = createDailySession({ ...correct, session: null }, terms, { count: 1, termIds: ['migration'] }, '2026-09-05');
  const duplicate = answer(recreated, 'migration', true);
  assert.equal(duplicate.terms.migration.reviewStage, 1);
  assert.equal(duplicate.terms.migration.nextReviewDay, '2026-09-06');
});

test('unassisted spaced reviews advance through 1, 3, 7, then 14 local days', () => {
  let state = start({ count: 1 });
  for (const [day, next, stage] of [
    ['2026-09-05', '2026-09-06', 1],
    ['2026-09-06', '2026-09-09', 2],
    ['2026-09-09', '2026-09-16', 3],
    ['2026-09-16', '2026-09-30', 4],
    ['2026-09-30', '2026-10-14', 4],
  ]) {
    state = createDailySession(state, terms, {}, day);
    state = answer(state, 'migration', true, day);
    assert.equal(state.terms.migration.nextReviewDay, next);
    assert.equal(state.terms.migration.reviewStage, stage);
  }
});

test('midnight summaries reset without destroying prior results and reject stale submissions', () => {
  const yesterday = answer(start({ count: 1 }), 'migration', true);
  const today = getWorkplaceSummary(yesterday, terms, '2026-09-06');
  assert.equal(today.isCurrentDay, false);
  assert.equal(today.currentDay, '2026-09-06');
  assert.equal(today.completedCount, 0);
  assert.equal(today.learnedCount, 1);
  assert.equal(today.complete, false);
  assert.deepEqual(answer(yesterday, 'migration', false, '2026-09-06'), yesterday);
});

test('corrupt imported fields, unknown ids, duplicate ids, and unsafe keys recover safely', () => {
  const raw = JSON.parse('{"preferences":{"count":"900","categories":["sales","sales","invalid"],"termIds":["pipeline","unknown"]},"session":{"day":"2026-09-05","termIds":["pipeline","pipeline","unknown","__proto__"],"answers":{"pipeline":{"attempts":2,"correct":true,"firstCorrect":false,"assisted":true},"unknown":{"attempts":1}},"seenTermIds":["unknown","pipeline"]},"terms":{"pipeline":{"seenCount":-9,"learned":true,"reviewStage":999,"nextReviewDay":"2026-02-31","totalAttempts":2,"correctAttempts":100},"__proto__":{"polluted":true},"unknown":{}}}');
  const normalized = normalizeWorkplaceState(raw, terms);
  assert.equal(normalized.preferences.count, 5);
  assert.deepEqual(normalized.preferences.categories, ['sales']);
  assert.deepEqual(normalized.session.termIds, ['pipeline']);
  assert.deepEqual(normalized.session.seenTermIds, ['pipeline']);
  assert.equal(normalized.terms.pipeline.seenCount, 0);
  assert.equal(normalized.terms.pipeline.reviewStage, 4);
  assert.equal(normalized.terms.pipeline.correctAttempts, 2);
  assert.equal(normalized.terms.pipeline.nextReviewDay, null);
  assert.equal(normalized.session.answers.pipeline.hadError, true);
  assert.equal(Object.prototype.polluted, undefined);
  assert.deepEqual(normalizeWorkplaceState(null), createWorkplaceState());
  assert.deepEqual(normalizeWorkplaceState({ session: { day: 'bad', termIds: ['pipeline'] } }).session.termIds, []);
  assert.doesNotThrow(() => createDailySession({ terms: [], session: 4 }, terms, null, '2026-09-05'));
});
