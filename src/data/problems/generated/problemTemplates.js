import { createProblem } from '../problemFactory.js';

export const problemTargets = Object.freeze({ 0: 200, 1: 220, 2: 180, 3: 120, 4: 60, 5: 20 });

const defaultReturnByType = {
  int: 'return 0;',
  Integer: 'return null;',
  boolean: 'return false;',
  String: 'return "";',
  'int[]': 'return new int[0];',
  'int[][]': 'return new int[0][0];',
  'String[]': 'return new String[0];',
  'Object[]': 'return new Object[0];',
};

const clone = (value) => Array.isArray(value) ? value.map(clone) : value;
const indent = (source, spaces = 4) => source.split('\n').map((line) => `${' '.repeat(spaces)}${line}`).join('\n');
const range = (length, mapper = (index) => index) => Array.from({ length }, (_, index) => mapper(index));

function javaSource(args, returnType, body) {
  const parameters = args.map(({ type, name }) => `${type} ${name}`).join(', ');
  return `import java.util.*;\n\nclass Solution {\n  public static ${returnType} solution(${parameters}) {\n${indent(body)}\n  }\n}`;
}

function javaVariant(args, returnType, body, algorithmHint, pseudocode) {
  return {
    javaSpec: { argTypes: args.map(({ type }) => type), returnType },
    starterCode: javaSource(args, returnType, `// 여기에 풀이를 작성하세요.\n${defaultReturnByType[returnType]}`),
    referenceSolution: javaSource(args, returnType, body),
    prerequisites: ['Java 메서드', '배열과 컬렉션', '알고리즘 구현'],
    algorithmHint,
    pseudocode,
  };
}

function makeTests(spec) {
  if (!Array.isArray(spec.cases) || spec.cases.length < 4) throw new Error('생성 문제에는 최소 4개의 테스트 입력이 필요합니다.');
  return spec.cases.slice(0, 4).map((args, index) => ({
    args: clone(args),
    expected: spec.solve(...clone(args)),
    ...(index >= 2 ? {
      label: index === 2 ? '경계 조건' : '추가 검증',
      guidance: index === 2 ? '빈 값, 최솟값 또는 조건의 경계를 다시 확인해보세요.' : '입력 순서와 중복이 바뀌어도 같은 규칙이 적용되는지 확인해보세요.',
    } : {}),
  }));
}

function buildGeneratedProblem({ family, level, sequence, variant }) {
  const spec = family.make(variant);
  const tests = makeTests(spec);
  const id = `JS${level}${String(sequence).padStart(3, '0')}`;
  const pseudocode = spec.pseudocode || `1. 입력의 경계 조건을 먼저 확인합니다.\n2. ${family.category} 규칙으로 필요한 상태를 갱신합니다.\n3. 계산한 결과를 반환합니다.`;
  const algorithmHint = spec.algorithmHint || `${family.concepts.join(' · ')} 개념으로 같은 계산을 반복하지 않는 방법을 찾아보세요.`;
  return createProblem({
    id,
    level,
    difficulty: family.difficulty,
    category: family.category,
    args: family.args,
    concepts: family.concepts,
    title: spec.title,
    description: spec.description,
    constraints: spec.constraints || family.constraints,
    publicTests: tests.slice(0, 2),
    hiddenTests: tests.slice(2),
    observation: spec.observation || '입력 전체를 그대로 다시 계산하지 않고 유지할 수 있는 값은 무엇일까요?',
    algorithmHint,
    pseudocode,
    commonMistakes: spec.commonMistakes || ['경계 조건을 빠뜨림', '입력 배열을 의도치 않게 변경함'],
    explanation: spec.explanation || `${family.category}의 핵심 상태를 정하고 입력을 필요한 횟수만큼 순회하면 해결할 수 있습니다.`,
    referenceSolution: spec.referenceSolution,
    estimatedMinutes: family.minutes,
    templateId: `${level}:${family.key}`,
    templateVariant: variant,
    languageVariants: {
      java: javaVariant(family.javaArgs, family.returnType, spec.javaBody, algorithmHint, pseudocode),
    },
  });
}

const level0Families = [
  {
    key: 'divisible-sum', category: '반복문', difficulty: 1, minutes: 10,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'int', concepts: ['Array', 'Loop', 'Modulo'],
    constraints: ['0 ≤ numbers.length ≤ 1,000', '각 원소는 -10,000 이상 10,000 이하의 정수입니다.'],
    make: (variant) => {
      const divisor = variant + 2;
      return {
        title: `${divisor}의 배수만 더하기`,
        description: `정수 배열 numbers에서 ${divisor}의 배수인 값만 더해 반환하세요.`,
        cases: [[[]], [[divisor, divisor + 1, -divisor, divisor * 2]], [[1, 2, 3]], [[divisor * 3, 0, divisor * 4, -1]]],
        solve: (numbers) => numbers.reduce((sum, number) => sum + (number % divisor === 0 ? number : 0), 0),
        observation: `각 원소를 ${divisor}로 나눈 나머지가 0인지 확인하면 어떤 값을 더할지 결정할 수 있어요.`,
        referenceSolution: `function solution(numbers) { let sum = 0; for (const number of numbers) if (number % ${divisor} === 0) sum += number; return sum; }`,
        javaBody: `int sum = 0;\nfor (int number : numbers) if (number % ${divisor} == 0) sum += number;\nreturn sum;`,
      };
    },
  },
  {
    key: 'threshold-count', category: '조건문', difficulty: 1, minutes: 10,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'int', concepts: ['Array', 'Condition', 'Counting'],
    constraints: ['0 ≤ numbers.length ≤ 1,000', '각 원소는 정수입니다.'],
    make: (variant) => {
      const threshold = variant * 3 - 30;
      return {
        title: `${threshold} 이상인 측정값 세기`,
        description: `정수 배열 numbers에서 ${threshold} 이상인 원소의 개수를 반환하세요.`,
        cases: [[[]], [[threshold - 1, threshold, threshold + 1]], [[threshold, threshold, threshold - 5]], [[-100, 0, 100, threshold - 1]]],
        solve: (numbers) => numbers.filter((number) => number >= threshold).length,
        referenceSolution: `function solution(numbers) { let count = 0; for (const number of numbers) if (number >= ${threshold}) count++; return count; }`,
        javaBody: `int count = 0;\nfor (int number : numbers) if (number >= ${threshold}) count++;\nreturn count;`,
      };
    },
  },
  {
    key: 'affine-transform', category: '배열', difficulty: 1, minutes: 12,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'int[]', concepts: ['Array', 'Arithmetic', 'Mapping'],
    constraints: ['0 ≤ numbers.length ≤ 1,000', '계산 결과는 32비트 정수 범위입니다.'],
    make: (variant) => {
      const multiplier = 2 + (variant % 4);
      const offset = variant - 17;
      return {
        title: `${multiplier}배 후 ${offset >= 0 ? '+' : ''}${offset} 보정하기`,
        description: `numbers의 각 원소에 ${multiplier}를 곱한 뒤 ${offset}을 더한 새 배열을 반환하세요.`,
        cases: [[[]], [[0, 1, -1]], [[2, 5, 9]], [[-10, 10]]],
        solve: (numbers) => numbers.map((number) => number * multiplier + offset),
        referenceSolution: `function solution(numbers) { return numbers.map((number) => number * ${multiplier} + ${offset}); }`,
        javaBody: `int[] result = new int[numbers.length];\nfor (int i = 0; i < numbers.length; i++) result[i] = numbers[i] * ${multiplier} + ${offset};\nreturn result;`,
      };
    },
  },
  {
    key: 'character-step', category: '문자열', difficulty: 2, minutes: 12,
    args: ['text'], javaArgs: [{ type: 'String', name: 'text' }], returnType: 'String', concepts: ['String', 'Index', 'Loop'],
    constraints: ['0 ≤ text.length ≤ 5,000', 'text는 영문자와 숫자로 이루어집니다.'],
    make: (variant) => {
      const step = variant + 2;
      const longText = 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(Math.ceil((step * 3 + 1) / 36));
      return {
        title: `${step}칸 간격 문자 수집`,
        description: `문자열 text의 0번 문자부터 시작해 인덱스를 ${step}씩 증가시키며 만나는 문자를 이어 반환하세요.`,
        cases: [[''], ['abcdef'], [longText.slice(0, step + 1)], [longText.slice(0, step * 3 + 1)]],
        solve: (text) => { let answer = ''; for (let index = 0; index < text.length; index += step) answer += text[index]; return answer; },
        referenceSolution: `function solution(text) { let answer = ''; for (let index = 0; index < text.length; index += ${step}) answer += text[index]; return answer; }`,
        javaBody: `StringBuilder answer = new StringBuilder();\nfor (int index = 0; index < text.length(); index += ${step}) answer.append(text.charAt(index));\nreturn answer.toString();`,
      };
    },
  },
  {
    key: 'weighted-digit-sum', category: '숫자 연산', difficulty: 2, minutes: 12,
    args: ['number'], javaArgs: [{ type: 'int', name: 'number' }], returnType: 'int', concepts: ['Number', 'Digit', 'Loop'],
    constraints: ['-1,000,000,000 ≤ number ≤ 1,000,000,000', 'number는 정수입니다.'],
    make: (variant) => {
      const weight = variant + 1;
      return {
        title: `자릿수 합에 ${weight}배 가중치`,
        description: `정수 number의 부호를 제외한 각 자릿수 합에 ${weight}를 곱해 반환하세요.`,
        cases: [[0], [123], [-405], [987654]],
        solve: (number) => [...String(Math.abs(number))].reduce((sum, digit) => sum + Number(digit), 0) * weight,
        referenceSolution: `function solution(number) { let sum = 0; for (const digit of String(Math.abs(number))) sum += Number(digit); return sum * ${weight}; }`,
        javaBody: `int value = Math.abs(number);\nint sum = 0;\nwhile (value > 0) { sum += value % 10; value /= 10; }\nreturn sum * ${weight};`,
      };
    },
  },
];

