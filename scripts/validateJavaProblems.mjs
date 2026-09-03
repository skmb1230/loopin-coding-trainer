import level0Problems from '../src/data/problems/level0/index.js';
import { checkJdk, executeJava } from './javaRunnerPlugin.mjs';

const jdk = await checkJdk();
if (!jdk.available) {
  console.error('Java 문제 검증에는 JDK 21 이상이 필요합니다.');
  process.exit(1);
}

const failures = [];
for (let start = 0; start < level0Problems.length; start += 4) {
  const batch = level0Problems.slice(start, start + 4);
  const results = await Promise.all(batch.map(async (problem) => {
    const variant = problem.languageVariants.java;
    return { problem, result: await executeJava({ code: variant.referenceSolution, tests: problem.tests, javaSpec: variant.javaSpec, timeout: 5000 }) };
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

console.log(`✓ JDK ${jdk.major}에서 Java 기준 풀이 ${level0Problems.length}개 컴파일 완료`);
console.log(`✓ ${level0Problems.reduce((sum, problem) => sum + problem.tests.length, 0)}개 Java 테스트 통과`);
