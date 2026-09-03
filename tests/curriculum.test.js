import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStudyAllocation, buildStudySessions, getCareerTrackForDate } from '../src/core/curriculum/calculateStudyAllocation.js';
import { adjustDifficulty } from '../src/core/curriculum/adjustDifficulty.js';
import { selectDailyProblems } from '../src/core/curriculum/selectDailyProblems.js';
import { calculateLevelStats, calculateStudyStreak, deriveCurriculumState, getLanguageProgress } from '../src/core/curriculum/curriculumEngine.js';

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

test('이론 세션 이름은 선택한 학습 언어를 따른다', () => {
  const sessions = buildStudySessions({ theory: 20 }, 50, new Date(2026, 8, 1), 'Java');
  assert.equal(sessions[0].title, '알고리즘 · Java');
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

test('오늘의 핵심 문제는 현재 레벨에서 고르고 다른 레벨은 복습만 섞는다', () => {
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const problems = [
    { id: 'JS0001', level: 0, difficulty: 1, concepts: ['Array'] },
    ...Array.from({ length: 6 }, (_, index) => ({ id: `JS1${String(index + 1).padStart(3, '0')}`, level: 1, difficulty: 2, concepts: ['Map'] })),
  ];
  const selected = selectDailyProblems({ problems, count: 4, targetLevel: 1, progress: { JS0001: { status: 'FAILED', nextReview: yesterday } }, mastery: {}, difficulty: 2 });
  assert.equal(selected.some((problem) => problem.id === 'JS0001'), true);
  assert.equal(selected.filter((problem) => problem.level === 1).length, 3);
});

test('언어별 기록은 분리하고 새 저장 키가 레거시 JavaScript 기록보다 우선한다', () => {
  const progress = {
    JS0001: { status: 'FAILED' },
    'JS0001:javascript': { status: 'SOLVED' },
    'JS0001:java': { status: 'SOLVED_WITH_HINT' },
  };
  assert.equal(getLanguageProgress(progress, 'javascript').JS0001.status, 'SOLVED');
  assert.equal(getLanguageProgress(progress, 'java').JS0001.status, 'SOLVED_WITH_HINT');
});

test('해결 수·독립 풀이 비율·숙련도를 모두 통과해야 다음 레벨로 진급한다', () => {
  const makeProgress = (count, hintsUsed = 0, mastery = 60) => Object.fromEntries(Array.from({ length: count }, (_, index) => [`JS0${String(index + 1).padStart(3, '0')}:javascript`, { status: 'SOLVED', hintsUsed, mastery, lastAttempt: new Date().toISOString() }]));
  assert.equal(deriveCurriculumState({ profile: { startLevel: 0 }, progress: makeProgress(11), languageId: 'javascript' }).currentLevel, 0);
  assert.equal(deriveCurriculumState({ profile: { startLevel: 0 }, progress: makeProgress(12), languageId: 'javascript' }).currentLevel, 1);
  assert.equal(deriveCurriculumState({ profile: { startLevel: 0 }, progress: makeProgress(12, 0, null), languageId: 'javascript' }).currentLevel, 1);
  assert.equal(calculateLevelStats(makeProgress(12, 2), 'javascript')[0].readyForNext, false);
});

test('학습 연속일은 오늘 또는 어제부터 끊기지 않은 날짜만 센다', () => {
  const now = new Date(2026, 8, 3, 12);
  const progress = {
    'JS0001:javascript': { lastAttempt: new Date(2026, 8, 1, 9).toISOString() },
    'JS0002:javascript': { lastAttempt: new Date(2026, 8, 2, 9).toISOString() },
    'JS0003:javascript': { lastAttempt: new Date(2026, 8, 3, 9).toISOString() },
  };
  assert.equal(calculateStudyStreak(progress, 'javascript', now), 3);
});
