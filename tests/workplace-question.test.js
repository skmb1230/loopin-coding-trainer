import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkplaceQuestion } from '../src/core/workplace/question.js';

const term = {
  id: 'work-migration',
  term: '마이그레이션',
  questions: [
    { prompt: '기존 서비스의 데이터를 새 시스템으로 옮기는 작업을 무엇이라고 하나요?', options: ['포팅', '컨버팅', '마이그레이션', '리팩터링'], answerIndex: 2, explanation: '기존 시스템의 데이터와 기능을 새 환경으로 옮기는 마이그레이션 상황입니다.' },
    { prompt: '기존 회원 기록을 새 데이터베이스 구조로 이전하는 프로젝트의 이름은?', options: ['마이그레이션', '캐시', 'API', '브라우저'], answerIndex: 0, explanation: '기존 데이터를 새 환경에 맞게 이전하는 작업은 마이그레이션입니다.' },
  ],
};

test('상황 퀴즈는 중복 없는 네 용어와 정확히 하나의 정답을 반환한다', () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const question = createWorkplaceQuestion(term, '2026-09-05', attempt);
    assert.equal(question.choices.length, 4);
    assert.equal(new Set(question.choices.map(choice => choice.label)).size, 4);
    assert.deepEqual(question.choices.filter(choice => choice.correct).map(choice => choice.label), [term.term]);
    assert.ok(term.questions.some(original => original.prompt === question.prompt && original.explanation === question.explanation));
  }
});

test('재로딩해도 같은 날짜·시도는 같은 상황과 보기 순서를 복원하고 원본을 변경하지 않는다', () => {
  const snapshot = JSON.stringify(term);
  const expected = createWorkplaceQuestion(term, '2026-09-05', 3);
  const restored = createWorkplaceQuestion(JSON.parse(snapshot), '2026-09-05', 3);
  assert.deepEqual(restored, expected);
  assert.equal(JSON.stringify(term), snapshot);
  expected.choices.reverse();
  assert.deepEqual(createWorkplaceQuestion(term, '2026-09-05', 3), restored);
});

test('연속 시도는 다른 상황으로 순환하며 동일 상황의 정답 위치도 다시 섞인다', () => {
  const questions = Array.from({ length: 48 }, (_, attempt) => createWorkplaceQuestion(term, '2026-09-05', attempt));
  for (let index = 1; index < questions.length; index += 1) assert.notEqual(questions[index - 1].prompt, questions[index].prompt);
  for (const source of term.questions) {
    const positions = new Set(questions.filter(question => question.prompt === source.prompt).map(question => question.choices.findIndex(choice => choice.correct)));
    assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
  }
});

test('여러 날짜에서 정답 위치가 고르게 분산되고 상황과 특정 위치가 결합되지 않는다', () => {
  const positions = [0, 0, 0, 0];
  const bySituation = new Map(term.questions.map(question => [question.prompt, new Set()]));
  for (let index = 0; index < 120; index += 1) {
    const date = new Date(2026, 0, 1 + index, 12);
    const question = createWorkplaceQuestion(term, date, 0);
    const position = question.choices.findIndex(choice => choice.correct);
    positions[position] += 1;
    bySituation.get(question.prompt).add(position);
  }
  assert.ok(positions.every(count => count >= 15 && count <= 45), `Unexpected distribution: ${positions.join(', ')}`);
  for (const observed of bySituation.values()) assert.deepEqual([...observed].sort(), [0, 1, 2, 3]);
});

test('잘못된 시도 횟수는 첫 시도로 정규화하고 유효하지 않은 문제 계약은 거부한다', () => {
  const first = createWorkplaceQuestion(term, '2026-09-05', 0);
  for (const attempts of [undefined, NaN, Infinity, -1, 'invalid']) assert.deepEqual(createWorkplaceQuestion(term, '2026-09-05', attempts), first);
  assert.deepEqual(createWorkplaceQuestion(term, '2026-09-05', 1.9), createWorkplaceQuestion(term, '2026-09-05', 1));
  const malformed = change => ({ ...term, questions: term.questions.map(question => ({ ...question, ...change })) });
  assert.throws(() => createWorkplaceQuestion(malformed({ options: ['마이그레이션', '포팅', '포팅', 'API'] }), '2026-09-05'), /four distinct/);
  assert.throws(() => createWorkplaceQuestion(malformed({ options: ['마이그레이션', '포팅', 'API'] }), '2026-09-05'), /four distinct/);
  assert.throws(() => createWorkplaceQuestion(malformed({ answerIndex: 9 }), '2026-09-05'), /correct workplace choice/);
  assert.throws(() => createWorkplaceQuestion({ ...term, term: '없는 정답' }, '2026-09-05'), /correct workplace choice/);
  assert.throws(() => createWorkplaceQuestion(malformed({ prompt: '' }), '2026-09-05'), /prompt and an explanation/);
  assert.throws(() => createWorkplaceQuestion({ ...term, questions: [] }, '2026-09-05'), /at least one/);
  assert.throws(() => createWorkplaceQuestion(term, '2026-02-30'), TypeError);
});
