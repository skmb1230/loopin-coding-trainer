import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStudyAllocation, buildStudySessions, getCareerTrackForDate } from '../src/core/curriculum/calculateStudyAllocation.js';
import { adjustDifficulty } from '../src/core/curriculum/adjustDifficulty.js';
import { selectDailyProblems } from '../src/core/curriculum/selectDailyProblems.js';

test('초보자 4시간 학습 배분의 총합은 240분이다', () => {
  const allocation = calculateStudyAllocation(240, 'beginner');
  assert.equal(Object.values(allocation).reduce((sum, value) => sum + value, 0), 240);
  assert.ok(allocation.problems > allocation.theory);
  assert.ok(allocation.theory > allocation.career);
  assert.ok(allocation.career > 0);
  assert.ok(buildStudySessions(allocation, 50).every((session) => session.duration <= 50));
});

test('2시간 미만인 날은 Git·AWS를 생략하고 핵심 학습을 유지한다', () => {
  const allocation = calculateStudyAllocation(60, 'beginner');

  assert.equal(Object.values(allocation).reduce((sum, value) => sum + value, 0), 60);
  assert.equal(allocation.career, 0);
  assert.ok(allocation.review > 0);
});

test('Git과 AWS 보조 트랙은 날짜에 따라 번갈아 배정된다', () => {
  const tracks = [0, 1].map((offset) => getCareerTrackForDate(new Date(2026, 8, 1 + offset)).id);
  const sessions = buildStudySessions({ career: 10 }, 50, new Date(2026, 8, 1));

  assert.deepEqual(new Set(tracks), new Set(['git', 'aws']));
  assert.equal(sessions[0].track, tracks[0]);
});

test('최근 성과가 안정적이면 난이도를 한 단계 올린다', () => {
  const attempts = Array.from({ length: 10 }, () => ({ solved: true, hintsUsed: 0 }));
  assert.equal(adjustDifficulty(attempts, 2), 3);
  assert.equal(adjustDifficulty(attempts, 5), 5);
});

test('낮은 정답률은 난이도를 한 단계만 낮춘다', () => {
  const attempts = Array.from({ length: 10 }, (_, index) => ({ solved: index < 2, hintsUsed: 2 }));
  assert.equal(adjustDifficulty(attempts, 3), 2);
});

test('오늘의 문제는 중복 없이 요청 개수만큼 선택한다', () => {
  const problems = Array.from({ length: 8 }, (_, index) => ({ id: `JS00${index}`, difficulty: index > 5 ? 3 : 1, concepts: ['Array'] }));
  const selected = selectDailyProblems({ problems, count: 7, progress: {}, mastery: { Array: 10 }, difficulty: 1 });
  assert.equal(selected.length, 7);
  assert.equal(new Set(selected.map((problem) => problem.id)).size, 7);
});
