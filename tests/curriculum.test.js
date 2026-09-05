import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStudyAllocation, buildStudySessions, getCareerTrackForDate, getSystemsTrackForDate, migrateCompletedStudySessions } from '../src/core/curriculum/calculateStudyAllocation.js';
import { adjustDifficulty } from '../src/core/curriculum/adjustDifficulty.js';
import { selectDailyProblems } from '../src/core/curriculum/selectDailyProblems.js';
import { calculateLevelStats, calculateStudyStreak, deriveCurriculumState, getLanguageProgress, isSolvedOnLocalDay } from '../src/core/curriculum/curriculumEngine.js';

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
  assert.ok(allocation.systems > 0);
  assert.ok(allocation.review > 0);
});

test('Git과 AWS 보조 트랙은 날짜에 따라 번갈아 배정된다', () => {
  const tracks = [0, 1].map((offset) => getCareerTrackForDate(new Date(2026, 8, 1 + offset)).id);
  const sessions = buildStudySessions({ career: 10 }, 50, new Date(2026, 8, 1));

  assert.deepEqual(new Set(tracks), new Set(['git', 'aws']));
  assert.equal(sessions[0].track, tracks[0]);
});

test('SMTP·IMAP과 웹 보안 트랙은 날짜에 따라 번갈아 배정된다', () => {
  const tracks = [0, 1].map((offset) => getSystemsTrackForDate(new Date(2026, 8, 1 + offset)).id);
  const sessions = buildStudySessions({ systems: 20 }, 50, new Date(2026, 8, 1));

  assert.deepEqual(new Set(tracks), new Set(['mail', 'security']));
  assert.equal(sessions[0].track, tracks[0]);
  assert.match(sessions[0].title, /메일|보안/);
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

test('선택하지 않은 언어에는 다른 언어의 온보딩 진단 점수를 적용하지 않는다', () => {
  const profile = { learningLanguage: 'javascript', startLevel: 1 };
  assert.equal(deriveCurriculumState({ profile, languageId: 'javascript' }).currentLevel, 1);
  assert.equal(deriveCurriculumState({ profile, languageId: 'java' }).currentLevel, 0);
  assert.equal(deriveCurriculumState({ profile: { learningLanguage: 'java', startLevel: 1 }, languageId: 'javascript' }).currentLevel, 0);
});

test('프로필 없는 최초 실행에서도 온보딩 전 기본 커리큘럼을 계산한다', () => {
  assert.equal(deriveCurriculumState({ profile: null }).currentLevel, 0);
  assert.equal(deriveCurriculumState({ profile: null, languageId: 'java' }).currentLevel, 0);
});

test('오늘 완료는 유효한 정답 상태이면서 사용자 현지 날짜에 제출한 문제만 센다', () => {
  const now = new Date(2026, 8, 5, 1, 0);
  for (const status of ['SOLVED', 'SOLVED_WITH_HINT', 'MASTERED']) {
    const record = { status, lastAttempt: new Date(2026, 8, 5, 0, 1).toISOString() };
    assert.equal(isSolvedOnLocalDay(record, now), true);
    assert.equal(isSolvedOnLocalDay(record, '2026-09-05'), true);
  }
  assert.equal(isSolvedOnLocalDay({ status: 'SOLVED_WITH_HINT', lastAttempt: new Date(2026, 8, 4, 23, 59).toISOString(), nextReview: now.toISOString() }, now), false);
  assert.equal(isSolvedOnLocalDay({ status: 'FAILED', lastAttempt: now.toISOString() }, now), false);
  assert.equal(isSolvedOnLocalDay({ status: 'SOLVED', lastAttempt: 'invalid' }, now), false);
  assert.equal(isSolvedOnLocalDay({ status: 'SOLVED', lastAttempt: now.toISOString() }, '2026-02-30'), false);
  assert.equal(isSolvedOnLocalDay({ status: 'SOLVED', lastAttempt: now.toISOString() }, 'invalid'), false);
  assert.equal(isSolvedOnLocalDay(undefined, now), false);
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

test('0·음수·비정상 집중 시간에서도 세션을 유한하게 만들고 배분 총합을 유지한다', () => {
  for (const focus of [0, -5, Infinity, NaN, 'invalid']) {
    const sessions = buildStudySessions({ problems: 125, theory: 20 }, focus);
    assert.equal(sessions.reduce((total, session) => total + session.duration, 0), 145);
    assert.ok(sessions.every(session => session.duration > 0 && session.duration <= 50));
  }
  assert.deepEqual(buildStudySessions({ problems: Infinity, theory: -5 }, 50), []);
  assert.equal(Object.values(calculateStudyAllocation(Infinity)).reduce((total, value) => total + value, 0), 0);
  assert.equal(Object.values(calculateStudyAllocation(125, 'beginner', { problems: '55', theory: '20', review: '25' })).reduce((total, value) => total + value, 0), 125);
  assert.equal(Object.values(calculateStudyAllocation(125, 'beginner', { problems: Number.MAX_VALUE, theory: Number.MAX_VALUE })).reduce((total, value) => total + value, 0), 125);
});

test('코딩 세션 수가 바뀌어도 다른 종류의 세션 완료 ID는 움직이지 않는다', () => {
  const short = buildStudySessions({ problems: 50, theory: 20, review: 10 });
  const long = buildStudySessions({ problems: 150, theory: 20, review: 10 });
  assert.equal(short.find(session => session.type === 'theory').id, 'theory-0-20');
  assert.equal(long.find(session => session.type === 'theory').id, 'theory-0-20');
  assert.equal(short.find(session => session.type === 'review').id, long.find(session => session.type === 'review').id);
  assert.deepEqual(migrateCompletedStudySessions(['problems-0', 'theory-3', 'review-4', 'review-999', 'theory-0'], { problems: 150, theory: 20, review: 10 }), ['problems-0-50', 'theory-0-20', 'review-0-10']);
});

test('집중시간이나 마지막 세션 길이가 바뀌면 이전 완료를 새 길이에 적용하지 않는다', () => {
  const shortFocus = buildStudySessions({ problems: 100, theory: 20 }, 25);
  const longFocus = buildStudySessions({ problems: 100, theory: 20 }, 50);
  const completedIds = shortFocus.map(session => session.id);
  assert.ok(longFocus.filter(session => session.type === 'problems').every(session => !completedIds.includes(session.id)));
  assert.ok(completedIds.includes(longFocus.find(session => session.type === 'theory').id));
  const original = buildStudySessions({ problems: 60 }, 50);
  const extended = buildStudySessions({ problems: 70 }, 50);
  assert.equal(original[0].id, extended[0].id);
  assert.equal(original[1].id, 'problems-1-10');
  assert.equal(extended[1].id, 'problems-1-20');
});

test('이전 v2 완료 ID도 저장 당시 길이로 이관하고 모르는 번호와 길이는 버린다', () => {
  const allocation = { problems: 75, theory: 20, review: 10 };
  const date = new Date(2026, 8, 5);
  const migrated = migrateCompletedStudySessions(['problems-0', 'problems-1', 'theory-0', 'theory-3', 'review-0', 'unknown-0'], allocation, 25, date, 'JavaScript', 2);
  assert.deepEqual(migrated, ['problems-0-25', 'problems-1-25', 'theory-0-20', 'review-0-10']);
  assert.equal(buildStudySessions(allocation, 50, date).some(session => session.type === 'problems' && session.duration === 50 && migrated.includes(session.id)), false);
  assert.deepEqual(migrateCompletedStudySessions(['problems-0-25', 'problems-0-50', 'unknown-0-25'], allocation, 25, date, 'JavaScript', 3), ['problems-0-25']);
  assert.deepEqual(migrateCompletedStudySessions(['problems-0'], allocation, 25, date, 'JavaScript', 99), []);
});

test('현재 레벨 문제가 모자라도 잠긴 다른 레벨의 새 문제를 섞지 않는다', () => {
  const problems = [
    { id: 'JS0001', level: 0, difficulty: 1, concepts: ['Array'] },
    { id: 'JS5001', level: 5, difficulty: 5, concepts: ['Graph'] },
  ];
  const selected = selectDailyProblems({ problems, targetLevel: 0, count: 7 });
  assert.deepEqual(selected.map(problem => problem.id), ['JS0001']);
  assert.deepEqual(selectDailyProblems({ problems, targetLevel: 0, count: -2 }), []);
});

test('복습일을 기다리는 중이라도 현재 레벨의 막힌 문제를 새 문제보다 먼저 이어간다', () => {
  const problems = [
    { id: 'JS0001', level: 0, difficulty: 1, concepts: ['Array'] },
    { id: 'JS0002', level: 0, difficulty: 1, concepts: ['Array'] },
    { id: 'JS0003', level: 0, difficulty: 1, concepts: ['Array'] },
  ];
  for (const status of ['TRYING', 'FAILED', 'REVIEW']) {
    const selected = selectDailyProblems({ problems, targetLevel: 0, count: 1, progress: { JS0003: { status, nextReview: '2026-09-07T03:00:00Z' } }, now: new Date('2026-09-05T03:00:00Z') });
    assert.equal(selected[0].id, 'JS0003');
  }
});

test('저장된 학습 날짜 이력은 같은 문제를 반복한 날의 연속 기록도 유지한다', () => {
  const progress = { 'JS0001:javascript': { lastAttempt: new Date(2026, 8, 6, 12).toISOString(), studyDays: ['2026-09-04', '2026-09-05', '2026-09-06', 'invalid'] } };
  assert.equal(calculateStudyStreak(progress, 'javascript', new Date(2026, 8, 6, 13)), 3);
  assert.equal(calculateStudyStreak(progress, 'java', new Date(2026, 8, 6, 13)), 0);
  assert.equal(deriveCurriculumState({ profile: { startLevel: 1.5 }, progress: null }).currentLevel, 1);
});
