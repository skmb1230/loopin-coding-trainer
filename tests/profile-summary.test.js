import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProfileMinutes, getProfileSummary } from '../src/features/profile/profileSummary.js';

test('내 정보는 시작 당시 기본 시간과 현재 설정·오늘 가능 시간을 구분한다', () => {
  const summary = getProfileSummary({
    profile: { careerYears: '6~7년', frontendYears: '4~5년', codingTestLevel: '처음', goal: '이직 준비', targetWeeks: 12, daysPerWeek: 5, dailyMinutes: 240, focusMinutes: 50, learningLanguage: 'javascript', diagnosticTaken: true, diagnosticScore: 7, startLevel: 1 },
    settings: { learningLanguage: 'java', focusMinutes: 25 }, todayMinutes: 120,
  });
  assert.equal(summary.initial.dailyTime, '4시간');
  assert.equal(summary.current.todayTime, '2시간');
  assert.equal(summary.initial.focusTime, '50분');
  assert.equal(summary.current.focusTime, '25분');
  assert.equal(summary.current.language, 'Java');
  assert.equal(summary.diagnostic.language, 'JavaScript');
  assert.equal(summary.diagnostic.startLevel, 'Level 1');
  assert.equal(summary.diagnostic.score, '7 / 8');
  assert.equal(summary.initial.careerYears, '6~7년');
  assert.equal(summary.initial.daysPerWeek, '주 5일');
});

test('전체 진도에서 두 언어를 분리하고 회의 용어와 중복 레거시 기록을 합산하지 않는다', () => {
  const now = new Date(2026, 8, 5, 12);
  const summary = getProfileSummary({ profile: { learningLanguage: 'javascript', startLevel: 1 }, settings: { learningLanguage: 'java' }, now, progress: {
    JS0001: { status: 'SOLVED', lastAttempt: new Date(2026, 8, 5, 10).toISOString() },
    'JS0001:javascript': { status: 'SOLVED_WITH_HINT', studyDays: ['2026-09-04', '2026-09-05'] },
    'JS0002:java': { status: 'SOLVED', lastAttempt: new Date(2026, 8, 5, 11).toISOString() },
    'word-cannibalization': { status: 'SOLVED', studyDays: ['2026-09-03', '2026-09-04', '2026-09-05'] },
  } });
  const [javascript, java] = summary.tracks;
  assert.equal(javascript.solved, 1);
  assert.equal(java.solved, 1);
  assert.equal(javascript.currentLevel, 1);
  assert.equal(java.currentLevel, 0);
  assert.equal(javascript.streak, 2);
  assert.equal(java.streak, 1);
  assert.equal(java.selected, true);
  assert.equal(javascript.total, 800);
});

test('진단 미응시·실제 0점·응시 정보 없는 옛 기록은 서로 다르게 표시한다', () => {
  assert.equal(getProfileSummary({ profile: { diagnosticTaken: false, diagnosticScore: 0 } }).diagnostic.score, '미응시');
  assert.equal(getProfileSummary({ profile: { diagnosticTaken: true, diagnosticScore: 0 } }).diagnostic.score, '0 / 8');
  assert.equal(getProfileSummary({ profile: { diagnosticScore: 0 } }).diagnostic.status, '응시 여부 미기록');
  assert.equal(getProfileSummary({ profile: { diagnosticScore: 5 } }).diagnostic.status, '응시함');
});

test('누락·비정상 정보는 추정 개인정보 없이 미설정으로 표시한다', () => {
  const empty = getProfileSummary({ profile: null, settings: [], progress: null });
  assert.equal(empty.hasProfile, false);
  assert.equal(empty.initial.goal, '미설정');
  assert.equal(empty.current.language, '미설정');
  assert.equal(empty.current.todayTime, '미설정');
  assert.equal(empty.diagnostic.startLevel, '미기록');
  assert.equal(empty.tracks[0].solved, 0);
  assert.equal(Object.hasOwn(empty, 'name'), false);
  assert.equal(Object.hasOwn(empty, 'joinedAt'), false);
  const broken = getProfileSummary({ profile: { careerYears: {}, dailyMinutes: -5, targetWeeks: Infinity, daysPerWeek: 99, learningLanguage: '__proto__', diagnosticTaken: true, diagnosticScore: 12, startLevel: -1 }, settings: { learningLanguage: 'python', focusMinutes: NaN }, progress: { JS0001: null } });
  assert.equal(broken.initial.careerYears, '미설정');
  assert.equal(broken.initial.dailyTime, '미설정');
  assert.equal(broken.initial.daysPerWeek, '미설정');
  assert.equal(broken.diagnostic.score, '점수 미기록');
  assert.equal(broken.current.focusTime, '미설정');
  assert.equal(broken.diagnostic.language, '미설정');
  assert.equal(formatProfileMinutes(90), '1시간 30분');
});