const level1Families = [
  {
    key: 'fixed-window', category: 'Sliding Window', difficulty: 2, minutes: 18,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'Integer', concepts: ['Array', 'SlidingWindow', 'Max'],
    constraints: ['0 ≤ numbers.length ≤ 5,000', '연속 구간의 합은 32비트 정수 범위입니다.'],
    make: (variant) => {
      const size = variant + 2;
      const values = range(size + 4, (index) => (index * 7 + variant) % 13 - 6);
      return {
        title: `길이 ${size} 구간의 최대 합`,
        description: `numbers에서 길이가 정확히 ${size}인 연속 구간 중 가장 큰 합을 반환하세요. 구간을 만들 수 없으면 null을 반환합니다.`,
        cases: [[[]], [[...range(size, (index) => index - 2)]], [values], [[...values].reverse()]],
        solve: (numbers) => { if (numbers.length < size) return null; let sum = numbers.slice(0, size).reduce((a, b) => a + b, 0); let best = sum; for (let i = size; i < numbers.length; i++) { sum += numbers[i] - numbers[i - size]; best = Math.max(best, sum); } return best; },
        referenceSolution: `function solution(numbers) { if (numbers.length < ${size}) return null; let sum = numbers.slice(0, ${size}).reduce((a,b) => a+b, 0), best = sum; for (let i=${size}; i<numbers.length; i++) { sum += numbers[i] - numbers[i-${size}]; best = Math.max(best, sum); } return best; }`,
        javaBody: `if (numbers.length < ${size}) return null;\nint sum = 0;\nfor (int i = 0; i < ${size}; i++) sum += numbers[i];\nint best = sum;\nfor (int i = ${size}; i < numbers.length; i++) { sum += numbers[i] - numbers[i - ${size}]; best = Math.max(best, sum); }\nreturn best;`,
      };
    },
  },
  {
    key: 'pair-target', category: 'Set', difficulty: 2, minutes: 18,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'boolean', concepts: ['Set', 'TwoSum', 'Complement'],
    constraints: ['0 ≤ numbers.length ≤ 10,000', '서로 다른 인덱스의 두 원소를 사용합니다.'],
    make: (variant) => {
      const target = variant * 3 - 50;
      return {
        title: `두 수로 ${target} 만들기`,
        description: `numbers의 서로 다른 두 원소를 더해 ${target}을 만들 수 있으면 true, 아니면 false를 반환하세요.`,
        cases: [[[]], [[target - 1, 1, 7]], [[target, 0]], [[1, 2, 4, 8, 16]]],
        solve: (numbers) => { const seen = new Set(); for (const number of numbers) { if (seen.has(target - number)) return true; seen.add(number); } return false; },
        referenceSolution: `function solution(numbers) { const seen = new Set(); for (const number of numbers) { if (seen.has(${target} - number)) return true; seen.add(number); } return false; }`,
        javaBody: `Set<Integer> seen = new HashSet<>();\nfor (int number : numbers) { if (seen.contains(${target} - number)) return true; seen.add(number); }\nreturn false;`,
      };
    },
  },
  {
    key: 'threshold-streak', category: '배열', difficulty: 2, minutes: 16,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'int', concepts: ['Array', 'Condition', 'Streak'],
    constraints: ['0 ≤ numbers.length ≤ 10,000', '각 원소는 정수입니다.'],
    make: (variant) => {
      const threshold = variant - 20;
      return {
        title: `${threshold} 초과 연속 구간`,
        description: `numbers에서 ${threshold}보다 큰 값이 연속으로 이어지는 가장 긴 구간의 길이를 반환하세요.`,
        cases: [[[]], [[threshold + 1, threshold + 2, threshold, threshold + 3]], [[threshold, threshold - 1]], [[threshold + 5, threshold + 4, threshold + 3]]],
        solve: (numbers) => { let current = 0; let best = 0; for (const number of numbers) { current = number > threshold ? current + 1 : 0; best = Math.max(best, current); } return best; },
        referenceSolution: `function solution(numbers) { let current = 0, best = 0; for (const number of numbers) { current = number > ${threshold} ? current + 1 : 0; best = Math.max(best, current); } return best; }`,
        javaBody: `int current = 0, best = 0;\nfor (int number : numbers) { current = number > ${threshold} ? current + 1 : 0; best = Math.max(best, current); }\nreturn best;`,
      };
    },
  },
  {
    key: 'run-filter', category: '문자열', difficulty: 3, minutes: 20,
    args: ['text'], javaArgs: [{ type: 'String', name: 'text' }], returnType: 'String', concepts: ['String', 'RunLength', 'Simulation'],
    constraints: ['0 ≤ text.length ≤ 20,000', 'text는 영문 소문자로 이루어집니다.'],
    make: (variant) => {
      const minimum = variant + 2;
      const repeat = (char, count) => char.repeat(count);
      return {
        title: `${minimum}개 이상 연속 문자만 압축`,
        description: `같은 문자가 ${minimum}개 이상 연속되면 "문자+개수"로 바꾸고, 더 짧은 구간은 원문 그대로 두어 반환하세요.`,
        cases: [[''], [repeat('a', minimum)], [`${repeat('a', minimum - 1)}${repeat('b', minimum + 1)}`], [`x${repeat('c', minimum)}yy`]],
        solve: (text) => { let answer = ''; for (let i = 0; i < text.length;) { let j = i + 1; while (j < text.length && text[j] === text[i]) j++; const count = j - i; answer += count >= minimum ? text[i] + count : text.slice(i, j); i = j; } return answer; },
        referenceSolution: `function solution(text) { let answer=''; for (let i=0; i<text.length;) { let j=i+1; while (j<text.length && text[j]===text[i]) j++; const count=j-i; answer += count>=${minimum} ? text[i]+count : text.slice(i,j); i=j; } return answer; }`,
        javaBody: `StringBuilder answer = new StringBuilder();\nfor (int i = 0; i < text.length();) {\n  int j = i + 1;\n  while (j < text.length() && text.charAt(j) == text.charAt(i)) j++;\n  int count = j - i;\n  if (count >= ${minimum}) answer.append(text.charAt(i)).append(count);\n  else answer.append(text, i, j);\n  i = j;\n}\nreturn answer.toString();`,
      };
    },
  },
  {
    key: 'offset-diagonal', category: '행렬', difficulty: 3, minutes: 18,
    args: ['matrix'], javaArgs: [{ type: 'int[][]', name: 'matrix' }], returnType: 'int', concepts: ['Matrix', 'Index', 'Diagonal'],
    constraints: ['matrix는 정사각 행렬입니다.', '행렬 합은 32비트 정수 범위입니다.'],
    make: (variant) => {
      const offset = variant + 1;
      const size = offset + 3;
      const matrix = range(size, (row) => range(size, (column) => row * 3 + column + 1));
      return {
        title: `주대각선에서 오른쪽 ${offset}칸 합`,
        description: `정사각 행렬 matrix에서 column - row가 ${offset}인 칸들의 합을 반환하세요.`,
        cases: [[[]], [[[1]]], [matrix], [matrix.map((row) => [...row].reverse())]],
        solve: (input) => { let sum = 0; for (let row = 0; row < input.length; row++) if (row + offset < input[row].length) sum += input[row][row + offset]; return sum; },
        referenceSolution: `function solution(matrix) { let sum=0; for (let row=0; row<matrix.length; row++) if (row+${offset}<matrix[row].length) sum += matrix[row][row+${offset}]; return sum; }`,
        javaBody: `int sum = 0;\nfor (int row = 0; row < matrix.length; row++) if (row + ${offset} < matrix[row].length) sum += matrix[row][row + ${offset}];\nreturn sum;`,
      };
    },
  },
];

