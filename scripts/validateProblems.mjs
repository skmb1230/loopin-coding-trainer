import level0Problems from '../src/data/problems/level0/index.js';
import { valuesEqual } from '../src/core/runner/value.js';

const required = ['id', 'title', 'level', 'difficulty', 'category', 'description', 'constraints', 'examples', 'starterCode', 'estimatedMinutes', 'concepts', 'hints', 'commonMistakes', 'reviewQuestions', 'testGenerator', 'solutionExplanation', 'referenceSolution'];
const problems = [...level0Problems];
const errors = [];
const ids = new Set();

for (const problem of problems) {
  if (ids.has(problem.id)) errors.push(`${problem.id}: 중복 ID`);
  ids.add(problem.id);
  for (const field of required) if (problem[field] === undefined || problem[field] === null) errors.push(`${problem.id}: ${field} 필드 없음`);
  if (!/^JS\d{4}$/.test(problem.id)) errors.push(`${problem.id}: ID 형식 오류`);
  if (!Number.isInteger(problem.level) || problem.level < 0 || problem.level > 5) errors.push(`${problem.id}: level 범위 오류`);
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

console.log(`✓ ${problems.length}개 문제 검증 완료`);
console.log(`✓ ${problems.reduce((sum, problem) => sum + problem.tests.length, 0)}개 테스트의 reference solution 결과 일치`);
console.log(`✓ ${problems.length}개 문제의 Java 코드·타입 명세 확인`);
