import test from 'node:test';
import assert from 'node:assert/strict';
import { getDiagnosticQuestions, diagnosticStartLevel, ONBOARDING_DIAGNOSTIC_VERSION } from '../src/data/onboardingDiagnostics.js';
import { getDiagnosticReport } from '../src/core/onboarding/diagnosticReport.js';

const correctAnswers = (languageId = 'javascript') => getDiagnosticQuestions(languageId).map((question) => question.answer);

test('기존 JavaScript·Java 진단은 8문항의 순서·보기·정답을 버전1로 보존한다', () => {
  const javascript = getDiagnosticQuestions('javascript');
  const java = getDiagnosticQuestions('java');
  assert.equal(ONBOARDING_DIAGNOSTIC_VERSION, 1);
  assert.deepEqual(javascript.map((question) => question.answer), [0, 0, 0, 1, 0, 1, 0, 2]);
  assert.deepEqual(java.map((question) => question.answer), [0, 0, 0, 1, 0, 0, 0, 2]);
  assert.equal(javascript[1].question, '[1, 2, 3].map(x => x * 2)의 결과는?');
  assert.equal(java[1].question, 'int[] numbers = {1, 2, 3}; 배열 길이를 읽는 표현은?');
  assert.equal(javascript[5].options[1], 'Stack');
  assert.equal(java[5].options[0], 'Deque');
  for (const questions of [javascript, java]) {
    assert.equal(questions.length, 8);
    assert.ok(questions.every((question) => question.options.length === 3 && question.explanation.length > 20));
    assert.ok(Object.isFrozen(questions));
    assert.ok(questions.every((question) => Object.isFrozen(question) && Object.isFrozen(question.options)));
  }
  assert.equal(diagnosticStartLevel(6), 0);
  assert.equal(diagnosticStartLevel(7), 1);
  assert.equal(diagnosticStartLevel(8), 1);
});

test('원래 진단 언어의 선택·정답·해설로 문항 결과를 만들고 답변만 있으면 점수를 계산한다', () => {
  const report = getDiagnosticReport({ learningLanguage: 'java', diagnosticVersion: 1, diagnosticTaken: true, diagnosticAnswers: correctAnswers('java') });
  assert.equal(report.languageId, 'java');
  assert.equal(report.languageLabel, 'Java');
  assert.equal(report.version, 1);
  assert.equal(report.taken, true);
  assert.equal(report.score, 8);
  assert.equal(report.scoreSource, 'answers');
  assert.equal(report.answeredCount, 8);
  assert.equal(report.total, 8);
  assert.equal(report.rows[1].selectedAnswer, 'numbers.length');
  assert.equal(report.rows[5].correctAnswer, 'Deque');
  assert.ok(report.rows.every((row, index) => row.number === index + 1 && row.isCorrect === true));
  assert.match(report.rows[1].explanation, /length 필드/);
});

test('유효한 저장 점수는 답변 재계산보다 우선하고 서로 다르면 알려준다', () => {
  const report = getDiagnosticReport({ learningLanguage: 'javascript', diagnosticTaken: true, diagnosticScore: 3, diagnosticAnswers: correctAnswers() });
  assert.equal(report.score, 3);
  assert.equal(report.scoreSource, 'saved');
  assert.equal(report.scoreMismatch, true);
  assert.equal(report.rows.filter((row) => row.isCorrect).length, 8);
  assert.match(report.notice, /저장된 점수.*다릅니다/);
});

test('명시적 미응시는 잘못 남아 있는 점수나 답변을 결과로 표시하지 않는다', () => {
  const report = getDiagnosticReport({ learningLanguage: 'javascript', diagnosticTaken: false, diagnosticScore: 0, diagnosticAnswers: correctAnswers() });
  assert.equal(report.taken, false);
  assert.equal(report.score, null);
  assert.equal(report.scoreSource, null);
  assert.equal(report.answeredCount, 0);
  assert.deepEqual(report.rows, []);
  assert.match(report.notice, /미응시는 0점과 다르/);
});

