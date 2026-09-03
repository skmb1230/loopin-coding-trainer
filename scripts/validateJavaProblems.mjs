import level0Problems from '../src/data/problems/level0/index.js';
import level1Problems from '../src/data/problems/level1/index.js';
import level2Problems from '../src/data/problems/level2/index.js';
import level3Problems from '../src/data/problems/level3/index.js';
import level4Problems from '../src/data/problems/level4/index.js';
import level5Problems from '../src/data/problems/level5/index.js';
import { checkJdk, executeJava } from './javaRunnerPlugin.mjs';
import { generateRuntimeTests } from '../src/core/problems/generateRuntimeTests.js';

const jdk = await checkJdk();
if (!jdk.available) {
  console.error('Java 문제 검증에는 JDK 21 이상이 필요합니다.');
  process.exit(1);
}

const failures = [];
const problems = [level0Problems, level1Problems, level2Problems, level3Problems, level4Problems, level5Problems].flat();
for (let start = 0; start < problems.length; start += 8) {
  const batch = problems.slice(start, start + 8);
  const results = await Promise.all(batch.map(async (problem) => {
    const variant = problem.languageVariants.java;
    return { problem, result: await executeJava({ code: variant.referenceSolution, tests: [...problem.tests, ...generateRuntimeTests(problem)], javaSpec: variant.javaSpec, timeout: 5000 }) };
  }));
  for (const { problem, result } of results) {
    if (result.status !== 'passed') failures.push(`${problem.id}: ${result.error || result.status}`);
  }
}

if (failures.length) {
  console.error(`Java 문제 검증 실패 (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`✓ JDK ${jdk.major}에서 Java 기준 풀이 ${problems.length}개 컴파일 완료`);
console.log(`✓ ${problems.reduce((sum, problem) => sum + problem.tests.length + 4, 0)}개 Java 정적·실행 시점 seed 테스트 통과`);
