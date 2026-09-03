const defaultReturnByType = {
  int: 'return 0;',
  Integer: 'return null;',
  boolean: 'return false;',
  String: 'return "";',
  'int[]': 'return new int[0];',
  'String[]': 'return new String[0];',
  'Object[]': 'return new Object[0];',
};

const indent = (source, spaces = 4) => source.split('\n').map((line) => `${' '.repeat(spaces)}${line}`).join('\n');

function solutionSource({ args, returnType, body }) {
  const parameters = args.map(({ type, name }) => `${type} ${name}`).join(', ');
  return `import java.util.*;\n\nclass Solution {\n  public static ${returnType} solution(${parameters}) {\n${indent(body)}\n  }\n}`;
}

function javaProblem({ args, returnType, body, algorithmHint, pseudocode }) {
  return {
    javaSpec: { argTypes: args.map((item) => item.type), returnType },
    starterCode: solutionSource({
      args,
      returnType,
      body: `// 여기에 풀이를 작성하세요.\n${defaultReturnByType[returnType]}`,
    }),
    referenceSolution: solutionSource({ args, returnType, body }),
    prerequisites: ['Java 메서드', '기본 타입과 배열', '조건문과 반복문'],
    algorithmHint,
    pseudocode,
  };
}

export const javaLevel0Variants = {
  JS0001: javaProblem({
    args: [{ type: 'int', name: 'signal' }], returnType: 'int',
    body: 'return signal * 2;',
    algorithmHint: 'int 값을 한 번 곱한 뒤 바로 return하면 됩니다.',
    pseudocode: '1. signal에 2를 곱합니다.\n2. 계산한 int 값을 반환합니다.',
  }),
  JS0002: javaProblem({
    args: [{ type: 'int', name: 'a' }, { type: 'int', name: 'b' }], returnType: 'int',
    body: 'int sum = 0;\nfor (int n = Math.min(a, b); n <= Math.max(a, b); n++) {\n  sum += n;\n}\nreturn sum;',
    algorithmHint: 'Math.min과 Math.max로 범위를 정한 뒤 for 문으로 누적해보세요.',
    pseudocode: '1. Math.min과 Math.max로 시작과 끝을 구합니다.\n2. for 문으로 양 끝을 포함해 더합니다.\n3. 합을 반환합니다.',
  }),
  JS0003: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }], returnType: 'int[]',
    body: 'int even = 0;\nint odd = 0;\nfor (int number : numbers) {\n  if (number % 2 == 0) even++;\n  else odd++;\n}\nreturn new int[]{even, odd};',
    algorithmHint: '향상된 for 문으로 int[]를 한 번 순회하고 두 카운터를 갱신하세요.',
    pseudocode: '1. 짝수와 홀수 카운터를 0으로 둡니다.\n2. int[]를 순회하며 나머지에 따라 올립니다.\n3. new int[]{even, odd}를 반환합니다.',
  }),
  JS0004: javaProblem({
    args: [{ type: 'String', name: 'message' }], returnType: 'String',
    body: 'return new StringBuilder(message).reverse().toString();',
    algorithmHint: 'StringBuilder의 reverse와 toString을 연결해보세요.',
    pseudocode: '1. message로 StringBuilder를 만듭니다.\n2. reverse로 순서를 뒤집습니다.\n3. String으로 바꿔 반환합니다.',
  }),
  JS0005: javaProblem({
    args: [{ type: 'String', name: 'text' }], returnType: 'int',
    body: 'String vowels = "aeiou";\nint count = 0;\nfor (char ch : text.toLowerCase().toCharArray()) {\n  if (vowels.indexOf(ch) >= 0) count++;\n}\nreturn count;',
    algorithmHint: '소문자로 바꾼 뒤 toCharArray로 순회하고 indexOf로 모음인지 확인하세요.',
    pseudocode: '1. 모음 문자열을 준비합니다.\n2. 소문자 char 배열을 순회합니다.\n3. indexOf가 -1이 아니면 개수를 올립니다.',
  }),
  JS0006: javaProblem({
    args: [{ type: 'int[]', name: 'temperatures' }], returnType: 'int',
    body: 'if (temperatures.length == 0) return -1;\nint index = 0;\nfor (int i = 1; i < temperatures.length; i++) {\n  if (temperatures[i] > temperatures[index]) index = i;\n}\nreturn index;',
    algorithmHint: 'length가 0인지 먼저 확인하고, 더 큰 값을 만날 때만 인덱스를 바꾸세요.',
    pseudocode: '1. 빈 배열이면 -1을 반환합니다.\n2. 0번 인덱스를 후보로 둡니다.\n3. 더 큰 값에서만 후보를 갱신합니다.',
  }),
  JS0007: javaProblem({
    args: [{ type: 'String[]', name: 'items' }], returnType: 'String[]',
    body: 'Set<String> seen = new HashSet<>();\nList<String> result = new ArrayList<>();\nfor (String item : items) {\n  if (seen.add(item)) result.add(item);\n}\nreturn result.toArray(new String[0]);',
    algorithmHint: 'HashSet.add의 반환값으로 처음 본 값인지 확인하고 ArrayList에 순서대로 담으세요.',
    pseudocode: '1. HashSet과 ArrayList를 만듭니다.\n2. Set에 처음 추가된 값만 List에도 넣습니다.\n3. List를 String[]로 바꿔 반환합니다.',
  }),
  JS0008: javaProblem({
    args: [{ type: 'String[]', name: 'notifications' }], returnType: 'String',
    body: 'Map<String, Integer> counts = new HashMap<>();\nfor (String name : notifications) {\n  counts.put(name, counts.getOrDefault(name, 0) + 1);\n}\nString answer = "";\nint best = 0;\nfor (String name : notifications) {\n  int count = counts.get(name);\n  if (count > best) {\n    best = count;\n    answer = name;\n  }\n}\nreturn answer;',
    algorithmHint: 'HashMap.getOrDefault로 빈도를 센 뒤 원래 배열 순서대로 최대값을 비교하세요.',
    pseudocode: '1. HashMap에 최종 빈도를 저장합니다.\n2. 원래 배열을 앞에서부터 순회합니다.\n3. 최대 빈도를 넘을 때만 답을 바꿉니다.',
  }),
  JS0009: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }], returnType: 'int[]',
    body: 'int[] sorted = numbers.clone();\nArrays.sort(sorted);\nreturn sorted;',
    algorithmHint: 'clone으로 원본과 분리한 뒤 Arrays.sort를 사용하세요.',
    pseudocode: '1. numbers.clone()으로 복사합니다.\n2. Arrays.sort로 오름차순 정렬합니다.\n3. 복사본을 반환합니다.',
  }),
  JS0010: javaProblem({
    args: [{ type: 'int', name: 'number' }], returnType: 'int',
    body: 'int count = 0;\nfor (char ch : String.valueOf(number).toCharArray()) {\n  if ("369".indexOf(ch) >= 0) count++;\n}\nreturn count;',
    algorithmHint: 'String.valueOf로 숫자를 문자열로 바꾸면 각 자릿수를 char로 확인할 수 있어요.',
    pseudocode: '1. number를 String으로 바꿉니다.\n2. char를 순회하며 3, 6, 9인지 확인합니다.\n3. 개수를 반환합니다.',
  }),
  JS0011: javaProblem({
    args: [{ type: 'int[]', name: 'scores' }], returnType: 'int',
    body: 'if (scores.length == 0) return 0;\nint sum = 0;\nfor (int score : scores) sum += score;\nreturn (int) Math.floor((double) sum / scores.length);',
    algorithmHint: '합을 구한 뒤 double로 나누고 Math.floor의 결과를 int로 변환하세요.',
    pseudocode: '1. 빈 배열이면 0을 반환합니다.\n2. 점수 합을 구합니다.\n3. double 평균을 내림해 int로 반환합니다.',
  }),
  JS0012: javaProblem({
    args: [{ type: 'String', name: 'text' }, { type: 'int', name: 'size' }], returnType: 'String[]',
    body: 'List<String> parts = new ArrayList<>();\nfor (int start = 0; start < text.length(); start += size) {\n  parts.add(text.substring(start, Math.min(start + size, text.length())));\n}\nreturn parts.toArray(new String[0]);',
    algorithmHint: 'substring의 끝 인덱스를 Math.min으로 문자열 길이 안에 맞추세요.',
    pseudocode: '1. 빈 ArrayList를 만듭니다.\n2. start를 size씩 옮기며 substring을 추가합니다.\n3. String[]로 바꿔 반환합니다.',
  }),
  JS0013: javaProblem({
    args: [{ type: 'Object[]', name: 'values' }, { type: 'int', name: 'steps' }], returnType: 'Object[]',
    body: 'if (values.length == 0) return new Object[0];\nint move = steps % values.length;\nObject[] result = new Object[values.length];\nfor (int i = 0; i < values.length; i++) {\n  result[(i + move) % values.length] = values[i];\n}\nreturn result;',
    algorithmHint: '숫자와 문자열 배열을 모두 받도록 Object[]를 사용하고 새 위치를 나머지 연산으로 계산하세요.',
    pseudocode: '1. 빈 배열이면 빈 Object[]를 반환합니다.\n2. 실제 이동량을 길이로 나눈 나머지로 구합니다.\n3. 각 값을 새 인덱스에 넣습니다.',
  }),
  JS0014: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }], returnType: 'int',
    body: 'Set<Integer> seen = new HashSet<>();\nfor (int number : numbers) seen.add(number);\nint sum = 0;\nfor (int number = 0; number <= 9; number++) {\n  if (!seen.contains(number)) sum += number;\n}\nreturn sum;',
    algorithmHint: 'HashSet<Integer>에 입력을 저장하고 0부터 9까지 contains로 확인하세요.',
    pseudocode: '1. 입력 숫자를 HashSet에 담습니다.\n2. 0부터 9까지 순회합니다.\n3. Set에 없는 숫자만 더합니다.',
  }),
  JS0015: javaProblem({
    args: [{ type: 'String[]', name: 'words' }], returnType: 'String',
    body: 'if (words.length == 0) return "";\nString first = words[0];\nint index = 0;\nwhile (index < first.length()) {\n  char expected = first.charAt(index);\n  for (String word : words) {\n    if (index >= word.length() || word.charAt(index) != expected) {\n      return first.substring(0, index);\n    }\n  }\n  index++;\n}\nreturn first;',
    algorithmHint: '첫 문자열의 charAt(index)를 모든 단어와 비교하고 다르면 substring으로 끝내세요.',
    pseudocode: '1. 첫 문자열을 기준으로 둡니다.\n2. 같은 인덱스의 문자를 모든 단어에서 비교합니다.\n3. 처음 다른 위치 전까지 substring을 반환합니다.',
  }),
  JS0016: javaProblem({
    args: [{ type: 'String', name: 'text' }], returnType: 'String',
    body: 'if (text.isEmpty()) return "";\nStringBuilder result = new StringBuilder();\nchar current = text.charAt(0);\nint count = 1;\nfor (int i = 1; i < text.length(); i++) {\n  if (text.charAt(i) == current) count++;\n  else {\n    result.append(current).append(count);\n    current = text.charAt(i);\n    count = 1;\n  }\n}\nreturn result.append(current).append(count).toString();',
    algorithmHint: 'StringBuilder에 구간이 끝날 때마다 문자와 개수를 append하세요.',
    pseudocode: '1. 첫 문자와 횟수 1로 시작합니다.\n2. 문자가 바뀌면 StringBuilder에 이전 구간을 기록합니다.\n3. 마지막 구간을 기록해 반환합니다.',
  }),
  JS0017: javaProblem({
    args: [{ type: 'String', name: 'brackets' }], returnType: 'boolean',
    body: 'int depth = 0;\nfor (char ch : brackets.toCharArray()) {\n  depth += ch == \'(\' ? 1 : -1;\n  if (depth < 0) return false;\n}\nreturn depth == 0;',
    algorithmHint: 'char 비교에는 작은따옴표를 사용하고 깊이가 음수가 되는 즉시 false를 반환하세요.',
    pseudocode: '1. 열린 괄호 수를 0으로 둡니다.\n2. char에 따라 1을 더하거나 뺍니다.\n3. 중간에 음수면 실패, 끝에서 0이면 성공입니다.',
  }),
  JS0018: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }, { type: 'int', name: 'target' }], returnType: 'Integer',
    body: 'if (numbers.length == 0) return null;\nint best = numbers[0];\nfor (int number : numbers) {\n  int distance = Math.abs(number - target);\n  int bestDistance = Math.abs(best - target);\n  if (distance < bestDistance || (distance == bestDistance && number < best)) best = number;\n}\nreturn best;',
    algorithmHint: '빈 배열에서 null을 반환하려면 반환 타입을 Integer로 두어야 합니다.',
    pseudocode: '1. 빈 배열이면 null을 반환합니다.\n2. 첫 값을 후보로 두고 Math.abs 거리로 비교합니다.\n3. 거리와 동률 규칙을 적용해 반환합니다.',
  }),
  JS0019: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }], returnType: 'int',
    body: 'if (numbers.length == 0) return -1;\nMap<Integer, Integer> counts = new HashMap<>();\nfor (int number : numbers) counts.put(number, counts.getOrDefault(number, 0) + 1);\nint answer = -1;\nint best = 0;\nboolean duplicate = false;\nfor (Map.Entry<Integer, Integer> entry : counts.entrySet()) {\n  if (entry.getValue() > best) {\n    best = entry.getValue();\n    answer = entry.getKey();\n    duplicate = false;\n  } else if (entry.getValue() == best) duplicate = true;\n}\nreturn duplicate ? -1 : answer;',
    algorithmHint: 'HashMap의 빈도를 순회하며 최대 빈도 값이 두 개인지도 함께 기록하세요.',
    pseudocode: '1. HashMap에 값별 빈도를 셉니다.\n2. 최대 빈도와 후보를 갱신합니다.\n3. 최대 빈도가 중복이면 -1을 반환합니다.',
  }),
  JS0020: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }], returnType: 'int',
    body: 'int count = 0;\nfor (int number : numbers) {\n  if (number < 2) continue;\n  boolean prime = true;\n  for (int divisor = 2; divisor * divisor <= number; divisor++) {\n    if (number % divisor == 0) {\n      prime = false;\n      break;\n    }\n  }\n  if (prime) count++;\n}\nreturn count;',
    algorithmHint: 'divisor * divisor <= number까지만 확인하고 나누어떨어지면 즉시 중단하세요.',
    pseudocode: '1. 2 미만은 건너뜁니다.\n2. 제곱근 범위의 약수를 for 문으로 검사합니다.\n3. 약수가 없던 값의 개수를 셉니다.',
  }),
  JS0021: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }], returnType: 'int',
    body: 'if (numbers.length == 0) return 0;\nint current = 1;\nint best = 1;\nfor (int i = 1; i < numbers.length; i++) {\n  current = numbers[i] > numbers[i - 1] ? current + 1 : 1;\n  best = Math.max(best, current);\n}\nreturn best;',
    algorithmHint: '바로 앞 값과만 비교하며 current와 best를 갱신하면 됩니다.',
    pseudocode: '1. 빈 배열이면 0을 반환합니다.\n2. 현재와 최대 길이를 1로 둡니다.\n3. 증가하면 늘리고 아니면 현재 길이를 1로 되돌립니다.',
  }),
  JS0022: javaProblem({
    args: [{ type: 'int[][]', name: 'matrix' }], returnType: 'int',
    body: 'int sum = 0;\nfor (int i = 0; i < matrix.length; i++) {\n  sum += matrix[i][i];\n}\nreturn sum;',
    algorithmHint: '2차원 int 배열에서 matrix[i][i]만 더하세요.',
    pseudocode: '1. 합을 0으로 둡니다.\n2. 행 인덱스 i를 순회합니다.\n3. matrix[i][i]를 더해 반환합니다.',
  }),
  JS0023: javaProblem({
    args: [{ type: 'String', name: 'name' }], returnType: 'String',
    body: 'StringBuilder result = new StringBuilder();\nfor (char ch : name.toCharArray()) {\n  if (Character.isUpperCase(ch)) {\n    result.append(\'_\').append(Character.toLowerCase(ch));\n  } else result.append(ch);\n}\nreturn result.toString();',
    algorithmHint: 'Character.isUpperCase와 Character.toLowerCase를 StringBuilder와 함께 사용하세요.',
    pseudocode: '1. StringBuilder를 만듭니다.\n2. 대문자 앞에는 밑줄을 넣고 소문자로 바꿉니다.\n3. 완성된 String을 반환합니다.',
  }),
  JS0024: javaProblem({
    args: [{ type: 'int[]', name: 'costs' }, { type: 'int', name: 'budget' }], returnType: 'int',
    body: 'int[] sorted = costs.clone();\nArrays.sort(sorted);\nint used = 0;\nint count = 0;\nfor (int cost : sorted) {\n  if (used + cost > budget) break;\n  used += cost;\n  count++;\n}\nreturn count;',
    algorithmHint: 'costs.clone()을 Arrays.sort한 뒤 싼 항목부터 누적하세요.',
    pseudocode: '1. 비용 배열을 복사해 Arrays.sort합니다.\n2. 싼 비용부터 예산 안에서 누적합니다.\n3. 고른 개수를 반환합니다.',
  }),
  JS0025: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }, { type: 'int', name: 'target' }], returnType: 'boolean',
    body: 'Set<Integer> seen = new HashSet<>();\nfor (int number : numbers) {\n  if (seen.contains(target - number)) return true;\n  seen.add(number);\n}\nreturn false;',
    algorithmHint: 'HashSet<Integer>에서 target - number를 먼저 찾은 뒤 현재 값을 추가하세요.',
    pseudocode: '1. 빈 HashSet을 만듭니다.\n2. 보수 값이 Set에 있는지 확인합니다.\n3. 있으면 true, 없으면 현재 값을 넣고 계속합니다.',
  }),
  JS0026: javaProblem({
    args: [{ type: 'String', name: 'left' }, { type: 'String', name: 'right' }], returnType: 'boolean',
    body: 'if (left.length() != right.length()) return false;\nMap<Character, Integer> counts = new HashMap<>();\nfor (char ch : left.toCharArray()) counts.put(ch, counts.getOrDefault(ch, 0) + 1);\nfor (char ch : right.toCharArray()) {\n  int count = counts.getOrDefault(ch, 0);\n  if (count == 0) return false;\n  counts.put(ch, count - 1);\n}\nreturn true;',
    algorithmHint: 'HashMap<Character, Integer>에서 왼쪽은 올리고 오른쪽은 내리세요.',
    pseudocode: '1. 길이가 다르면 false입니다.\n2. left의 char 빈도를 HashMap에 저장합니다.\n3. right에서 차감하다 부족하면 false를 반환합니다.',
  }),
  JS0027: javaProblem({
    args: [{ type: 'int[]', name: 'numbers' }, { type: 'int', name: 'size' }], returnType: 'Integer',
    body: 'if (size < 1 || size > numbers.length) return null;\nint sum = 0;\nfor (int i = 0; i < size; i++) sum += numbers[i];\nint best = sum;\nfor (int i = size; i < numbers.length; i++) {\n  sum += numbers[i] - numbers[i - size];\n  best = Math.max(best, sum);\n}\nreturn best;',
    algorithmHint: '유효하지 않은 크기에는 null이 필요하므로 반환 타입은 Integer입니다.',
    pseudocode: '1. size를 검사하고 잘못되면 null을 반환합니다.\n2. 첫 구간 합을 만듭니다.\n3. 빠지는 값과 들어오는 값만 반영하며 최대를 갱신합니다.',
  }),
  JS0028: javaProblem({
    args: [{ type: 'int', name: 'x' }, { type: 'int', name: 'y' }], returnType: 'String',
    body: 'if (x == 0 && y == 0) return "ORIGIN";\nif (x == 0 || y == 0) return "AXIS";\nif (x > 0) return y > 0 ? "Q1" : "Q4";\nreturn y > 0 ? "Q2" : "Q3";',
    algorithmHint: 'String 리터럴은 큰따옴표를 쓰고 원점과 축을 먼저 return하세요.',
    pseudocode: '1. 두 값이 0이면 ORIGIN입니다.\n2. 하나가 0이면 AXIS입니다.\n3. 부호 조합에 맞는 String을 반환합니다.',
  }),
  JS0029: javaProblem({
    args: [{ type: 'int[]', name: 'scores' }], returnType: 'int[]',
    body: 'int[] sorted = scores.clone();\nArrays.sort(sorted);\nMap<Integer, Integer> ranks = new HashMap<>();\nfor (int i = 0; i < sorted.length; i++) {\n  int score = sorted[sorted.length - 1 - i];\n  ranks.putIfAbsent(score, i + 1);\n}\nint[] result = new int[scores.length];\nfor (int i = 0; i < scores.length; i++) result[i] = ranks.get(scores[i]);\nreturn result;',
    algorithmHint: '정렬한 배열을 뒤에서부터 읽고 putIfAbsent로 첫 순위만 저장하세요.',
    pseudocode: '1. 점수를 복사해 오름차순 정렬합니다.\n2. 뒤에서부터 읽어 고유 점수의 첫 순위를 저장합니다.\n3. 원래 점수를 순위 int[]로 바꿉니다.',
  }),
  JS0030: javaProblem({
    args: [{ type: 'String[]', name: 'commands' }], returnType: 'int[]',
    body: 'List<Integer> queue = new ArrayList<>();\nList<Integer> output = new ArrayList<>();\nint head = 0;\nfor (String command : commands) {\n  if (command.startsWith("PUSH ")) {\n    queue.add(Integer.parseInt(command.substring(5)));\n  } else if (command.equals("POP")) {\n    output.add(head < queue.size() ? queue.get(head++) : -1);\n  }\n}\nint[] result = new int[output.size()];\nfor (int i = 0; i < output.size(); i++) result[i] = output.get(i);\nreturn result;',
    algorithmHint: 'ArrayList를 큐로 쓰되 앞을 지우지 말고 head 인덱스를 올리세요.',
    pseudocode: '1. 큐 List, 결과 List, head를 준비합니다.\n2. PUSH는 add하고 POP은 head 위치를 읽습니다.\n3. 결과를 int[]로 바꿔 반환합니다.',
  }),
};
