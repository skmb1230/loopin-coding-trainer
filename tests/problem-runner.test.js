import test from 'node:test';
import assert from 'node:assert/strict';
import level0Problems from '../src/data/problems/level0/index.js';
import { normalizeValue, valuesEqual } from '../src/core/runner/value.js';
import { getCodeStorageKey, getDisplayProblemId, getProgressStorageKey } from '../src/core/languages/registry.js';

test('runner 비교 로직은 객체 키 순서와 BigInt를 안정적으로 처리한다', () => {
  assert.equal(valuesEqual({ b: 2, a: 1 }, { a: 1, b: 2 }), true);
  assert.deepEqual(normalizeValue([1n, undefined]), ['1n', '__undefined__']);
});

test('30개 샘플 문제의 공개·숨김 테스트가 기준 풀이를 통과한다', async () => {
  assert.equal(level0Problems.length, 30);
  for (const problem of level0Problems) {
    const solution = new Function(`${problem.referenceSolution}; return solution;`)();
    for (const sample of problem.tests) {
      const actual = await solution(...structuredClone(sample.args));
      assert.equal(valuesEqual(actual, sample.expected), true, `${problem.id} failed`);
    }
  }
});

test('모든 Level 0 문제는 Java 시작 코드와 독립 저장 키를 제공한다', () => {
  for (const problem of level0Problems) {
    assert.equal(problem.supportedLanguages.includes('java'), true, `${problem.id} Java unavailable`);
    assert.match(problem.languageVariants.java.starterCode, /class Solution/);
    assert.match(problem.languageVariants.java.referenceSolution, /public static .* solution\(/);
    assert.equal(problem.languageVariants.java.javaSpec.argTypes.length, problem.tests[0].args.length);
  }
  assert.notEqual(getCodeStorageKey('JS0001', 'javascript'), getCodeStorageKey('JS0001', 'java'));
  assert.notEqual(getProgressStorageKey('JS0001', 'javascript'), getProgressStorageKey('JS0001', 'java'));
  assert.equal(getDisplayProblemId('JS0001', 'java'), 'JAVA0001');
});