const level2Families = [
  {
    key: 'lower-bound', category: 'Binary Search', difficulty: 3, minutes: 24,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'int', concepts: ['BinarySearch', 'LowerBound', 'SortedArray'],
    constraints: ['numbers는 오름차순으로 정렬되어 있습니다.', '0 ≤ numbers.length ≤ 100,000'],
    make: (variant) => {
      const target = variant * 2 - 25;
      return {
        title: `${target} 이상이 처음 나오는 위치`,
        description: `정렬 배열 numbers에서 ${target} 이상인 첫 원소의 인덱스를 반환하세요. 없으면 -1을 반환합니다.`,
        cases: [[[]], [[target - 2, target, target + 1]], [[target - 5, target - 3]], [[target, target, target + 10]]],
        solve: (numbers) => { let left = 0; let right = numbers.length; while (left < right) { const mid = Math.floor((left + right) / 2); if (numbers[mid] >= target) right = mid; else left = mid + 1; } return left === numbers.length ? -1 : left; },
        referenceSolution: `function solution(numbers) { let left=0,right=numbers.length; while(left<right){const mid=Math.floor((left+right)/2); if(numbers[mid]>=${target})right=mid;else left=mid+1;} return left===numbers.length?-1:left; }`,
        javaBody: `int left = 0, right = numbers.length;\nwhile (left < right) { int mid = (left + right) >>> 1; if (numbers[mid] >= ${target}) right = mid; else left = mid + 1; }\nreturn left == numbers.length ? -1 : left;`,
      };
    },
  },
  {
    key: 'weighted-components', category: 'DFS · BFS', difficulty: 3, minutes: 28,
    args: ['matrix'], javaArgs: [{ type: 'int[][]', name: 'matrix' }], returnType: 'int', concepts: ['Graph', 'DFS', 'ConnectedComponent'],
    constraints: ['matrix는 대칭인 인접 강도 행렬입니다.', '0 ≤ matrix.length ≤ 300'],
    make: (variant) => {
      const threshold = variant + 1;
      const connected = [[0, threshold, 0, 0], [threshold, 0, 0, 0], [0, 0, 0, threshold + 1], [0, 0, threshold + 1, 0]];
      return {
        title: `연결 강도 ${threshold} 이상의 네트워크`,
        description: `인접 강도 행렬 matrix에서 값이 ${threshold} 이상인 간선만 사용했을 때 연결 요소의 개수를 반환하세요.`,
        cases: [[[]], [[[0]]], [connected], [[[0, threshold - 1], [threshold - 1, 0]]]],
        solve: (matrix) => { const visited = Array(matrix.length).fill(false); let count = 0; for (let start = 0; start < matrix.length; start++) { if (visited[start]) continue; count++; const stack = [start]; visited[start] = true; while (stack.length) { const node = stack.pop(); for (let next = 0; next < matrix.length; next++) if (!visited[next] && matrix[node][next] >= threshold) { visited[next] = true; stack.push(next); } } } return count; },
        referenceSolution: `function solution(matrix) { const visited=Array(matrix.length).fill(false); let count=0; for(let start=0;start<matrix.length;start++){if(visited[start])continue;count++;const stack=[start];visited[start]=true;while(stack.length){const node=stack.pop();for(let next=0;next<matrix.length;next++)if(!visited[next]&&matrix[node][next]>=${threshold}){visited[next]=true;stack.push(next);}}}return count; }`,
        javaBody: `boolean[] visited = new boolean[matrix.length];\nint count = 0;\nfor (int start = 0; start < matrix.length; start++) {\n  if (visited[start]) continue;\n  count++;\n  Deque<Integer> stack = new ArrayDeque<>(); stack.push(start); visited[start] = true;\n  while (!stack.isEmpty()) { int node = stack.pop(); for (int next = 0; next < matrix.length; next++) if (!visited[next] && matrix[node][next] >= ${threshold}) { visited[next] = true; stack.push(next); } }\n}\nreturn count;`,
      };
    },
  },
  {
    key: 'coin-change', category: 'Dynamic Programming', difficulty: 4, minutes: 30,
    args: ['coins'], javaArgs: [{ type: 'int[]', name: 'coins' }], returnType: 'int', concepts: ['DP', 'CoinChange', 'Min'],
    constraints: ['모든 coin은 양의 정수입니다.', 'coins.length ≤ 30'],
    make: (variant) => {
      const amount = variant + 8;
      return {
        title: `${amount}원을 만드는 최소 동전`,
        description: `동전 단위 배열 coins를 여러 번 사용할 수 있을 때 합계 ${amount}를 만드는 최소 동전 수를 반환하세요. 만들 수 없으면 -1입니다.`,
        cases: [[[1, 3, 4]], [[2, 5]], [[amount + 1]], [[1, amount]]],
        solve: (coins) => { const dp = Array(amount + 1).fill(amount + 1); dp[0] = 0; for (let value = 1; value <= amount; value++) for (const coin of coins) if (coin <= value) dp[value] = Math.min(dp[value], dp[value - coin] + 1); return dp[amount] > amount ? -1 : dp[amount]; },
        referenceSolution: `function solution(coins) { const dp=Array(${amount + 1}).fill(${amount + 1});dp[0]=0;for(let value=1;value<=${amount};value++)for(const coin of coins)if(coin<=value)dp[value]=Math.min(dp[value],dp[value-coin]+1);return dp[${amount}]>${amount}?-1:dp[${amount}]; }`,
        javaBody: `int[] dp = new int[${amount + 1}];\nArrays.fill(dp, ${amount + 1}); dp[0] = 0;\nfor (int value = 1; value <= ${amount}; value++) for (int coin : coins) if (coin <= value) dp[value] = Math.min(dp[value], dp[value - coin] + 1);\nreturn dp[${amount}] > ${amount} ? -1 : dp[${amount}];`,
      };
    },
  },
  {
    key: 'bounded-positive-window', category: 'Two Pointers', difficulty: 4, minutes: 28,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'int', concepts: ['TwoPointers', 'SlidingWindow', 'PositiveArray'],
    constraints: ['numbers의 원소는 모두 양의 정수입니다.', 'numbers.length ≤ 100,000'],
    make: (variant) => {
      const limit = variant + 5;
      return {
        title: `합이 ${limit} 이하인 최장 연속 구간`,
        description: `양의 정수 배열 numbers에서 합이 ${limit} 이하인 가장 긴 연속 구간의 길이를 반환하세요.`,
        cases: [[[]], [[1, 1, 1, 1]], [[limit, 1, 1]], [[2, 3, 1, 2, 1, 1]]],
        solve: (numbers) => { let left = 0; let sum = 0; let best = 0; for (let right = 0; right < numbers.length; right++) { sum += numbers[right]; while (sum > limit && left <= right) sum -= numbers[left++]; best = Math.max(best, right - left + 1); } return best; },
        referenceSolution: `function solution(numbers) { let left=0,sum=0,best=0;for(let right=0;right<numbers.length;right++){sum+=numbers[right];while(sum>${limit}&&left<=right)sum-=numbers[left++];best=Math.max(best,right-left+1);}return best; }`,
        javaBody: `int left = 0, sum = 0, best = 0;\nfor (int right = 0; right < numbers.length; right++) { sum += numbers[right]; while (sum > ${limit} && left <= right) sum -= numbers[left++]; best = Math.max(best, right - left + 1); }\nreturn best;`,
      };
    },
  },
  {
    key: 'merge-nearby-intervals', category: '정렬 · 구간', difficulty: 4, minutes: 30,
    args: ['intervals'], javaArgs: [{ type: 'int[][]', name: 'intervals' }], returnType: 'int[][]', concepts: ['Sort', 'Interval', 'Greedy'],
    constraints: ['각 구간은 [start, end]이며 start ≤ end입니다.', 'intervals.length ≤ 20,000'],
    make: (variant) => {
      const gap = variant;
      return {
        title: `간격 ${gap}까지 구간 합치기`,
        description: `구간 배열 intervals를 시작점 순으로 보고, 다음 시작점과 현재 끝점 사이가 ${gap} 이하라면 하나로 합쳐 반환하세요.`,
        cases: [[[]], [[[1, 2]]], [[[1, 3], [3 + gap, 7], [10 + gap, 12 + gap]]], [[[8, 9], [1, 2], [2 + gap, 5]]]],
        solve: (intervals) => { if (!intervals.length) return []; const sorted = intervals.map((item) => [...item]).sort((a, b) => a[0] - b[0]); const result = [sorted[0]]; for (const [start, end] of sorted.slice(1)) { const last = result[result.length - 1]; if (start <= last[1] + gap) last[1] = Math.max(last[1], end); else result.push([start, end]); } return result; },
        referenceSolution: `function solution(intervals) { if(!intervals.length)return[];const sorted=intervals.map(item=>[...item]).sort((a,b)=>a[0]-b[0]),result=[sorted[0]];for(const [start,end] of sorted.slice(1)){const last=result[result.length-1];if(start<=last[1]+${gap})last[1]=Math.max(last[1],end);else result.push([start,end]);}return result; }`,
        javaBody: `if (intervals.length == 0) return new int[0][0];\nint[][] sorted = new int[intervals.length][];\nfor (int i = 0; i < intervals.length; i++) sorted[i] = intervals[i].clone();\nArrays.sort(sorted, Comparator.comparingInt(item -> item[0]));\nList<int[]> result = new ArrayList<>(); result.add(sorted[0]);\nfor (int i = 1; i < sorted.length; i++) { int[] last = result.get(result.size() - 1); if (sorted[i][0] <= last[1] + ${gap}) last[1] = Math.max(last[1], sorted[i][1]); else result.add(sorted[i]); }\nreturn result.toArray(new int[0][]);`,
      };
    },
  },
];

