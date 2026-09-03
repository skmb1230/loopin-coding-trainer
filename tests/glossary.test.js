import test from 'node:test';
import assert from 'node:assert/strict';
import { findGlossaryParts } from '../src/core/glossary/findGlossaryParts.js';
import { glossaryEntries } from '../src/data/glossary.js';

test('문장 속 용어를 설명 가능한 조각으로 분리한다', () => {
  const parts = findGlossaryParts('이벤트 루프는 Promise 콜백을 처리한다.', glossaryEntries);
  const terms = parts.filter((part) => part.type === 'term');

  assert.deepEqual(terms.map((part) => part.entry.id), ['event-loop', 'promise', 'callback']);
});

test('긴 용어가 짧은 용어보다 먼저 매칭된다', () => {
  const [part] = findGlossaryParts('렌더링 파이프라인', glossaryEntries);

  assert.equal(part.type, 'term');
  assert.equal(part.entry.id, 'rendering-pipeline');
});

test('영문 용어는 다른 식별자의 일부와 잘못 매칭되지 않는다', () => {
  const parts = findGlossaryParts('setTimeout에서 Set을 사용한다.', glossaryEntries);
  const terms = parts.filter((part) => part.type === 'term');

  assert.deepEqual(terms.map((part) => part.entry.id), ['set-timeout', 'set']);
});

test('서로 헷갈리는 소프트웨어 변경 용어를 각각 설명한다', () => {
  const parts = findGlossaryParts('컨버팅, Porting, Migration은 바꾸거나 옮기는 범위가 다르다.', glossaryEntries);
  const terms = parts.filter((part) => part.type === 'term');

  assert.deepEqual(terms.map((part) => part.entry.id), ['converting', 'porting', 'migration']);
});
