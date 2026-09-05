import test from 'node:test';
import assert from 'node:assert/strict';
import { workplaceTerms, workplaceCategories, workplaceSources } from '../src/data/workplaceTerms.js';
import { workplaceGlossaryEntries as glossaryEntries } from '../src/data/workplaceGlossary.js';
import { findGlossaryParts } from '../src/core/glossary/findGlossaryParts.js';

test('회의 학습은 5개 분야의 고유 용어 62개와 용어 이름을 고르는 상황 문제 124개를 제공한다', () => {
  assert.equal(workplaceCategories.length, 5);
  assert.equal(workplaceTerms.length, 62);
  assert.equal(new Set(workplaceTerms.map((term) => term.id)).size, 62);
  const termNames = new Set(workplaceTerms.map((term) => term.term));
  assert.equal(termNames.size, 62);
  for (const category of workplaceCategories) assert.equal(workplaceTerms.filter((term) => term.category === category.id).length, category.id === 'workplace' ? 14 : 12, category.id);
  const prompts = new Set();
  const answerPositions = new Set();
  for (const term of workplaceTerms) {
    for (const field of ['term', 'english', 'meaning', 'situation', 'interpretation', 'exampleReply', 'distinction']) assert.ok(typeof term[field] === 'string' && term[field].trim().length > 0, `${term.id}.${field}`);
    assert.equal(term.questions.length, 2, term.id);
    for (const question of term.questions) {
      assert.equal(question.options.length, 4, term.id);
      assert.equal(new Set(question.options).size, 4, term.id);
      assert.ok(Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex < 4, term.id);
      assert.equal(question.options[question.answerIndex], term.term, `${term.id}: 정답은 학습한 용어명이어야 합니다`);
      for (const option of question.options) {
        assert.ok(termNames.has(option), `${term.id}: 설명이나 행동 대신 등록된 용어 이름을 보기로 써야 합니다: ${option}`);
      }
      const normalizedPrompt = question.prompt.replace(/\s/g, '').toLocaleLowerCase();
      const normalizedTerm = term.term.replace(/\s/g, '').toLocaleLowerCase();
      assert.ok(!normalizedPrompt.includes(normalizedTerm), `${term.id}: 질문에 정답 용어를 노출하지 않습니다`);
      assert.ok(!(question.options.includes('컨펌') && question.options.includes('결재')), `${term.id}: 확인·승인의 문맥이 겹치는 보기는 함께 넣지 않습니다`);
      answerPositions.add(question.answerIndex);
      assert.ok(question.explanation.trim().length >= 10, term.id);
      assert.ok(!prompts.has(question.prompt), `duplicate question: ${question.prompt}`);
      prompts.add(question.prompt);
    }
  }
  assert.equal(prompts.size, 124);
  assert.equal(answerPositions.size, 4);
  assert.ok(workplaceSources.length >= 4);
  for (const source of workplaceSources) assert.equal(new URL(source.url).protocol, 'https:');
});

test('요청한 비공식 표현은 검색 별칭과 돋보기 설명으로 연결된다', () => {
  for (const query of ['카니발매출', '마이그레이션', '포팅', '피저빌리티', '컨펌', '결재']) {
    assert.ok(workplaceTerms.some((term) => [term.term, ...term.aliases].includes(query)), query);
    const parts = findGlossaryParts(query, glossaryEntries);
    assert.equal(parts[0].type, 'term', query);
    assert.ok(parts[0].entry.definition.length > 15, query);
  }
});

test('상사의 내용 확인과 정식 안건 승인은 문맥과 혼동 설명을 구분한다', () => {
  const confirm = workplaceTerms.find((term) => term.id === 'work-confirm');
  const approval = workplaceTerms.find((term) => term.id === 'work-approval');
  assert.equal(confirm.term, '컨펌');
  assert.equal(approval.term, '결재');
  assert.match(confirm.distinction, /결재.*같은 절차는 아닙니다/);
  assert.match(approval.distinction, /결제/);
  assert.ok(approval.questions.every((question) => /권한|상사/.test(question.prompt)));
});
