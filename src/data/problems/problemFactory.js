const starterByArgs = (args) => `function solution(${args.join(', ')}) {\n  // 여기에 풀이를 작성하세요.\n  \n}`;

export function createProblem(definition) {
  const publicTests = definition.publicTests.map((test) => ({ ...test, visibility: 'public' }));
  const hiddenTests = definition.hiddenTests.map((test) => ({ ...test, visibility: 'hidden' }));
  const pseudocode = definition.pseudocode;

  return {
    id: definition.id,
    title: definition.title,
    level: 0,
    difficulty: definition.difficulty,
    category: definition.category,
    tags: definition.concepts,
    description: definition.description,
    constraints: definition.constraints,
    examples: publicTests.slice(0, 2).map(({ args, expected }) => ({ args, expected })),
    starterCode: definition.starterCode || starterByArgs(definition.args),
    estimatedMinutes: definition.estimatedMinutes || 12,
    prerequisites: definition.prerequisites || ['JavaScript 함수', '배열과 문자열 기초'],
    concepts: definition.concepts,
    hints: [
      `최종적으로 반환해야 하는 값과 입력 ${definition.args.join(', ')}의 역할을 한 문장으로 말해볼까요?`,
      '첫 번째 공개 예제를 종이에 적고, 값이 바뀌는 과정을 한 단계씩 따라가 볼까요?',
      definition.observation,
      definition.algorithmHint,
      pseudocode,
    ],
    commonMistakes: definition.commonMistakes,
    reviewQuestions: [
      '이 풀이에서 반복해서 유지한 값은 무엇인가요?',
      '입력 크기가 커지면 실행 횟수는 어떻게 변하나요?',
      '비슷한 문제에서 이 접근을 떠올릴 신호는 무엇인가요?',
    ],
    testGenerator: {
      seed: Number(definition.id.slice(2)) * 7919,
      strategy: 'deterministic-boundary-cases',
    },
    tests: [...publicTests, ...hiddenTests],
    solutionExplanation: {
      concept: definition.explanation,
      pseudocode,
      code: definition.referenceSolution,
    },
    referenceSolution: definition.referenceSolution,
  };
}
