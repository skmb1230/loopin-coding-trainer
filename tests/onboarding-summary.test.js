import test from 'node:test';
import assert from 'node:assert/strict';
import { getOnboardingSummary } from '../src/features/profile/onboardingSummary.js';

const report = (patch = {}) => ({ taken: true, score: 4, rows: [], total: 8, ...patch });

test('처음 출발점과 주간 시간은 현재 진도가 아니라 저장된 온보딩 정보로 계산한다', () => {
  const initial = getOnboardingSummary({ startLevel: 0, frontendYears: '6~7년', dailyMinutes: 240, daysPerWeek: 5 }, report({ rows: [{ area: '배열', isCorrect: true }, { area: '문자열', isCorrect: false }] }));
  assert.equal(initial.algorithmTrack, '레벨 0 · 핵심 트랙');
  assert.equal(initial.theoryDepth, '실무 심화');
  assert.equal(initial.weeklyMinutes, 1200);
  assert.deepEqual(initial.strengths, ['배열']);
  assert.deepEqual(initial.firstFocus, ['문자열']);
  assert.equal(Object.values(initial.allocation).reduce((sum, value) => sum + value, 0), 240);
});

test('점수만 있고 답변이 없으면 약점을 만들지 않고 미응시와 모두 정답을 구분한다', () => {
  assert.deepEqual(getOnboardingSummary({ startLevel: 0 }, report()).firstFocus, []);
  assert.deepEqual(getOnboardingSummary({ startLevel: 0 }, report({ taken: false })).firstFocus, ['배열', '문자열', '반복문']);
  assert.deepEqual(getOnboardingSummary({ startLevel: 1 }, report({ score: 8, rows: Array.from({length: 8}, (_, index) => ({ area: `영역 ${index}`, isCorrect: true })) })).firstFocus, ['Map/Set', '구현 심화']);
  const empty = getOnboardingSummary(null, report({ score: null, taken: null }));
  assert.equal(empty.algorithmTrack, '시작 레벨 미기록');
  assert.equal(empty.theoryDepth, '경력 정보 미기록');
  assert.equal(empty.weeklyMinutes, null);
  assert.equal(empty.allocation, null);
});
