import test from 'node:test';
import assert from 'node:assert/strict';
import { workplaceTerms, workplaceCategories, workplaceSources } from '../src/data/workplaceTerms.js';
import { glossaryEntries } from '../src/data/glossary.js';
import { findGlossaryParts } from '../src/core/glossary/findGlossaryParts.js';

test('회의 학습은 5개 분야의 고유 용어 60개와 서로 다른 상황 문제 120개를 제공한다', () => {
  assert.equal(workplaceCategories.length, 5);
  assert.equal(workplaceTerms.length, 60);
  assert.equal(new Set(workplaceTerms.map((term) => term.id)).size, 60);
  for (const category of workplaceCategories) assert.equal(workplaceTerms.filter((term) => term.category === category.id).length, 12, category.id);
  const prompts = new Set();
  for (const term of workplaceTerms) {
    for (const field of ['term', 'english', 'meaning', 'situation', 'interpretation', 'exampleReply', 'distinction']) assert.ok(typeof term[field] === 'string' && term[field].trim().length > 0, `${term.id}.${field}`);
    assert.equal(term.questions.length, 2, term.id);
    for (const question of term.questions) {
      assert.equal(question.options.length, 4, term.id);
      assert.equal(new Set(question.options).size, 4, term.id);
      assert.ok(Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex < 4, term.id);
      assert.ok(question.explanation.trim().length >= 10, term.id);
      assert.ok(!prompts.has(question.prompt), `duplicate question: ${question.prompt}`);
      prompts.add(question.prompt);
    }
  }
  assert.equal(prompts.size, 120);
  assert.ok(workplaceSources.length >= 4);
  for (const source of workplaceSources) assert.equal(new URL(source.url).protocol, 'https:');
});

test('요청한 비공식 표현은 검색 별칭과 돋보기 설명으로 연결된다', () => {
  for (const query of ['카니발매출', '마이그레이션', '포팅', '피저빌리티']) {
    assert.ok(workplaceTerms.some((term) => [term.term, ...term.aliases].includes(query)), query);
    const parts = findGlossaryParts(query, glossaryEntries);
    assert.equal(parts[0].type, 'term', query);
    assert.ok(parts[0].entry.definition.length > 15, query);
  }
});
