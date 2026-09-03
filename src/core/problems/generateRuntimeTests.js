const clone = (value) => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

function randomFromSeed(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
}

function offsetNumbers(value, offset) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const shifted = value + offset;
    return Math.max(value >= 0 ? 0 : -1_000_000, Math.min(1_000_000, shifted));
  }
  if (Array.isArray(value)) return value.map((item) => offsetNumbers(item, offset));
  return value;
}

function mutateArgs(args, random) {
  const next = clone(args);
  const offset = Math.floor(random() * 7) - 3 || 1;

  if (next.length === 1) {
    if (typeof next[0] === 'string' && next[0].length > 1) {
      const pivot = 1 + Math.floor(random() * (next[0].length - 1));
      next[0] = next[0].slice(pivot) + next[0].slice(0, pivot);
    } else if (Array.isArray(next[0]) && next[0].length) {
      next[0] = offsetNumbers(next[0], offset);
    } else if (typeof next[0] === 'number') {
      next[0] = offsetNumbers(next[0], offset);
    }
    return next;
  }

  // 배열 + 목표값/크기 형태는 배열 길이와 정렬 순서를 보존한 채 값만 평행 이동한다.
  if (Array.isArray(next[0]) && !Array.isArray(next[0][0])) next[0] = offsetNumbers(next[0], offset);
  return next;
}

export function generateRuntimeTests(problem, count = 4) {
  if (!problem?.tests?.length || !problem?.referenceSolution || count <= 0) return [];
  const random = randomFromSeed(problem.testGenerator?.seed);
  const solution = new Function(`${problem.referenceSolution}; return solution;`)();
  const sources = problem.tests.filter((test) => test.visibility === 'hidden').length
    ? problem.tests.filter((test) => test.visibility === 'hidden')
    : problem.tests;

  return Array.from({ length: count }, (_, index) => {
    const source = sources[Math.floor(random() * sources.length)];
    const args = mutateArgs(source.args, random);
    return {
      args,
      expected: solution(...clone(args)),
      visibility: 'hidden',
      label: `seed 검증 ${index + 1}`,
      guidance: index % 2 === 0
        ? '입력 값이 달라져도 같은 규칙이 유지되는지 확인해보세요.'
        : '예제에만 맞춘 조건이나 상수를 사용하지 않았는지 확인해보세요.',
      generated: true,
    };
  });
}
