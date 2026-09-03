import level0Problems from '../src/data/problems/level0/index.js';
import level1Problems from '../src/data/problems/level1/index.js';
import level2Problems from '../src/data/problems/level2/index.js';
import level3Problems from '../src/data/problems/level3/index.js';
import level4Problems from '../src/data/problems/level4/index.js';
import level5Problems from '../src/data/problems/level5/index.js';
import { valuesEqual } from '../src/core/runner/value.js';

const required = ['id', 'title', 'level', 'difficulty', 'category', 'description', 'constraints', 'examples', 'starterCode', 'estimatedMinutes', 'concepts', 'hints', 'commonMistakes', 'reviewQuestions', 'testGenerator', 'solutionExplanation', 'referenceSolution'];
const levels = [level0Problems, level1Problems, level2Problems, level3Problems, level4Problems, level5Problems];
const expectedCounts = [200, 220, 180, 120, 60, 20];
const problems = levels.flat();
const errors = [];
const ids = new Set();
const matchesJavaType = (value, type) => {
  if (value === null) return type === 'Integer' || type === 'Object';
  if (type === 'int' || type === 'Integer') return Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'String') return typeof value === 'string';
  if (type === 'int[]') return Array.isArray(value) && value.every((item) => matchesJavaType(item, 'int'));
  if (type === 'int[][]') return Array.isArray(value) && value.every((item) => matchesJavaType(item, 'int[]'));
  if (type === 'String[]') return Array.isArray(value) && value.every((item) => matchesJavaType(item, 'String'));
  if (type === 'Object[]') return Array.isArray(value) && value.every((item) => ['string', 'number', 'boolean'].includes(typeof item));
  return false;
};

levels.forEach((levelProblems, level) => {
  if (levelProblems.length !== expectedCounts[level]) errors.push(`Level ${level}: ${expectedCounts[level]}개가 아니라 ${levelProblems.length}개 등록됨`);
});

for (const problem of problems) {
  if (ids.has(problem.id)) errors.push(`${problem.id}: 중복 ID`);
  ids.add(problem.id);
  for (const field of required) if (problem[field] === undefined || problem[field] === null) errors.push(`${problem.id}: ${field} 필드 없음`);
  if (!/^JS\d{4}$/.test(problem.id)) errors.push(`${problem.id}: ID 형식 오류`);
  if (!Number.isInteger(problem.level) || problem.level < 0 || problem.level > 5) errors.push(`${problem.id}: level 범위 오류`);
  if (Number(problem.id[2]) !== problem.level) errors.push(`${problem.id}: ID와 level 불일치`);
  if (!Number.isInteger(problem.difficulty) || problem.difficulty < 1 || problem.difficulty > 5) errors.push(`${problem.id}: difficulty 범위 오류`);
  if (!Array.isArray(problem.tests) || problem.tests.length < 4) errors.push(`${problem.id}: 테스트가 4개 미만`);
  if (!Array.isArray(problem.hints) || problem.hints.length < 3 || problem.hints.length > 5) errors.push(`${problem.id}: 힌트는 3~5개여야 함`);
  if (!problem.starterCode.includes('function solution')) errors.push(`${problem.id}: starterCode에 solution 함수 없음`);
  if (!problem.solutionExplanation?.code) errors.push(`${problem.id}: 최종 풀이 코드 없음`);
  const javaVariant = problem.languageVariants?.java;
  if (!problem.supportedLanguages?.includes('java')) errors.push(`${problem.id}: Java 지원 언어 등록 없음`);
  if (!javaVariant?.starterCode?.includes('class Solution')) errors.push(`${problem.id}: Java 시작 코드 없음`);
  if (!javaVariant?.referenceSolution?.includes('class Solution')) errors.push(`${problem.id}: Java 기준 풀이 없음`);
  if (!Array.isArray(javaVariant?.javaSpec?.argTypes)) errors.push(`${problem.id}: Java 인자 타입 명세 없음`);
  if (!javaVariant?.javaSpec?.returnType) errors.push(`${problem.id}: Java 반환 타입 명세 없음`);
  for (const [testIndex, test] of problem.tests.entries()) {
    if (test.args.length !== javaVariant?.javaSpec?.argTypes?.length) errors.push(`${problem.id}: test ${testIndex + 1} Java 인자 수 불일치`);
    test.args.forEach((value, argIndex) => {
      if (!matchesJavaType(value, javaVariant?.javaSpec?.argTypes?.[argIndex])) errors.push(`${problem.id}: test ${testIndex + 1} Java 인자 ${argIndex + 1} 타입 불일치`);
    });
    if (!matchesJavaType(test.expected, javaVariant?.javaSpec?.returnType)) errors.push(`${problem.id}: test ${testIndex + 1} Java 반환 타입 불일치`);
  }
  try {
    const solution = new Function(`${problem.referenceSolution}; return solution;`)();
    for (const [index, test] of problem.tests.entries()) {
      const actual = await solution(...structuredClone(test.args));
      if (!valuesEqual(actual, test.expected)) errors.push(`${problem.id}: test ${index + 1} 기대값 불일치 (actual=${JSON.stringify(actual)})`);
    }
  } catch (error) {
    errors.push(`${problem.id}: referenceSolution 실행 실패 - ${error.message}`);
  }
}

if (errors.length) {
  console.error(`문제 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`✓ Level 0~5 ${levels.map((items) => items.length).join(' / ')}개, 총 ${problems.length}개 문제 검증 완료`);
console.log(`✓ ${problems.reduce((sum, problem) => sum + problem.tests.length, 0)}개 테스트의 reference solution 결과 일치`);
console.log(`✓ ${problems.length}개 문제의 Java 코드·타입 명세 확인`);