const level3Families = [
  {
    key: 'knapsack-capacity', category: 'Dynamic Programming', difficulty: 4, minutes: 38,
    args: ['weights', 'values'], javaArgs: [{ type: 'int[]', name: 'weights' }, { type: 'int[]', name: 'values' }], returnType: 'int', concepts: ['DP', 'Knapsack', 'Optimization'],
    constraints: ['weights와 values의 길이는 같습니다.', '각 물건은 최대 한 번 선택합니다.'],
    make: (variant) => {
      const capacity = variant + 5;
      return {
        title: `용량 ${capacity}의 0/1 배낭`,
        description: `각 물건의 무게 weights와 가치 values가 주어질 때 총 무게 ${capacity} 이하로 얻을 수 있는 최대 가치를 반환하세요.`,
        cases: [[[], []], [[1, 3, 4], [2, 5, 7]], [[capacity + 1], [99]], [[2, 2, 3], [3, 4, 5]]],
        solve: (weights, values) => { const dp = Array(capacity + 1).fill(0); for (let i = 0; i < weights.length; i++) for (let current = capacity; current >= weights[i]; current--) dp[current] = Math.max(dp[current], dp[current - weights[i]] + values[i]); return dp[capacity]; },
        referenceSolution: `function solution(weights, values) { const dp=Array(${capacity + 1}).fill(0);for(let i=0;i<weights.length;i++)for(let current=${capacity};current>=weights[i];current--)dp[current]=Math.max(dp[current],dp[current-weights[i]]+values[i]);return dp[${capacity}]; }`,
        javaBody: `int[] dp = new int[${capacity + 1}];\nfor (int i = 0; i < weights.length; i++) for (int current = ${capacity}; current >= weights[i]; current--) dp[current] = Math.max(dp[current], dp[current - weights[i]] + values[i]);\nreturn dp[${capacity}];`,
      };
    },
  },
  {
    key: 'dijkstra-toll', category: '최단 경로', difficulty: 5, minutes: 45,
    args: ['nodeCount', 'edges'], javaArgs: [{ type: 'int', name: 'nodeCount' }, { type: 'int[][]', name: 'edges' }], returnType: 'int[]', concepts: ['Graph', 'Dijkstra', 'ShortestPath'],
    constraints: ['edges의 각 원소는 [from, to, cost]입니다.', '모든 간선 비용은 0 이상입니다.'],
    make: (variant) => {
      const toll = variant;
      return {
        title: `간선 통행료 ${toll}가 붙는 최단 경로`,
        description: `0번 정점에서 출발합니다. 각 간선의 실제 비용을 cost + ${toll}로 볼 때 모든 정점까지의 최단 거리를 반환하고, 도달할 수 없으면 -1을 넣으세요.`,
        cases: [[0, []], [1, []], [4, [[0, 1, 2], [1, 2, 3], [0, 2, 10], [2, 3, 1]]], [3, [[0, 1, 5]]]],
        solve: (nodeCount, edges) => { const distance = Array(nodeCount).fill(Infinity); if (!nodeCount) return []; distance[0] = 0; const used = Array(nodeCount).fill(false); for (let step = 0; step < nodeCount; step++) { let node = -1; for (let i = 0; i < nodeCount; i++) if (!used[i] && (node < 0 || distance[i] < distance[node])) node = i; if (node < 0 || distance[node] === Infinity) break; used[node] = true; for (const [from, to, cost] of edges) if (from === node) distance[to] = Math.min(distance[to], distance[node] + cost + toll); } return distance.map((value) => value === Infinity ? -1 : value); },
        referenceSolution: `function solution(nodeCount, edges) { const distance=Array(nodeCount).fill(Infinity);if(!nodeCount)return[];distance[0]=0;const used=Array(nodeCount).fill(false);for(let step=0;step<nodeCount;step++){let node=-1;for(let i=0;i<nodeCount;i++)if(!used[i]&&(node<0||distance[i]<distance[node]))node=i;if(node<0||distance[node]===Infinity)break;used[node]=true;for(const [from,to,cost] of edges)if(from===node)distance[to]=Math.min(distance[to],distance[node]+cost+${toll});}return distance.map(value=>value===Infinity?-1:value); }`,
        javaBody: `if (nodeCount == 0) return new int[0];\nint inf = 1_000_000_000; int[] distance = new int[nodeCount]; Arrays.fill(distance, inf); distance[0] = 0; boolean[] used = new boolean[nodeCount];\nfor (int step = 0; step < nodeCount; step++) {\n  int node = -1;\n  for (int i = 0; i < nodeCount; i++) if (!used[i] && (node < 0 || distance[i] < distance[node])) node = i;\n  if (node < 0 || distance[node] == inf) break; used[node] = true;\n  for (int[] edge : edges) if (edge[0] == node) distance[edge[1]] = Math.min(distance[edge[1]], distance[node] + edge[2] + ${toll});\n}\nfor (int i = 0; i < nodeCount; i++) if (distance[i] == inf) distance[i] = -1;\nreturn distance;`,
      };
    },
  },
  {
    key: 'lis-gap', category: 'Dynamic Programming', difficulty: 4, minutes: 36,
    args: ['numbers'], javaArgs: [{ type: 'int[]', name: 'numbers' }], returnType: 'int', concepts: ['DP', 'LIS', 'Sequence'],
    constraints: ['0 ≤ numbers.length ≤ 2,000', '부분 수열은 원래 순서를 유지합니다.'],
    make: (variant) => {
      const gap = variant + 1;
      return {
        title: `차이가 ${gap} 이상인 증가 부분 수열`,
        description: `numbers에서 다음 값이 이전 값보다 최소 ${gap} 이상 큰 부분 수열의 최대 길이를 반환하세요.`,
        cases: [[[]], [[1]], [[1, 1 + gap, 1 + gap * 2, 2]], [[9, 1, 8, 2, 7, 3]]],
        solve: (numbers) => { if (!numbers.length) return 0; const dp = Array(numbers.length).fill(1); let best = 1; for (let i = 0; i < numbers.length; i++) for (let j = 0; j < i; j++) if (numbers[i] - numbers[j] >= gap) { dp[i] = Math.max(dp[i], dp[j] + 1); best = Math.max(best, dp[i]); } return best; },
        referenceSolution: `function solution(numbers) { if(!numbers.length)return 0;const dp=Array(numbers.length).fill(1);let best=1;for(let i=0;i<numbers.length;i++)for(let j=0;j<i;j++)if(numbers[i]-numbers[j]>=${gap}){dp[i]=Math.max(dp[i],dp[j]+1);best=Math.max(best,dp[i]);}return best; }`,
        javaBody: `if (numbers.length == 0) return 0;\nint[] dp = new int[numbers.length]; Arrays.fill(dp, 1); int best = 1;\nfor (int i = 0; i < numbers.length; i++) for (int j = 0; j < i; j++) if (numbers[i] - numbers[j] >= ${gap}) { dp[i] = Math.max(dp[i], dp[j] + 1); best = Math.max(best, dp[i]); }\nreturn best;`,
      };
    },
  },
  {
    key: 'grid-limit-bfs', category: 'BFS', difficulty: 4, minutes: 40,
    args: ['grid'], javaArgs: [{ type: 'int[][]', name: 'grid' }], returnType: 'int', concepts: ['BFS', 'Grid', 'ShortestPath'],
    constraints: ['grid는 직사각형 행렬입니다.', '상하좌우로만 이동할 수 있습니다.'],
    make: (variant) => {
      const limit = variant + 1;
      return {
        title: `위험도 ${limit} 이하 경로`,
        description: `grid의 값이 ${limit} 이하인 칸만 지나 (0,0)에서 오른쪽 아래까지 이동하는 최소 칸 수를 반환하세요. 갈 수 없으면 -1입니다.`,
        cases: [[[]], [[[0]]], [[[0, limit + 1], [0, 0]]], [[[0, 0, 0], [limit + 1, limit + 1, 0], [0, 0, 0]]]],
        solve: (grid) => { if (!grid.length || !grid[0].length || grid[0][0] > limit) return -1; const rows = grid.length; const cols = grid[0].length; const distance = range(rows, () => Array(cols).fill(-1)); const queue = [[0, 0]]; distance[0][0] = 1; let head = 0; const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]; while (head < queue.length) { const [row, column] = queue[head++]; for (const [dr, dc] of directions) { const nr = row + dr; const nc = column + dc; if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && distance[nr][nc] < 0 && grid[nr][nc] <= limit) { distance[nr][nc] = distance[row][column] + 1; queue.push([nr, nc]); } } } return distance[rows - 1][cols - 1]; },
        referenceSolution: `function solution(grid) { if(!grid.length||!grid[0].length||grid[0][0]>${limit})return -1;const rows=grid.length,cols=grid[0].length,distance=Array.from({length:rows},()=>Array(cols).fill(-1)),queue=[[0,0]],directions=[[1,0],[-1,0],[0,1],[0,-1]];distance[0][0]=1;let head=0;while(head<queue.length){const [row,column]=queue[head++];for(const [dr,dc] of directions){const nr=row+dr,nc=column+dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&distance[nr][nc]<0&&grid[nr][nc]<=${limit}){distance[nr][nc]=distance[row][column]+1;queue.push([nr,nc]);}}}return distance[rows-1][cols-1]; }`,
        javaBody: `if (grid.length == 0 || grid[0].length == 0 || grid[0][0] > ${limit}) return -1;\nint rows = grid.length, cols = grid[0].length; int[][] distance = new int[rows][cols]; for (int[] row : distance) Arrays.fill(row, -1);\nDeque<int[]> queue = new ArrayDeque<>(); queue.add(new int[]{0, 0}); distance[0][0] = 1; int[][] directions = {{1,0},{-1,0},{0,1},{0,-1}};\nwhile (!queue.isEmpty()) { int[] cell = queue.poll(); for (int[] direction : directions) { int nr=cell[0]+direction[0], nc=cell[1]+direction[1]; if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&distance[nr][nc]<0&&grid[nr][nc]<=${limit}){distance[nr][nc]=distance[cell[0]][cell[1]]+1;queue.add(new int[]{nr,nc});} } }\nreturn distance[rows-1][cols-1];`,
      };
    },
  },
  {
    key: 'dag-path-count', category: 'DAG · DP', difficulty: 5, minutes: 42,
    args: ['nodeCount', 'edges'], javaArgs: [{ type: 'int', name: 'nodeCount' }, { type: 'int[][]', name: 'edges' }], returnType: 'int', concepts: ['DAG', 'DP', 'PathCounting'],
    constraints: ['모든 간선은 작은 번호에서 큰 번호로 향합니다.', '0번에서 마지막 정점으로 가는 경로를 셉니다.'],
    make: (variant) => {
      const modulo = variant + 2;
      return {
        title: `DAG 경로 수를 ${modulo}로 나눈 나머지`,
        description: `0번 정점에서 마지막 정점까지 가는 경로 수를 ${modulo}로 나눈 나머지를 반환하세요. 간선은 [from, to]입니다.`,
        cases: [[0, []], [1, []], [4, [[0,1],[0,2],[1,3],[2,3]]], [5, [[0,1],[0,2],[1,3],[2,3],[3,4],[1,4]]]],
        solve: (nodeCount, edges) => { if (!nodeCount) return 0; const ways = Array(nodeCount).fill(0); ways[0] = 1; for (let node = 0; node < nodeCount; node++) for (const [from, to] of edges) if (from === node) ways[to] = (ways[to] + ways[node]) % modulo; return ways[nodeCount - 1]; },
        referenceSolution: `function solution(nodeCount, edges) { if(!nodeCount)return 0;const ways=Array(nodeCount).fill(0);ways[0]=1;for(let node=0;node<nodeCount;node++)for(const [from,to] of edges)if(from===node)ways[to]=(ways[to]+ways[node])%${modulo};return ways[nodeCount-1]; }`,
        javaBody: `if (nodeCount == 0) return 0;\nint[] ways = new int[nodeCount]; ways[0] = 1;\nfor (int node = 0; node < nodeCount; node++) for (int[] edge : edges) if (edge[0] == node) ways[edge[1]] = (ways[edge[1]] + ways[node]) % ${modulo};\nreturn ways[nodeCount - 1];`,
      };
    },
  },
];

