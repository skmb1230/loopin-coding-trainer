import test from 'node:test';
import assert from 'node:assert/strict';
import level0Problems from '../src/data/problems/level0/index.js';
import level1Problems from '../src/data/problems/level1/index.js';
import level2Problems from '../src/data/problems/level2/index.js';
import level3Problems from '../src/data/problems/level3/index.js';
import level4Problems from '../src/data/problems/level4/index.js';
import level5Problems from '../src/data/problems/level5/index.js';
import { normalizeValue, valuesEqual } from '../src/core/runner/value.js';
import { getCodeStorageKey, getDisplayProblemId, getProgressStorageKey } from '../src/core/languages/registry.js';
import { loadProblem, loadProblemsByLevel } from '../src/core/problems/problemLoader.js';

test('runner 비교 로직은 객체 키 순서와 BigInt를 안정적으로 처리한다', () => {
  assert.equal(valuesEqual({ b: 2, a: 1 }, { a: 1, b: 2 }), true);
  assert.deepEqual(normalizeValue([1n, undefined]), ['1n', '__undefined__']);
});

const levels = [level0Problems, level1Problems, level2Problems, level3Problems, level4Problems, level5Problems];
const allProblems = levels.flat();

test('레벨별 800개 문제의 공개·숨김 테스트가 기준 풀이를 통과한다', async () => {
  assert.deepEqual(levels.map((items) => items.length), [200, 220, 180, 120, 60, 20]);
  assert.equal(new Set(allProblems.map((problem) => problem.id)).size, 800);
  for (const problem of allProblems) {
    const solution = new Function(`${problem.referenceSolution}; return solution;`)();
    for (const sample of problem.tests) {
      const actual = await solution(...structuredClone(sample.args));
      assert.equal(valuesEqual(actual, sample.expected), true, `${problem.id} failed`);
    }
  }
});

test('모든 문제는 Java 시작 코드와 독립 저장 키를 제공한다', () => {
  for (const problem of allProblems) {
    assert.equal(problem.supportedLanguages.includes('java'), true, `${problem.id} Java unavailable`);
    assert.match(problem.languageVariants.java.starterCode, /class Solution/);
    assert.match(problem.languageVariants.java.referenceSolution, /public static .* solution\(/);
    assert.equal(problem.languageVariants.java.javaSpec.argTypes.length, problem.tests[0].args.length);
  }
  assert.notEqual(getCodeStorageKey('JS0001', 'javascript'), getCodeStorageKey('JS0001', 'java'));
  assert.notEqual(getProgressStorageKey('JS0001', 'javascript'), getProgressStorageKey('JS0001', 'java'));
  assert.equal(getDisplayProblemId('JS0001', 'java'), 'JAVA0001');
});

test('레벨별 lazy loader가 마지막 문제까지 찾는다', async () => {
  assert.equal((await loadProblemsByLevel(1)).length, 220);
  assert.equal((await loadProblemsByLevel(5)).length, 20);
  assert.equal((await loadProblem('JS5020'))?.title, '비용 8 이하 작업만 배정');
});