test('실제 0점 응시는 미응시와 구별하고 응시 여부 없는 구버전 0점은 단정하지 않는다', () => {
  const wrong = getDiagnosticQuestions('javascript').map((question) => (question.answer + 1) % question.options.length);
  const attempted = getDiagnosticReport({ learningLanguage: 'javascript', diagnosticTaken: true, diagnosticScore: 0, diagnosticAnswers: wrong });
  assert.equal(attempted.taken, true);
  assert.equal(attempted.score, 0);
  assert.equal(attempted.scoreSource, 'saved');
  assert.equal(attempted.scoreMismatch, false);
  assert.ok(attempted.rows.every((row) => row.isCorrect === false));
  const inferred = getDiagnosticReport({ learningLanguage: 'javascript', diagnosticAnswers: wrong });
  assert.equal(inferred.taken, true);
  assert.equal(inferred.score, 0);
  const legacy = getDiagnosticReport({ diagnosticScore: 0 });
  assert.equal(legacy.taken, null);
  assert.equal(legacy.score, 0);
  assert.match(legacy.notice, /실제 응시 결과인지 확인할 수 없/);
});

test('점수만 남은 구버전은 언어·버전 기본 기준을 알리고 내 답변은 미기록으로 남긴다', () => {
  const report = getDiagnosticReport({ diagnosticScore: 5 });
  assert.equal(report.languageId, 'javascript');
  assert.equal(report.version, 1);
  assert.equal(report.taken, true);
  assert.equal(report.score, 5);
  assert.equal(report.scoreSource, 'saved');
  assert.equal(report.answeredCount, 0);
  assert.equal(report.rows.length, 8);
  assert.ok(report.rows.every((row) => row.selectedIndex === null && row.selectedAnswer === null && row.isCorrect === null));
  assert.match(report.notice, /언어 기록.*JavaScript/);
  assert.match(report.notice, /버전 1/);
  assert.match(report.notice, /미기록은 오답으로 처리하지 않/);
});

test('null·문자열·음수·범위 밖 답변은 오답이 아니라 미기록이고 부분 답변으로 총점을 만들지 않는다', () => {
  const answers = [0, null, '0', -1, 3, 99, undefined, 1.5];
  const report = getDiagnosticReport({ learningLanguage: 'javascript', diagnosticTaken: true, diagnosticAnswers: answers });
  assert.equal(report.answeredCount, 1);
  assert.equal(report.score, null);
  assert.equal(report.scoreSource, null);
  assert.equal(report.rows[0].isCorrect, true);
  assert.ok(report.rows.slice(1).every((row) => row.selectedIndex === null && row.selectedAnswer === null && row.isCorrect === null));
  const extra = getDiagnosticReport({ learningLanguage: 'javascript', diagnosticTaken: true, diagnosticAnswers: [...correctAnswers(), 0] });
  assert.equal(extra.answeredCount, 8);
  assert.equal(extra.score, null);
  assert.equal(extra.scoreMismatch, false);
});

test('지원하지 않는 언어나 버전은 현재 문항에 임의로 맞추지 않는다', () => {
  for (const incompatible of [{ learningLanguage: 'python', diagnosticVersion: 1 }, { learningLanguage: 'java', diagnosticVersion: 2 }, { learningLanguage: 'java', diagnosticVersion: '1' }, { learningLanguage: 'java', diagnosticVersion: null }]) {
    const report = getDiagnosticReport({ ...incompatible, diagnosticTaken: true, diagnosticScore: 6, diagnosticAnswers: correctAnswers() });
    assert.deepEqual(report.rows, []);
    assert.equal(report.answeredCount, 0);
    assert.equal(report.score, 6);
    assert.equal(report.scoreSource, 'saved');
    assert.equal(report.scoreMismatch, false);
    assert.match(report.notice, /지원하지 않아 문항별 결과를 대조하지 않/);
  }
  assert.deepEqual(getDiagnosticQuestions('python'), []);
  assert.deepEqual(getDiagnosticQuestions('javascript', 2), []);
});

test('누락·비정상 프로필은 깨지지 않고 원본 프로필과 공유 문항을 변경하지 않는다', () => {
  for (const profile of [null, undefined, [], 'invalid', 0]) {
    const report = getDiagnosticReport(profile);
    assert.equal(report.taken, null);
    assert.equal(report.score, null);
    assert.deepEqual(report.rows, []);
    assert.match(report.notice, /저장된 진단 결과가 없/);
  }
  const profile = Object.freeze({ learningLanguage: 'java', diagnosticTaken: true, diagnosticVersion: 1, diagnosticAnswers: Object.freeze(correctAnswers('java')) });
  const before = JSON.stringify(profile);
  const report = getDiagnosticReport(profile);
  report.rows[0].options[0] = 'changed by UI';
  assert.equal(getDiagnosticQuestions('java')[0].options[0], 'ell');
  assert.equal(JSON.stringify(profile), before);
  assert.equal(Object.hasOwn(profile, 'diagnosticScore'), false);
  assert.equal(Object.hasOwn(profile, 'diagnosticCompletedAt'), false);
});