const level4Families = [
  {
    key: 'limited-bellman-ford', category: '최단 경로', difficulty: 5, minutes: 50,
    args: ['nodeCount', 'edges'], javaArgs: [{ type: 'int', name: 'nodeCount' }, { type: 'int[][]', name: 'edges' }], returnType: 'int', concepts: ['BellmanFord', 'DP', 'ShortestPath'],
    constraints: ['edges는 [from, to, cost]입니다.', '음수 비용은 있지만 음수 사이클은 없습니다.'],
    make: (variant) => {
      const maxEdges = variant + 1;
      return {
        title: `최대 ${maxEdges}개 간선으로 도착하기`,
        description: `0번에서 마지막 정점까지 최대 ${maxEdges}개의 간선을 사용한 최소 비용을 반환하세요. 도달할 수 없으면 -1입니다.`,
        cases: [[0, []], [1, []], [4, [[0,1,4],[1,2,-2],[2,3,3],[0,3,20]]], [3, [[0,1,5],[1,2,5],[0,2,20]]]],
        solve: (nodeCount, edges) => { if (!nodeCount) return -1; const inf = Infinity; let distance = Array(nodeCount).fill(inf); distance[0] = 0; for (let step = 0; step < maxEdges; step++) { const next = [...distance]; for (const [from, to, cost] of edges) if (distance[from] !== inf) next[to] = Math.min(next[to], distance[from] + cost); distance = next; } return distance[nodeCount - 1] === inf ? -1 : distance[nodeCount - 1]; },
        referenceSolution: `function solution(nodeCount, edges) { if(!nodeCount)return -1;let distance=Array(nodeCount).fill(Infinity);distance[0]=0;for(let step=0;step<${maxEdges};step++){const next=[...distance];for(const [from,to,cost] of edges)if(distance[from]!==Infinity)next[to]=Math.min(next[to],distance[from]+cost);distance=next;}return distance[nodeCount-1]===Infinity?-1:distance[nodeCount-1]; }`,
        javaBody: `if (nodeCount == 0) return -1;\nint inf = 1_000_000_000; int[] distance = new int[nodeCount]; Arrays.fill(distance, inf); distance[0] = 0;\nfor (int step = 0; step < ${maxEdges}; step++) { int[] next = distance.clone(); for (int[] edge : edges) if (distance[edge[0]] != inf) next[edge[1]] = Math.min(next[edge[1]], distance[edge[0]] + edge[2]); distance = next; }\nreturn distance[nodeCount - 1] == inf ? -1 : distance[nodeCount - 1];`,
      };
    },
  },
  {
    key: 'weighted-lcs', category: '문자열 DP', difficulty: 5, minutes: 50,
    args: ['left', 'right'], javaArgs: [{ type: 'String', name: 'left' }, { type: 'String', name: 'right' }], returnType: 'int', concepts: ['DP', 'LCS', 'String'],
    constraints: ['left와 right의 길이는 각각 1,000 이하입니다.', '문자의 순서는 유지하되 연속일 필요는 없습니다.'],
    make: (variant) => {
      const score = variant + 1;
      const lcs = (left, right) => { const dp = range(left.length + 1, () => Array(right.length + 1).fill(0)); for (let i = 1; i <= left.length; i++) for (let j = 1; j <= right.length; j++) dp[i][j] = left[i - 1] === right[j - 1] ? dp[i - 1][j - 1] + score : Math.max(dp[i - 1][j], dp[i][j - 1]); return dp[left.length][right.length]; };
      return {
        title: `공통 부분 수열 문자당 ${score}점`,
        description: `left와 right의 최장 공통 부분 수열에서 일치 문자 하나당 ${score}점을 받을 때 최대 점수를 반환하세요.`,
        cases: [['', 'abc'], ['abc', 'abc'], ['abcde', 'ace'], ['frontend', 'friend']],
        solve: lcs,
        referenceSolution: `function solution(left,right){const dp=Array.from({length:left.length+1},()=>Array(right.length+1).fill(0));for(let i=1;i<=left.length;i++)for(let j=1;j<=right.length;j++)dp[i][j]=left[i-1]===right[j-1]?dp[i-1][j-1]+${score}:Math.max(dp[i-1][j],dp[i][j-1]);return dp[left.length][right.length];}`,
        javaBody: `int[][] dp = new int[left.length() + 1][right.length() + 1];\nfor (int i = 1; i <= left.length(); i++) for (int j = 1; j <= right.length(); j++) dp[i][j] = left.charAt(i - 1) == right.charAt(j - 1) ? dp[i - 1][j - 1] + ${score} : Math.max(dp[i - 1][j], dp[i][j - 1]);\nreturn dp[left.length()][right.length()];`,
      };
    },
  },
  {
    key: 'mst-surcharge', category: 'Minimum Spanning Tree', difficulty: 5, minutes: 52,
    args: ['nodeCount', 'edges'], javaArgs: [{ type: 'int', name: 'nodeCount' }, { type: 'int[][]', name: 'edges' }], returnType: 'int', concepts: ['MST', 'Kruskal', 'UnionFind'],
    constraints: ['edges는 무방향 간선 [a, b, cost]입니다.', '연결할 수 없으면 -1을 반환합니다.'],
    make: (variant) => {
      const surcharge = variant;
      const solve = (nodeCount, edges) => { if (nodeCount <= 1) return 0; const parent = range(nodeCount); const find = (node) => { while (parent[node] !== node) { parent[node] = parent[parent[node]]; node = parent[node]; } return node; }; let total = 0; let used = 0; for (const [a, b, cost] of [...edges].sort((x, y) => x[2] - y[2])) { const pa = find(a); const pb = find(b); if (pa === pb) continue; parent[pb] = pa; total += cost + surcharge; if (++used === nodeCount - 1) break; } return used === nodeCount - 1 ? total : -1; };
      return {
        title: `간선 설치비 ${surcharge}가 붙는 MST`,
        description: `모든 정점을 연결할 때 간선마다 기존 cost에 설치비 ${surcharge}가 추가됩니다. 최소 총비용을 반환하세요.`,
        cases: [[0, []], [1, []], [4, [[0,1,1],[1,2,2],[2,3,3],[0,3,10],[0,2,4]]], [3, [[0,1,5]]]],
        solve,
        referenceSolution: `function solution(nodeCount,edges){if(nodeCount<=1)return 0;const parent=Array.from({length:nodeCount},(_,i)=>i);const find=(node)=>{while(parent[node]!==node){parent[node]=parent[parent[node]];node=parent[node];}return node;};let total=0,used=0;for(const [a,b,cost] of [...edges].sort((x,y)=>x[2]-y[2])){const pa=find(a),pb=find(b);if(pa===pb)continue;parent[pb]=pa;total+=cost+${surcharge};if(++used===nodeCount-1)break;}return used===nodeCount-1?total:-1;}`,
        javaBody: `if (nodeCount <= 1) return 0;\nint[] parent = new int[nodeCount]; for (int i = 0; i < nodeCount; i++) parent[i] = i;\nint[][] sorted = edges.clone(); Arrays.sort(sorted, Comparator.comparingInt(edge -> edge[2])); int total = 0, used = 0;\nfor (int[] edge : sorted) { int a=edge[0], b=edge[1]; while(parent[a]!=a){parent[a]=parent[parent[a]];a=parent[a];} while(parent[b]!=b){parent[b]=parent[parent[b]];b=parent[b];} if(a==b)continue; parent[b]=a; total += edge[2] + ${surcharge}; if(++used==nodeCount-1)break; }\nreturn used == nodeCount - 1 ? total : -1;`,
      };
    },
  },
  {
    key: 'kmp-stride', category: '문자열 탐색', difficulty: 5, minutes: 48,
    args: ['text', 'pattern'], javaArgs: [{ type: 'String', name: 'text' }, { type: 'String', name: 'pattern' }], returnType: 'int', concepts: ['KMP', 'PrefixFunction', 'String'],
    constraints: ['text와 pattern의 길이는 각각 100,000 이하입니다.', '빈 pattern은 0을 반환합니다.'],
    make: (variant) => {
      const stride = variant + 1;
      const solve = (text, pattern) => { if (!pattern) return 0; const prefix = Array(pattern.length).fill(0); for (let i = 1, matched = 0; i < pattern.length; i++) { while (matched && pattern[i] !== pattern[matched]) matched = prefix[matched - 1]; if (pattern[i] === pattern[matched]) prefix[i] = ++matched; } let count = 0; for (let i = 0, matched = 0; i < text.length; i++) { while (matched && text[i] !== pattern[matched]) matched = prefix[matched - 1]; if (text[i] === pattern[matched] && ++matched === pattern.length) { const start = i - pattern.length + 1; if (start % stride === 0) count++; matched = prefix[matched - 1]; } } return count; };
      return {
        title: `${stride}의 배수 위치에서 시작하는 패턴`,
        description: `text에서 pattern과 일치하는 부분 중 시작 인덱스가 ${stride}의 배수인 경우의 수를 반환하세요. 겹치는 일치도 셉니다.`,
        cases: [['', 'a'], ['aaaaa', 'aa'], ['abcabcabc', 'abc'], ['abababa', 'aba']],
        solve,
        referenceSolution: `function solution(text,pattern){if(!pattern)return 0;const prefix=Array(pattern.length).fill(0);for(let i=1,matched=0;i<pattern.length;i++){while(matched&&pattern[i]!==pattern[matched])matched=prefix[matched-1];if(pattern[i]===pattern[matched])prefix[i]=++matched;}let count=0;for(let i=0,matched=0;i<text.length;i++){while(matched&&text[i]!==pattern[matched])matched=prefix[matched-1];if(text[i]===pattern[matched]&&++matched===pattern.length){const start=i-pattern.length+1;if(start%${stride}===0)count++;matched=prefix[matched-1];}}return count;}`,
        javaBody: `if (pattern.isEmpty()) return 0;\nint[] prefix = new int[pattern.length()];\nfor (int i=1, matched=0; i<pattern.length(); i++){while(matched>0&&pattern.charAt(i)!=pattern.charAt(matched))matched=prefix[matched-1];if(pattern.charAt(i)==pattern.charAt(matched))prefix[i]=++matched;}\nint count=0;\nfor(int i=0,matched=0;i<text.length();i++){while(matched>0&&text.charAt(i)!=pattern.charAt(matched))matched=prefix[matched-1];if(text.charAt(i)==pattern.charAt(matched)&&++matched==pattern.length()){int start=i-pattern.length()+1;if(start%${stride}==0)count++;matched=prefix[matched-1];}}\nreturn count;`,
      };
    },
  },
  {
    key: 'tsp-fee', category: 'Bitmask DP', difficulty: 5, minutes: 55,
    args: ['costs'], javaArgs: [{ type: 'int[][]', name: 'costs' }], returnType: 'int', concepts: ['DP', 'Bitmask', 'TSP'],
    constraints: ['costs는 완전 그래프의 비용 행렬입니다.', '정점 수는 15 이하입니다.'],
    make: (variant) => {
      const fee = variant;
      const solve = (costs) => { const n = costs.length; if (n <= 1) return 0; const size = 1 << n; const inf = 1e9; const dp = range(size, () => Array(n).fill(inf)); dp[1][0] = 0; for (let mask = 1; mask < size; mask++) for (let node = 0; node < n; node++) if (dp[mask][node] < inf) for (let next = 0; next < n; next++) if (!(mask & (1 << next))) dp[mask | (1 << next)][next] = Math.min(dp[mask | (1 << next)][next], dp[mask][node] + costs[node][next] + fee); let answer = inf; for (let node = 1; node < n; node++) answer = Math.min(answer, dp[size - 1][node] + costs[node][0] + fee); return answer; };
      return {
        title: `이동 수수료 ${fee}가 있는 순회`,
        description: `0번에서 시작해 모든 정점을 한 번씩 방문하고 0번으로 돌아오세요. 이동마다 수수료 ${fee}가 붙을 때 최소 비용을 반환하세요.`,
        cases: [[[]], [[[0]]], [[[0,2,9],[1,0,6],[15,7,0]]], [[[0,10,15,20],[5,0,9,10],[6,13,0,12],[8,8,9,0]]]],
        solve,
        referenceSolution: `function solution(costs){const n=costs.length;if(n<=1)return 0;const size=1<<n,inf=1e9,dp=Array.from({length:size},()=>Array(n).fill(inf));dp[1][0]=0;for(let mask=1;mask<size;mask++)for(let node=0;node<n;node++)if(dp[mask][node]<inf)for(let next=0;next<n;next++)if(!(mask&(1<<next)))dp[mask|(1<<next)][next]=Math.min(dp[mask|(1<<next)][next],dp[mask][node]+costs[node][next]+${fee});let answer=inf;for(let node=1;node<n;node++)answer=Math.min(answer,dp[size-1][node]+costs[node][0]+${fee});return answer;}`,
        javaBody: `int n = costs.length; if (n <= 1) return 0; int size = 1 << n, inf = 1_000_000_000; int[][] dp = new int[size][n]; for (int[] row : dp) Arrays.fill(row, inf); dp[1][0] = 0;\nfor(int mask=1;mask<size;mask++)for(int node=0;node<n;node++)if(dp[mask][node]<inf)for(int next=0;next<n;next++)if((mask&(1<<next))==0)dp[mask|(1<<next)][next]=Math.min(dp[mask|(1<<next)][next],dp[mask][node]+costs[node][next]+${fee});\nint answer=inf;for(int node=1;node<n;node++)answer=Math.min(answer,dp[size-1][node]+costs[node][0]+${fee});return answer;`,
      };
    },
  },
];

const level5Families = [
  {
    key: 'scaled-max-flow', category: 'Maximum Flow', difficulty: 5, minutes: 65,
    args: ['nodeCount', 'edges'], javaArgs: [{ type: 'int', name: 'nodeCount' }, { type: 'int[][]', name: 'edges' }], returnType: 'int', concepts: ['Graph', 'MaxFlow', 'EdmondsKarp'],
    constraints: ['edges는 방향 간선 [from, to, capacity]입니다.', 'source는 0, sink는 마지막 정점입니다.'],
    make: (variant) => {
      const scale = variant + 1;
      const maxFlow = (nodeCount, edges) => { if (nodeCount < 2) return 0; const capacity = range(nodeCount, () => Array(nodeCount).fill(0)); for (const [from, to, value] of edges) capacity[from][to] += value; let total = 0; while (true) { const parent = Array(nodeCount).fill(-1); parent[0] = 0; const queue = [0]; for (let head = 0; head < queue.length && parent[nodeCount - 1] < 0; head++) for (let next = 0; next < nodeCount; next++) if (parent[next] < 0 && capacity[queue[head]][next] > 0) { parent[next] = queue[head]; queue.push(next); } if (parent[nodeCount - 1] < 0) break; let flow = Infinity; for (let node = nodeCount - 1; node !== 0; node = parent[node]) flow = Math.min(flow, capacity[parent[node]][node]); for (let node = nodeCount - 1; node !== 0; node = parent[node]) { capacity[parent[node]][node] -= flow; capacity[node][parent[node]] += flow; } total += flow; } return total * scale; };
      return {
        title: `최대 유량에 ${scale}배 환산`,
        description: `0번 source에서 마지막 sink로 보낼 수 있는 최대 유량을 구한 뒤 ${scale}배 한 값을 반환하세요.`,
        cases: [[0, []], [1, []], [4, [[0,1,3],[0,2,2],[1,2,1],[1,3,2],[2,3,3]]], [3, [[0,1,5],[1,2,4],[0,2,1]]]],
        solve: maxFlow,
        referenceSolution: `function solution(nodeCount,edges){if(nodeCount<2)return 0;const capacity=Array.from({length:nodeCount},()=>Array(nodeCount).fill(0));for(const [from,to,value] of edges)capacity[from][to]+=value;let total=0;while(true){const parent=Array(nodeCount).fill(-1);parent[0]=0;const queue=[0];for(let head=0;head<queue.length&&parent[nodeCount-1]<0;head++)for(let next=0;next<nodeCount;next++)if(parent[next]<0&&capacity[queue[head]][next]>0){parent[next]=queue[head];queue.push(next);}if(parent[nodeCount-1]<0)break;let flow=Infinity;for(let node=nodeCount-1;node!==0;node=parent[node])flow=Math.min(flow,capacity[parent[node]][node]);for(let node=nodeCount-1;node!==0;node=parent[node]){capacity[parent[node]][node]-=flow;capacity[node][parent[node]]+=flow;}total+=flow;}return total*${scale};}`,
        javaBody: `if (nodeCount < 2) return 0; int[][] capacity = new int[nodeCount][nodeCount]; for(int[] edge:edges)capacity[edge[0]][edge[1]]+=edge[2]; int total=0;\nwhile(true){int[] parent=new int[nodeCount];Arrays.fill(parent,-1);parent[0]=0;Deque<Integer> queue=new ArrayDeque<>();queue.add(0);while(!queue.isEmpty()&&parent[nodeCount-1]<0){int node=queue.poll();for(int next=0;next<nodeCount;next++)if(parent[next]<0&&capacity[node][next]>0){parent[next]=node;queue.add(next);}}if(parent[nodeCount-1]<0)break;int flow=Integer.MAX_VALUE;for(int node=nodeCount-1;node!=0;node=parent[node])flow=Math.min(flow,capacity[parent[node]][node]);for(int node=nodeCount-1;node!=0;node=parent[node]){capacity[parent[node]][node]-=flow;capacity[node][parent[node]]+=flow;}total+=flow;}\nreturn total*${scale};`,
      };
    },
  },
  {
    key: 'large-scc', category: 'Strongly Connected Components', difficulty: 5, minutes: 65,
    args: ['nodeCount', 'edges'], javaArgs: [{ type: 'int', name: 'nodeCount' }, { type: 'int[][]', name: 'edges' }], returnType: 'int', concepts: ['Graph', 'SCC', 'Kosaraju'],
    constraints: ['edges는 방향 간선 [from, to]입니다.', '정점 수는 100,000 이하입니다.'],
    make: (variant) => {
      const minimum = variant + 1;
      const solve = (nodeCount, edges) => { const graph = range(nodeCount, () => []); const reverse = range(nodeCount, () => []); for (const [from, to] of edges) { graph[from].push(to); reverse[to].push(from); } const visited = Array(nodeCount).fill(false); const order = []; const dfs = (node) => { visited[node] = true; for (const next of graph[node]) if (!visited[next]) dfs(next); order.push(node); }; for (let node = 0; node < nodeCount; node++) if (!visited[node]) dfs(node); visited.fill(false); let answer = 0; const collect = (node) => { visited[node] = true; let size = 1; for (const next of reverse[node]) if (!visited[next]) size += collect(next); return size; }; while (order.length) { const node = order.pop(); if (!visited[node] && collect(node) >= minimum) answer++; } return answer; };
      return {
        title: `크기 ${minimum} 이상인 SCC 세기`,
        description: `방향 그래프에서 정점 수가 ${minimum} 이상인 강한 연결 요소의 개수를 반환하세요.`,
        cases: [[0, []], [1, []], [5, [[0,1],[1,0],[1,2],[2,3],[3,2],[3,4]]], [4, [[0,1],[1,2],[2,0],[2,3]]]],
        solve,
        referenceSolution: `function solution(nodeCount,edges){const graph=Array.from({length:nodeCount},()=>[]),reverse=Array.from({length:nodeCount},()=>[]);for(const [from,to] of edges){graph[from].push(to);reverse[to].push(from);}const visited=Array(nodeCount).fill(false),order=[];const dfs=node=>{visited[node]=true;for(const next of graph[node])if(!visited[next])dfs(next);order.push(node);};for(let node=0;node<nodeCount;node++)if(!visited[node])dfs(node);visited.fill(false);const collect=node=>{visited[node]=true;let size=1;for(const next of reverse[node])if(!visited[next])size+=collect(next);return size;};let answer=0;while(order.length){const node=order.pop();if(!visited[node]&&collect(node)>=${minimum})answer++;}return answer;}`,
        javaBody: `List<List<Integer>> graph=new ArrayList<>(), reverse=new ArrayList<>();for(int i=0;i<nodeCount;i++){graph.add(new ArrayList<>());reverse.add(new ArrayList<>());}for(int[] edge:edges){graph.get(edge[0]).add(edge[1]);reverse.get(edge[1]).add(edge[0]);}\nboolean[] visited=new boolean[nodeCount];List<Integer> order=new ArrayList<>();\nfor(int start=0;start<nodeCount;start++)if(!visited[start]){Deque<int[]> stack=new ArrayDeque<>();stack.push(new int[]{start,0});visited[start]=true;while(!stack.isEmpty()){int[] top=stack.peek();if(top[1]<graph.get(top[0]).size()){int next=graph.get(top[0]).get(top[1]++);if(!visited[next]){visited[next]=true;stack.push(new int[]{next,0});}}else order.add(stack.pop()[0]);}}\nArrays.fill(visited,false);int answer=0;for(int index=order.size()-1;index>=0;index--){int start=order.get(index);if(visited[start])continue;int size=0;Deque<Integer> stack=new ArrayDeque<>();stack.push(start);visited[start]=true;while(!stack.isEmpty()){int node=stack.pop();size++;for(int next:reverse.get(node))if(!visited[next]){visited[next]=true;stack.push(next);}}if(size>=${minimum})answer++;}\nreturn answer;`,
      };
    },
  },
  {
    key: 'rooted-lca', category: 'Tree · LCA', difficulty: 5, minutes: 60,
    args: ['nodeCount', 'edges', 'queries'], javaArgs: [{ type: 'int', name: 'nodeCount' }, { type: 'int[][]', name: 'edges' }, { type: 'int[][]', name: 'queries' }], returnType: 'int[]', concepts: ['Tree', 'LCA', 'BinaryLifting'],
    constraints: ['edges는 무방향 트리 간선입니다.', 'queries의 각 원소는 [a, b]입니다.'],
    make: (variant) => {
      const root = variant;
      const solve = (nodeCount, edges, queries) => { if (!nodeCount) return []; const graph = range(nodeCount, () => []); for (const [a, b] of edges) { graph[a].push(b); graph[b].push(a); } const parent = Array(nodeCount).fill(-1); const depth = Array(nodeCount).fill(0); const queue = [Math.min(root, nodeCount - 1)]; parent[queue[0]] = queue[0]; for (let head = 0; head < queue.length; head++) for (const next of graph[queue[head]]) if (parent[next] < 0) { parent[next] = queue[head]; depth[next] = depth[queue[head]] + 1; queue.push(next); } return queries.map(([left, right]) => { while (depth[left] > depth[right]) left = parent[left]; while (depth[right] > depth[left]) right = parent[right]; while (left !== right) { left = parent[left]; right = parent[right]; } return left; }); };
      return {
        title: `${root}번을 루트로 한 LCA 질의`,
        description: `정점 ${root}을 루트로 보는 트리에서 각 queries 쌍의 최소 공통 조상을 순서대로 반환하세요.`,
        cases: [[0, [], []], [4, [[0,1],[1,2],[1,3]], [[2,3],[0,2]]], [6, [[0,1],[1,2],[1,3],[3,4],[3,5]], [[4,5],[2,4],[0,5]]], [4, [[0,1],[1,2],[2,3]], [[0,3],[1,3]]]],
        solve,
        referenceSolution: `function solution(nodeCount,edges,queries){if(!nodeCount)return[];const graph=Array.from({length:nodeCount},()=>[]);for(const [a,b] of edges){graph[a].push(b);graph[b].push(a);}const parent=Array(nodeCount).fill(-1),depth=Array(nodeCount).fill(0),queue=[Math.min(${root},nodeCount-1)];parent[queue[0]]=queue[0];for(let head=0;head<queue.length;head++)for(const next of graph[queue[head]])if(parent[next]<0){parent[next]=queue[head];depth[next]=depth[queue[head]]+1;queue.push(next);}return queries.map(([left,right])=>{while(depth[left]>depth[right])left=parent[left];while(depth[right]>depth[left])right=parent[right];while(left!==right){left=parent[left];right=parent[right];}return left;});}`,
        javaBody: `if(nodeCount==0)return new int[0];List<List<Integer>> graph=new ArrayList<>();for(int i=0;i<nodeCount;i++)graph.add(new ArrayList<>());for(int[] edge:edges){graph.get(edge[0]).add(edge[1]);graph.get(edge[1]).add(edge[0]);}int[] parent=new int[nodeCount],depth=new int[nodeCount];Arrays.fill(parent,-1);int start=Math.min(${root},nodeCount-1);Deque<Integer> queue=new ArrayDeque<>();queue.add(start);parent[start]=start;while(!queue.isEmpty()){int node=queue.poll();for(int next:graph.get(node))if(parent[next]<0){parent[next]=node;depth[next]=depth[node]+1;queue.add(next);}}int[] answer=new int[queries.length];for(int i=0;i<queries.length;i++){int left=queries[i][0],right=queries[i][1];while(depth[left]>depth[right])left=parent[left];while(depth[right]>depth[left])right=parent[right];while(left!=right){left=parent[left];right=parent[right];}answer[i]=left;}return answer;`,
      };
    },
  },
  {
    key: 'matrix-power', category: '분할 정복', difficulty: 5, minutes: 65,
    args: ['matrix'], javaArgs: [{ type: 'int[][]', name: 'matrix' }], returnType: 'int[][]', concepts: ['Matrix', 'Exponentiation', 'DivideAndConquer'],
    constraints: ['matrix는 정사각 행렬입니다.', '모든 결과는 1,000으로 나눈 나머지입니다.'],
    make: (variant) => {
      const exponent = variant + 2;
      const solve = (matrix) => { const n = matrix.length; const multiply = (left, right) => range(n, (row) => range(n, (column) => { let sum = 0; for (let k = 0; k < n; k++) sum = (sum + left[row][k] * right[k][column]) % 1000; return sum; })); let result = range(n, (row) => range(n, (column) => row === column ? 1 : 0)); let base = matrix.map((row) => row.map((value) => value % 1000)); let power = exponent; while (power) { if (power & 1) result = multiply(result, base); base = multiply(base, base); power >>= 1; } return result; };
      return {
        title: `행렬의 ${exponent}제곱`,
        description: `정사각 행렬 matrix의 ${exponent}제곱을 구해 각 원소를 1,000으로 나눈 나머지 행렬을 반환하세요.`,
        cases: [[[]], [[[2]]], [[[1,1],[1,0]]], [[[1,2,3],[0,1,4],[5,6,0]]]],
        solve,
        referenceSolution: `function solution(matrix){const n=matrix.length,multiply=(left,right)=>Array.from({length:n},(_,row)=>Array.from({length:n},(_,column)=>{let sum=0;for(let k=0;k<n;k++)sum=(sum+left[row][k]*right[k][column])%1000;return sum;}));let result=Array.from({length:n},(_,row)=>Array.from({length:n},(_,column)=>row===column?1:0)),base=matrix.map(row=>row.map(value=>value%1000)),power=${exponent};while(power){if(power&1)result=multiply(result,base);base=multiply(base,base);power>>=1;}return result;}`,
        javaBody: `int n=matrix.length;int[][] result=new int[n][n],base=new int[n][n];for(int i=0;i<n;i++){result[i][i]=1;for(int j=0;j<n;j++)base[i][j]=matrix[i][j]%1000;}int power=${exponent};while(power>0){if((power&1)==1){int[][] next=new int[n][n];for(int i=0;i<n;i++)for(int j=0;j<n;j++)for(int k=0;k<n;k++)next[i][j]=(next[i][j]+result[i][k]*base[k][j])%1000;result=next;}int[][] squared=new int[n][n];for(int i=0;i<n;i++)for(int j=0;j<n;j++)for(int k=0;k<n;k++)squared[i][j]=(squared[i][j]+base[i][k]*base[k][j])%1000;base=squared;power>>=1;}return result;`,
      };
    },
  },
  {
    key: 'limited-assignment', category: 'Bitmask DP', difficulty: 5, minutes: 65,
    args: ['costs'], javaArgs: [{ type: 'int[][]', name: 'costs' }], returnType: 'int', concepts: ['DP', 'Bitmask', 'Assignment'],
    constraints: ['costs는 정사각 행렬입니다.', '한 사람당 하나의 작업을 서로 다르게 배정합니다.'],
    make: (variant) => {
      const limit = variant + 5;
      const solve = (costs) => { const n = costs.length; const size = 1 << n; const inf = 1e9; const dp = Array(size).fill(inf); dp[0] = 0; for (let mask = 0; mask < size; mask++) { const person = mask.toString(2).replaceAll('0', '').length; if (person >= n || dp[mask] === inf) continue; for (let task = 0; task < n; task++) if (!(mask & (1 << task)) && costs[person][task] <= limit) dp[mask | (1 << task)] = Math.min(dp[mask | (1 << task)], dp[mask] + costs[person][task]); } return dp[size - 1] === inf ? -1 : dp[size - 1]; };
      return {
        title: `비용 ${limit} 이하 작업만 배정`,
        description: `costs[사람][작업]이 ${limit} 이하인 배정만 허용할 때 모든 사람에게 서로 다른 작업을 배정하는 최소 비용을 반환하세요. 불가능하면 -1입니다.`,
        cases: [[[]], [[[1]]], [[[1,limit+1],[limit+1,1]]], [[[4,2,7],[3,6,1],[5,4,3]]]],
        solve,
        referenceSolution: `function solution(costs){const n=costs.length,size=1<<n,inf=1e9,dp=Array(size).fill(inf);dp[0]=0;for(let mask=0;mask<size;mask++){const person=mask.toString(2).replaceAll('0','').length;if(person>=n||dp[mask]===inf)continue;for(let task=0;task<n;task++)if(!(mask&(1<<task))&&costs[person][task]<=${limit})dp[mask|(1<<task)]=Math.min(dp[mask|(1<<task)],dp[mask]+costs[person][task]);}return dp[size-1]===inf?-1:dp[size-1];}`,
        javaBody: `int n=costs.length,size=1<<n,inf=1_000_000_000;int[] dp=new int[size];Arrays.fill(dp,inf);dp[0]=0;for(int mask=0;mask<size;mask++){int person=Integer.bitCount(mask);if(person>=n||dp[mask]==inf)continue;for(int task=0;task<n;task++)if((mask&(1<<task))==0&&costs[person][task]<=${limit})dp[mask|(1<<task)]=Math.min(dp[mask|(1<<task)],dp[mask]+costs[person][task]);}return dp[size-1]==inf?-1:dp[size-1];`,
      };
    },
  },
];

const familiesByLevel = {
  0: level0Families,
  1: level1Families,
  2: level2Families,
  3: level3Families,
  4: level4Families,
  5: level5Families,
};

export function createGeneratedLevelProblems(level, { start = 1, count = problemTargets[level] } = {}) {
  const families = familiesByLevel[level];
  if (!families) throw new Error(`지원하지 않는 생성 레벨입니다: ${level}`);
  return range(count, (index) => buildGeneratedProblem({
    family: families[index % families.length],
    level,
    sequence: start + index,
    variant: Math.floor(index / families.length),
  }));
}

export const generatedTemplateCounts = Object.freeze(Object.fromEntries(
  Object.entries(familiesByLevel).map(([level, families]) => [level, families.length]),
));
