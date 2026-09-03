import { createProblem } from '../problemFactory.js';
import { javaLevel0Variants } from '../java/level0.js';

const definitions = [
  {
    id: 'JS0001', title: '신호 두 배로 키우기', difficulty: 1, category: '숫자 연산', args: ['signal'], concepts: ['Number', 'Arithmetic'],
    description: '센서가 읽은 정수 signal을 두 배로 보정한 값을 반환하세요.', constraints: ['-1,000 ≤ signal ≤ 1,000', '입력은 정수입니다.'],
    publicTests: [{ args: [7], expected: 14 }, { args: [-4], expected: -8 }], hiddenTests: [{ args: [0], expected: 0, label: '경계값', guidance: '0을 별도로 잘못 처리하지 않았는지 확인해보세요.' }, { args: [1000], expected: 2000, label: '큰 값', guidance: '입력 범위의 끝에서도 같은 연산이 적용되어야 해요.' }],
    observation: '입력 하나를 결과 하나로 바꾸는 데 반복문이 정말 필요할까요?', algorithmHint: '하나의 산술 연산만으로 표현할 수 있어요.', pseudocode: '1. signal에 2를 곱합니다.\n2. 계산한 값을 반환합니다.', commonMistakes: ['문자열 "2"를 이어 붙임', 'return을 빠뜨림'], explanation: '숫자 입력에 곱셈 연산자를 적용하면 됩니다.', referenceSolution: 'function solution(signal) { return signal * 2; }',
  },
  {
    id: 'JS0002', title: '사이 숫자의 합', difficulty: 1, category: '반복문', args: ['a', 'b'], concepts: ['Loop', 'MinMax'],
    description: '두 정수 a와 b 사이의 모든 정수(양 끝 포함)를 더한 값을 반환하세요. a가 b보다 클 수도 있습니다.', constraints: ['-100 ≤ a, b ≤ 100'],
    publicTests: [{ args: [3, 6], expected: 18 }, { args: [5, 2], expected: 14 }], hiddenTests: [{ args: [-2, 2], expected: 0, label: '음수 포함', guidance: '음수에서 양수로 넘어갈 때의 합을 확인해보세요.' }, { args: [4, 4], expected: 4, label: '같은 값', guidance: '두 끝점이 같을 때도 한 번은 더해야 해요.' }],
    observation: 'a와 b 중 어느 값부터 시작해야 순회 방향을 하나로 만들 수 있을까요?', algorithmHint: 'Math.min과 Math.max로 시작점과 끝점을 정해보세요.', pseudocode: '1. 작은 값과 큰 값을 구합니다.\n2. 작은 값부터 큰 값까지 순회하며 누적합니다.\n3. 합을 반환합니다.', commonMistakes: ['큰 입력에서 작은 입력으로 순회하지 못함', '끝값을 합에서 제외함'], explanation: '양 끝의 순서와 무관하게 범위를 정규화한 뒤 누적합니다.', referenceSolution: 'function solution(a, b) { let sum = 0; for (let n = Math.min(a,b); n <= Math.max(a,b); n++) sum += n; return sum; }',
  },
  {
    id: 'JS0003', title: '짝수와 홀수의 기록', difficulty: 1, category: '배열', args: ['numbers'], concepts: ['Array', 'Counting', 'Modulo'],
    description: '정수 배열에서 짝수 개수와 홀수 개수를 [짝수, 홀수] 순서로 반환하세요.', constraints: ['0 ≤ numbers.length ≤ 1,000', '각 원소는 정수입니다.'],
    publicTests: [{ args: [[1, 2, 3, 4, 8]], expected: [3, 2] }, { args: [[0, -1, -2]], expected: [2, 1] }], hiddenTests: [{ args: [[]], expected: [0, 0], label: '빈 배열', guidance: '아무 값도 없을 때 초기 결과가 그대로 반환되는지 보세요.' }, { args: [[2, 2, 2]], expected: [3, 0], label: '한 종류만 존재', guidance: '홀수가 하나도 없는 경우도 표현해야 해요.' }],
    observation: '각 숫자를 2로 나눈 나머지는 어떤 두 경우로 나뉘나요?', algorithmHint: '두 개의 카운터를 두고 한 번만 순회해보세요.', pseudocode: '1. 짝수와 홀수 카운터를 0으로 둡니다.\n2. 배열을 순회하며 나머지에 따라 카운터를 올립니다.\n3. 두 카운터를 배열로 반환합니다.', commonMistakes: ['0을 홀수로 처리함', '음수의 나머지를 1과만 비교함'], explanation: '2로 나누어떨어지는 값은 부호와 관계없이 짝수입니다.', referenceSolution: 'function solution(numbers) { let even=0, odd=0; for (const n of numbers) n % 2 === 0 ? even++ : odd++; return [even, odd]; }',
  },
  {
    id: 'JS0004', title: '거꾸로 읽는 메시지', difficulty: 1, category: '문자열', args: ['message'], concepts: ['String', 'ArrayMethods'],
    description: '문자열의 문자 순서를 뒤집어 반환하세요. 공백과 기호도 문자로 취급합니다.', constraints: ['0 ≤ message.length ≤ 1,000'],
    publicTests: [{ args: ['frontend'], expected: 'dnetnorf' }, { args: ['a b!'], expected: '!b a' }], hiddenTests: [{ args: [''], expected: '', label: '빈 문자열', guidance: '문자가 없어도 오류 없이 빈 문자열을 반환해야 해요.' }, { args: ['가나다'], expected: '다나가', label: '한글', guidance: '영문에만 의존한 로직인지 확인해보세요.' }],
    observation: '문자열은 직접 수정할 수 없는데, 순서를 바꾸기 쉬운 형태는 무엇일까요?', algorithmHint: 'Array.from, reverse, join의 역할을 이어서 생각해보세요.', pseudocode: '1. 문자열을 문자 배열로 만듭니다.\n2. 배열 순서를 뒤집습니다.\n3. 다시 문자열로 합칩니다.', commonMistakes: ['split 뒤 join을 하지 않음', '원본 문자열을 인덱스로 수정하려 함'], explanation: '문자열을 문자 배열로 변환하면 배열의 reverse를 사용할 수 있습니다.', referenceSolution: "function solution(message) { return Array.from(message).reverse().join(''); }",
  },
  {
    id: 'JS0005', title: '모음 센서', difficulty: 1, category: '문자열', args: ['text'], concepts: ['String', 'Set', 'Counting'],
    description: '영문 문자열에서 a, e, i, o, u의 개수를 대소문자 구분 없이 반환하세요.', constraints: ['0 ≤ text.length ≤ 2,000', '영문자와 공백으로 이루어집니다.'],
    publicTests: [{ args: ['Interface'], expected: 4 }, { args: ['sky rhythm'], expected: 0 }], hiddenTests: [{ args: ['AEIOU'], expected: 5, label: '대문자', guidance: '입력의 대소문자를 한쪽으로 맞췄나요?' }, { args: [''], expected: 0, label: '빈 문자열', guidance: '초기 카운터가 그대로 반환되어야 해요.' }],
    observation: '매 문자마다 다섯 번 비교하는 대신 포함 여부를 표현할 수 있을까요?', algorithmHint: '모음 문자열의 includes 또는 Set을 사용할 수 있어요.', pseudocode: '1. 비교할 모음 집합을 준비합니다.\n2. 소문자로 바꾼 문자열을 순회합니다.\n3. 집합에 있으면 개수를 올립니다.', commonMistakes: ['대문자를 세지 않음', 'y를 모음으로 처리함'], explanation: '입력을 소문자로 정규화하면 한 종류의 비교만 필요합니다.', referenceSolution: "function solution(text) { const vowels = new Set('aeiou'); let count=0; for (const ch of text.toLowerCase()) if (vowels.has(ch)) count++; return count; }",
  },
  {
    id: 'JS0006', title: '최고 온도의 위치', difficulty: 1, category: '배열', args: ['temperatures'], concepts: ['Array', 'Index', 'MinMax'],
    description: '배열에서 가장 큰 값이 처음 등장하는 인덱스를 반환하세요. 빈 배열이면 -1을 반환합니다.', constraints: ['0 ≤ temperatures.length ≤ 1,000'],
    publicTests: [{ args: [[18, 22, 21, 22]], expected: 1 }, { args: [[-5, -2, -9]], expected: 1 }], hiddenTests: [{ args: [[]], expected: -1, label: '빈 배열', guidance: '첫 원소를 읽기 전에 배열 길이를 확인해보세요.' }, { args: [[7]], expected: 0, label: '원소 하나', guidance: '첫 인덱스는 0입니다.' }],
    observation: '최댓값만이 아니라 그 값이 발견된 위치도 함께 기억해야 하지 않을까요?', algorithmHint: '현재 최댓값과 인덱스를 한 쌍으로 갱신하세요. 같은 값일 때는 갱신하지 않습니다.', pseudocode: '1. 빈 배열이면 -1을 반환합니다.\n2. 첫 값을 최댓값으로 둡니다.\n3. 더 큰 값을 만날 때만 값과 위치를 갱신합니다.', commonMistakes: ['같은 최댓값에서 마지막 위치로 갱신함', '음수 배열의 최댓값을 0으로 시작함'], explanation: '첫 원소로 초기화하면 음수 입력도 안전하며, 엄격한 큰 값 비교로 첫 위치를 유지합니다.', referenceSolution: 'function solution(temperatures) { if (!temperatures.length) return -1; let index=0; for (let i=1;i<temperatures.length;i++) if (temperatures[i] > temperatures[index]) index=i; return index; }',
  },
  {
    id: 'JS0007', title: '첫 등장만 남기기', difficulty: 2, category: 'Set', args: ['items'], concepts: ['Array', 'Set', 'Order'],
    description: '문자열 배열에서 중복을 제거하되 처음 등장한 순서를 유지해 반환하세요.', constraints: ['0 ≤ items.length ≤ 2,000'],
    publicTests: [{ args: [['js', 'css', 'js', 'html']], expected: ['js', 'css', 'html'] }, { args: [['a', 'a', 'a']], expected: ['a'] }], hiddenTests: [{ args: [[]], expected: [], label: '빈 배열', guidance: '초기 결과가 빈 배열이어야 해요.' }, { args: [['A', 'a', 'A']], expected: ['A', 'a'], label: '대소문자', guidance: '문자열 비교는 대소문자를 구분합니다.' }],
    observation: '이미 결과에 넣은 값인지 빠르게 기억할 자료구조가 있을까요?', algorithmHint: 'Set은 삽입 순서를 유지하며 포함 여부를 빠르게 확인할 수 있어요.', pseudocode: '1. 빈 Set과 결과 배열을 만듭니다.\n2. 처음 보는 값만 Set과 결과에 추가합니다.\n3. 결과를 반환합니다.', commonMistakes: ['정렬해서 원래 순서를 잃음', '대소문자를 임의로 합침'], explanation: 'Set으로 방문 여부를 기록하면서 결과 배열을 별도로 만들면 순서를 보존합니다.', referenceSolution: 'function solution(items) { return [...new Set(items)]; }',
  },
  {
    id: 'JS0008', title: '가장 자주 온 알림', difficulty: 2, category: 'Map', args: ['notifications'], concepts: ['Map', 'Counting', 'String'],
    description: '알림 이름 배열에서 가장 자주 등장한 이름을 반환하세요. 동률이면 먼저 등장한 이름을 반환하고, 빈 배열이면 빈 문자열을 반환합니다.', constraints: ['0 ≤ notifications.length ≤ 2,000'],
    publicTests: [{ args: [['build', 'mail', 'build', 'chat']], expected: 'build' }, { args: [['a', 'b', 'b', 'a']], expected: 'a' }], hiddenTests: [{ args: [[]], expected: '', label: '빈 배열', guidance: '반환할 후보가 없을 때의 값을 확인해보세요.' }, { args: [['only']], expected: 'only', label: '원소 하나', guidance: '한 번 등장한 값도 최빈값입니다.' }],
    observation: '각 이름의 최종 등장 횟수를 어디에 저장하고, 동률일 때 첫 등장은 어떻게 보존할까요?', algorithmHint: 'Map으로 전체 빈도를 만든 뒤 원래 배열 순서대로 최대 빈도를 비교하세요.', pseudocode: '1. Map에 이름별 최종 횟수를 저장합니다.\n2. 원래 배열을 앞에서부터 확인합니다.\n3. 최대 횟수를 넘을 때만 답을 갱신합니다.', commonMistakes: ['중간 빈도만 보고 동률에서 나중 값으로 바꿈', '객체 키의 특수값을 고려하지 않음'], explanation: '최종 빈도표를 먼저 만들고 원래 등장 순서로 비교하면 동률 시 첫 등장을 정확히 유지합니다.', referenceSolution: "function solution(notifications) { const counts=new Map(); for (const name of notifications) counts.set(name,(counts.get(name)||0)+1); let answer='', best=0; for (const name of notifications) { const count=counts.get(name); if (count>best) { best=count; answer=name; } } return answer; }",
  },
  {
    id: 'JS0009', title: '작은 수부터 정렬', difficulty: 1, category: '정렬', args: ['numbers'], concepts: ['Sort', 'Comparator', 'Array'],
    description: '숫자 배열을 오름차순으로 정렬한 새 배열을 반환하세요. 원본 배열은 바꾸지 마세요.', constraints: ['0 ≤ numbers.length ≤ 2,000'],
    publicTests: [{ args: [[10, 2, 31, 4]], expected: [2, 4, 10, 31] }, { args: [[-1, -10, 0]], expected: [-10, -1, 0] }], hiddenTests: [{ args: [[]], expected: [], label: '빈 배열', guidance: '빈 입력도 새 배열로 반환할 수 있어요.' }, { args: [[3, 3, 1]], expected: [1, 3, 3], label: '중복값', guidance: '같은 값이 사라지지 않아야 해요.' }],
    observation: 'JavaScript의 기본 sort가 숫자 10과 2를 어떤 순서로 비교하는지 떠올려보세요.', algorithmHint: '숫자 오름차순 comparator는 두 값의 차이를 반환할 수 있어요.', pseudocode: '1. spread나 slice로 배열을 복사합니다.\n2. (a, b) => a - b로 정렬합니다.\n3. 복사본을 반환합니다.', commonMistakes: ['기본 sort를 사용함', '원본 배열을 직접 정렬함'], explanation: 'sort는 기본적으로 문자열 순서를 사용하고 원본을 바꾸므로 복사와 숫자 comparator가 모두 필요합니다.', referenceSolution: 'function solution(numbers) { return [...numbers].sort((a,b) => a-b); }',
  },
  {
    id: 'JS0010', title: '박수 숫자 세기', difficulty: 2, category: '문자열', args: ['number'], concepts: ['String', 'Counting', 'Includes'],
    description: '0 이상의 정수에서 숫자 3, 6, 9가 등장한 횟수를 반환하세요.', constraints: ['0 ≤ number ≤ 1,000,000,000'],
    publicTests: [{ args: [33906], expected: 4 }, { args: [125], expected: 0 }], hiddenTests: [{ args: [0], expected: 0, label: '0', guidance: '0은 박수 숫자가 아닙니다.' }, { args: [999999], expected: 6, label: '반복 숫자', guidance: '같은 숫자의 모든 등장을 세어야 해요.' }],
    observation: '각 자릿수를 숫자 계산 대신 문자로 보면 어떤 점이 쉬워질까요?', algorithmHint: '숫자를 문자열로 바꾸고 각 문자가 후보 집합에 있는지 확인하세요.', pseudocode: '1. number를 문자열로 바꿉니다.\n2. 각 문자가 3, 6, 9인지 확인합니다.\n3. 해당 횟수를 반환합니다.', commonMistakes: ['숫자 전체가 3의 배수인지 확인함', '중복 등장을 한 번만 셈'], explanation: '자릿수 자체를 검사하는 문제는 문자열 변환으로 단순하게 처리할 수 있습니다.', referenceSolution: "function solution(number) { let count=0; for (const ch of String(number)) if ('369'.includes(ch)) count++; return count; }",
  },
  {
    id: 'JS0011', title: '평균 아래 정수', difficulty: 1, category: '배열', args: ['scores'], concepts: ['Reduce', 'Math', 'Array'],
    description: '점수 배열의 산술평균을 구한 뒤 소수점 아래를 버린 정수를 반환하세요. 빈 배열은 0을 반환합니다.', constraints: ['0 ≤ scores.length ≤ 1,000', '0 ≤ score ≤ 100'],
    publicTests: [{ args: [[80, 90, 70]], expected: 80 }, { args: [[1, 2]], expected: 1 }], hiddenTests: [{ args: [[]], expected: 0, label: '빈 배열', guidance: '0으로 나누기 전에 길이를 확인하세요.' }, { args: [[100]], expected: 100, label: '원소 하나', guidance: '원소 하나의 평균은 그 값입니다.' }],
    observation: '평균을 구하려면 순회 중 어떤 하나의 값만 누적하면 될까요?', algorithmHint: '합을 길이로 나눈 뒤 Math.floor를 적용하세요.', pseudocode: '1. 빈 배열이면 0을 반환합니다.\n2. 모든 점수를 합합니다.\n3. 길이로 나눈 값을 내림합니다.', commonMistakes: ['빈 배열에서 NaN을 반환함', 'Math.round를 사용함'], explanation: '합계와 개수로 평균을 만들고 요구한 내림 규칙을 적용합니다.', referenceSolution: 'function solution(scores) { if (!scores.length) return 0; return Math.floor(scores.reduce((sum,n)=>sum+n,0)/scores.length); }',
  },
  {
    id: 'JS0012', title: '메시지 조각내기', difficulty: 2, category: '문자열', args: ['text', 'size'], concepts: ['String', 'Slice', 'Loop'],
    description: '문자열을 앞에서부터 size 길이씩 잘라 배열로 반환하세요. 마지막 조각은 더 짧을 수 있습니다.', constraints: ['0 ≤ text.length ≤ 2,000', '1 ≤ size ≤ 100'],
    publicTests: [{ args: ['abcdefgh', 3], expected: ['abc', 'def', 'gh'] }, { args: ['hello', 5], expected: ['hello'] }], hiddenTests: [{ args: ['', 2], expected: [], label: '빈 문자열', guidance: '만들 조각이 없으면 빈 배열이어야 해요.' }, { args: ['abc', 1], expected: ['a', 'b', 'c'], label: '크기 1', guidance: '인덱스를 size만큼 정확히 이동하고 있나요?' }],
    observation: '다음 조각의 시작 인덱스는 현재 시작점에서 얼마나 이동할까요?', algorithmHint: '0부터 size씩 증가시키며 slice(start, start + size)를 사용해보세요.', pseudocode: '1. 빈 결과 배열을 만듭니다.\n2. 시작 위치를 size만큼 옮기며 문자열을 자릅니다.\n3. 각 조각을 결과에 추가합니다.', commonMistakes: ['마지막 짧은 조각을 버림', 'substring의 끝 인덱스를 길이로 착각함'], explanation: 'slice는 끝 인덱스가 문자열 길이를 넘어도 안전하게 마지막까지 반환합니다.', referenceSolution: 'function solution(text, size) { const result=[]; for (let i=0;i<text.length;i+=size) result.push(text.slice(i,i+size)); return result; }',
  },
  {
    id: 'JS0013', title: '배열 한 칸 회전', difficulty: 2, category: '배열', args: ['values', 'steps'], concepts: ['Array', 'Modulo', 'Slice'],
    description: '배열을 오른쪽으로 steps칸 회전한 새 배열을 반환하세요. 빈 배열도 처리하세요.', constraints: ['0 ≤ values.length ≤ 1,000', '0 ≤ steps ≤ 1,000,000'],
    publicTests: [{ args: [[1, 2, 3, 4], 1], expected: [4, 1, 2, 3] }, { args: [['a', 'b', 'c'], 5], expected: ['b', 'c', 'a'] }], hiddenTests: [{ args: [[], 3], expected: [], label: '빈 배열', guidance: '길이가 0일 때 나머지 연산을 피하세요.' }, { args: [[1, 2], 0], expected: [1, 2], label: '0칸', guidance: '회전하지 않아도 새 배열을 반환해야 해요.' }],
    observation: '배열 길이보다 큰 steps는 실제로 몇 칸 움직인 것과 같을까요?', algorithmHint: 'steps를 길이로 나눈 나머지만 사용하고 slice 두 개를 이어보세요.', pseudocode: '1. 빈 배열이면 빈 배열을 반환합니다.\n2. 실제 이동량을 나머지로 줄입니다.\n3. 뒤쪽 조각과 앞쪽 조각을 이어 반환합니다.', commonMistakes: ['큰 steps를 그대로 반복함', '원본 배열을 변경함'], explanation: '회전은 배열 길이를 주기로 반복되며, 두 구간을 잘라 순서만 바꾸면 됩니다.', referenceSolution: 'function solution(values, steps) { if (!values.length) return []; const k=steps%values.length; return k ? [...values.slice(-k), ...values.slice(0,-k)] : [...values]; }',
  },
  {
    id: 'JS0014', title: '사라진 숫자', difficulty: 2, category: 'Set', args: ['numbers'], concepts: ['Set', 'Loop', 'Counting'],
    description: '0부터 9까지 중 배열에 한 번도 등장하지 않은 숫자들의 합을 반환하세요.', constraints: ['0 ≤ numbers.length ≤ 100', '각 원소는 0 이상 9 이하입니다.'],
    publicTests: [{ args: [[0, 1, 2, 4, 5, 7, 8]], expected: 18 }, { args: [[0,1,2,3,4,5,6,7,8,9]], expected: 0 }], hiddenTests: [{ args: [[]], expected: 45, label: '빈 배열', guidance: '아무 숫자도 없으면 0부터 9까지 모두 빠져 있어요.' }, { args: [[1, 1, 1]], expected: 44, label: '중복값', guidance: '같은 숫자가 여러 번 있어도 존재 여부는 한 번만 중요해요.' }],
    observation: '0부터 9까지의 전체 합은 고정되어 있지 않나요?', algorithmHint: 'Set으로 존재 여부를 확인하거나, 전체 합 45에서 등장한 고유 숫자를 뺄 수 있어요.', pseudocode: '1. 입력을 Set으로 만듭니다.\n2. 0부터 9까지 확인합니다.\n3. Set에 없는 숫자만 합산합니다.', commonMistakes: ['중복 숫자를 여러 번 뺌', '9를 범위에서 제외함'], explanation: '존재 여부만 중요하므로 중복을 제거한 뒤 빠진 숫자를 찾습니다.', referenceSolution: 'function solution(numbers) { const seen=new Set(numbers); let sum=0; for (let n=0;n<=9;n++) if (!seen.has(n)) sum+=n; return sum; }',
  },
  {
    id: 'JS0015', title: '공통 시작 문자열', difficulty: 2, category: '문자열', args: ['words'], concepts: ['String', 'Prefix', 'Loop'],
    description: '모든 문자열이 공통으로 가지는 가장 긴 시작 문자열을 반환하세요. 공통 부분이 없거나 배열이 비었으면 빈 문자열입니다.', constraints: ['0 ≤ words.length ≤ 100', '각 문자열 길이는 0 이상 100 이하입니다.'],
    publicTests: [{ args: [['flower', 'flow', 'flight']], expected: 'fl' }, { args: [['dog', 'race', 'car']], expected: '' }], hiddenTests: [{ args: [[]], expected: '', label: '빈 배열', guidance: '비교할 첫 문자열이 없는 경우를 먼저 처리하세요.' }, { args: [['same']], expected: 'same', label: '단일 문자열', guidance: '문자열 하나는 전체가 공통 접두사입니다.' }],
    observation: '첫 문자열의 문자를 기준으로 같은 위치의 문자를 비교하면 어디서 멈춰야 할까요?', algorithmHint: '어느 한 문자열이라도 현재 문자가 다르면 그 직전까지가 답입니다.', pseudocode: '1. 첫 문자열을 기준으로 잡습니다.\n2. 각 위치를 모든 문자열과 비교합니다.\n3. 처음 다른 위치 직전까지 반환합니다.', commonMistakes: ['가장 짧은 문자열 길이를 넘음', '부분 포함과 접두사를 혼동함'], explanation: '접두사는 인덱스가 같아야 하므로 위치별 비교가 직접적입니다.', referenceSolution: "function solution(words) { if (!words.length) return ''; const first=words[0]; let i=0; while (i<first.length && words.every(word=>word[i]===first[i])) i++; return first.slice(0,i); }",
  },
  {
    id: 'JS0016', title: '연속 문자 압축', difficulty: 2, category: '문자열', args: ['text'], concepts: ['String', 'Simulation', 'Counting'],
    description: '같은 문자가 연속된 구간을 문자와 개수로 압축하세요. 개수가 1이어도 숫자 1을 붙입니다.', constraints: ['0 ≤ text.length ≤ 2,000'],
    publicTests: [{ args: ['aaabbc'], expected: 'a3b2c1' }, { args: ['abcd'], expected: 'a1b1c1d1' }], hiddenTests: [{ args: [''], expected: '', label: '빈 문자열', guidance: '첫 문자를 읽기 전에 빈 입력을 처리하세요.' }, { args: ['zzzzz'], expected: 'z5', label: '한 구간', guidance: '순회가 끝난 뒤 마지막 구간을 결과에 넣었나요?' }],
    observation: '현재 문자와 연속 횟수를 언제 결과 문자열에 확정해야 할까요?', algorithmHint: '문자가 바뀌는 순간과 순회가 끝난 순간을 따로 생각하세요.', pseudocode: '1. 첫 문자와 횟수 1로 시작합니다.\n2. 같은 문자는 횟수를 올리고, 다르면 이전 구간을 기록합니다.\n3. 마지막 구간도 기록합니다.', commonMistakes: ['마지막 그룹을 빠뜨림', '전체 빈도와 연속 빈도를 혼동함'], explanation: '인접한 문자만 비교하며 구간의 경계에서 누적 결과를 확정합니다.', referenceSolution: "function solution(text) { if (!text) return ''; let result='', current=text[0], count=1; for (let i=1;i<text.length;i++) { if (text[i]===current) count++; else { result+=current+count; current=text[i]; count=1; } } return result+current+count; }",
  },
  {
    id: 'JS0017', title: '괄호 문 닫기', difficulty: 3, category: 'Stack', args: ['brackets'], concepts: ['Stack', 'String'],
    description: '소괄호로만 이루어진 문자열이 올바르게 열리고 닫혔는지 반환하세요.', constraints: ['0 ≤ brackets.length ≤ 10,000'],
    publicTests: [{ args: ['(())()'], expected: true }, { args: ['())('], expected: false }], hiddenTests: [{ args: [''], expected: true, label: '빈 문자열', guidance: '열린 괄호가 하나도 남지 않은 상태로 볼 수 있어요.' }, { args: [')('], expected: false, label: '닫는 괄호 선행', guidance: '중간에 열린 괄호 수가 음수가 되는 순간을 확인하세요.' }],
    observation: '왼쪽부터 읽을 때 아직 닫히지 않은 괄호 수가 음수가 될 수 있을까요?', algorithmHint: '여는 괄호는 +1, 닫는 괄호는 -1로 두고 중간 상태와 최종 상태를 확인하세요.', pseudocode: '1. 열린 괄호 수를 0으로 둡니다.\n2. 문자를 따라 수를 더하거나 뺍니다.\n3. 음수가 되면 실패, 끝에서 0이면 성공입니다.', commonMistakes: ['개수만 같으면 true로 처리함', '중간에 닫는 괄호가 먼저 나온 경우를 놓침'], explanation: '소괄호 한 종류는 스택 전체 대신 깊이 카운터만으로 검사할 수 있습니다.', referenceSolution: "function solution(brackets) { let depth=0; for (const ch of brackets) { depth += ch==='(' ? 1 : -1; if (depth<0) return false; } return depth===0; }",
  },
  {
    id: 'JS0018', title: '가장 가까운 측정값', difficulty: 2, category: '배열', args: ['numbers', 'target'], concepts: ['Array', 'MinMax', 'Absolute'],
    description: 'target과 차이가 가장 작은 배열 값을 반환하세요. 차이가 같으면 더 작은 값을 반환하며 빈 배열이면 null을 반환합니다.', constraints: ['0 ≤ numbers.length ≤ 1,000'],
    publicTests: [{ args: [[4, 8, 12], 10], expected: 8 }, { args: [[-5, 2, 9], 1], expected: 2 }], hiddenTests: [{ args: [[], 3], expected: null, label: '빈 배열', guidance: '후보가 없는 경우의 반환값을 확인하세요.' }, { args: [[12, 8], 10], expected: 8, label: '같은 거리', guidance: '거리가 같을 때 더 작은 값을 선택해야 해요.' }],
    observation: '각 값과 target 사이의 거리는 어떤 Math 함수로 구할 수 있을까요?', algorithmHint: '현재 후보보다 거리가 짧거나, 거리가 같고 값이 작을 때 갱신하세요.', pseudocode: '1. 첫 값을 후보로 둡니다.\n2. 절댓값 차이로 현재 값과 후보를 비교합니다.\n3. 동률 규칙까지 적용해 후보를 반환합니다.', commonMistakes: ['절댓값을 사용하지 않음', '동률 규칙을 무시함'], explanation: '최소 차이와 그때의 값을 함께 관리하는 선형 탐색입니다.', referenceSolution: 'function solution(numbers, target) { if (!numbers.length) return null; let best=numbers[0]; for (const n of numbers) { const d=Math.abs(n-target), bd=Math.abs(best-target); if (d<bd || (d===bd && n<best)) best=n; } return best; }',
  },
  {
    id: 'JS0019', title: '대표 빈도 찾기', difficulty: 3, category: 'Map', args: ['numbers'], concepts: ['Map', 'Counting', 'Max'],
    description: '가장 자주 등장한 수를 반환하세요. 최빈값이 여러 개면 -1, 배열이 비어도 -1을 반환합니다.', constraints: ['0 ≤ numbers.length ≤ 2,000'],
    publicTests: [{ args: [[1, 2, 2, 3]], expected: 2 }, { args: [[1, 1, 2, 2]], expected: -1 }], hiddenTests: [{ args: [[]], expected: -1, label: '빈 배열', guidance: '최빈값 후보가 없어요.' }, { args: [[7]], expected: 7, label: '하나의 값', guidance: '값이 하나라면 유일한 최빈값입니다.' }],
    observation: '최대 빈도뿐 아니라 그 빈도를 가진 값이 몇 개인지도 알아야 하지 않을까요?', algorithmHint: 'Map으로 빈도를 만든 뒤 최대 빈도에 해당하는 키만 모아보세요.', pseudocode: '1. 값별 빈도를 셉니다.\n2. 가장 큰 빈도를 찾습니다.\n3. 그 빈도의 값이 하나면 반환하고 아니면 -1을 반환합니다.', commonMistakes: ['먼저 나온 최빈값을 무조건 반환함', '빈 배열에서 Math.max가 -Infinity가 됨'], explanation: '빈도표 생성과 동률 판단을 분리하면 조건을 명확히 처리할 수 있습니다.', referenceSolution: 'function solution(numbers) { if (!numbers.length) return -1; const counts=new Map(); for (const n of numbers) counts.set(n,(counts.get(n)||0)+1); const max=Math.max(...counts.values()); const modes=[...counts].filter(([,count])=>count===max); return modes.length===1 ? modes[0][0] : -1; }',
  },
  {
    id: 'JS0020', title: '소수 신호 개수', difficulty: 3, category: '완전탐색', args: ['numbers'], concepts: ['Prime', 'Loop', 'Math'],
    description: '정수 배열에서 소수인 값의 개수를 반환하세요. 1 이하는 소수가 아닙니다.', constraints: ['0 ≤ numbers.length ≤ 1,000', '-100 ≤ 값 ≤ 100,000'],
    publicTests: [{ args: [[1, 2, 3, 4, 5]], expected: 3 }, { args: [[-2, 0, 17, 20]], expected: 1 }], hiddenTests: [{ args: [[2]], expected: 1, label: '가장 작은 소수', guidance: '2를 합성수로 잘못 제외하지 않았는지 보세요.' }, { args: [[]], expected: 0, label: '빈 배열', guidance: '검사할 값이 없으면 개수는 0입니다.' }],
    observation: 'n의 약수가 있다면 제곱근 n보다 작거나 같은 약수도 반드시 존재하지 않을까요?', algorithmHint: '2부터 Math.sqrt(n)까지만 나누어보면 충분해요.', pseudocode: '1. 2 미만은 소수가 아니라고 처리합니다.\n2. 2부터 제곱근까지 나누어지는지 검사합니다.\n3. 소수인 원소의 개수를 셉니다.', commonMistakes: ['1을 소수로 셈', 'n까지 모두 나누어 시간 낭비'], explanation: '약수는 짝으로 존재하므로 제곱근까지만 확인해도 합성수를 판별할 수 있습니다.', referenceSolution: 'function solution(numbers) { const isPrime=n=>{ if(n<2)return false; for(let d=2;d*d<=n;d++) if(n%d===0)return false; return true; }; return numbers.filter(isPrime).length; }',
  },
  {
    id: 'JS0021', title: '연속 증가 구간', difficulty: 2, category: '배열', args: ['numbers'], concepts: ['Array', 'Simulation', 'Max'],
    description: '앞 숫자보다 큰 값이 연속되는 가장 긴 구간의 길이를 반환하세요. 빈 배열은 0입니다.', constraints: ['0 ≤ numbers.length ≤ 10,000'],
    publicTests: [{ args: [[1, 2, 3, 1, 2]], expected: 3 }, { args: [[5, 4, 3]], expected: 1 }], hiddenTests: [{ args: [[]], expected: 0, label: '빈 배열', guidance: '구간 자체가 없으므로 0입니다.' }, { args: [[2, 2, 3]], expected: 2, label: '같은 값', guidance: '같은 값은 엄격한 증가가 아닙니다.' }],
    observation: '현재 증가 구간 길이는 언제 1로 돌아가야 할까요?', algorithmHint: '이전 값과만 비교하며 현재 길이와 최대 길이를 갱신하세요.', pseudocode: '1. 빈 배열이면 0을 반환합니다.\n2. 현재 길이와 최대 길이를 1로 둡니다.\n3. 증가하면 현재 길이를 올리고 아니면 1로 초기화합니다.', commonMistakes: ['같은 값을 증가로 처리함', '마지막 최대값을 갱신하지 않음'], explanation: '인접 관계만 필요하므로 한 번의 순회로 연속 구간을 추적합니다.', referenceSolution: 'function solution(numbers) { if (!numbers.length) return 0; let current=1,best=1; for(let i=1;i<numbers.length;i++){ current=numbers[i]>numbers[i-1]?current+1:1; best=Math.max(best,current); } return best; }',
  },
  {
    id: 'JS0022', title: '정사각 표의 대각선', difficulty: 2, category: '배열', args: ['matrix'], concepts: ['Matrix', 'Index', 'Loop'],
    description: '정사각형 숫자 행렬의 왼쪽 위에서 오른쪽 아래로 이어지는 주대각선 합을 반환하세요.', constraints: ['0 ≤ matrix.length ≤ 100', '모든 행 길이는 matrix.length와 같습니다.'],
    publicTests: [{ args: [[[1,2],[3,4]]], expected: 5 }, { args: [[[3,0,1],[2,5,4],[7,8,9]]], expected: 17 }], hiddenTests: [{ args: [[]], expected: 0, label: '빈 행렬', guidance: '더할 대각선 원소가 없어요.' }, { args: [[[-3]]], expected: -3, label: '1×1', guidance: '하나뿐인 원소가 곧 대각선입니다.' }],
    observation: '주대각선 원소의 행 인덱스와 열 인덱스 사이에는 어떤 관계가 있나요?', algorithmHint: 'i번째 행에서는 i번째 열 하나만 더하면 됩니다.', pseudocode: '1. 합을 0으로 둡니다.\n2. i를 0부터 행 개수 전까지 움직입니다.\n3. matrix[i][i]를 합에 더합니다.', commonMistakes: ['행 전체를 더함', '반대 대각선을 더함'], explanation: '주대각선 좌표는 항상 [i][i] 형태입니다.', referenceSolution: 'function solution(matrix) { let sum=0; for(let i=0;i<matrix.length;i++) sum+=matrix[i][i]; return sum; }',
  },
  {
    id: 'JS0023', title: '카멜 이름을 스네이크로', difficulty: 2, category: '문자열', args: ['name'], concepts: ['String', 'Regex', 'Case'],
    description: 'camelCase 영문 이름을 snake_case로 바꿔 반환하세요. 첫 글자는 소문자입니다.', constraints: ['1 ≤ name.length ≤ 200', '영문자로만 이루어집니다.'],
    publicTests: [{ args: ['backgroundColor'], expected: 'background_color' }, { args: ['veryFastParser'], expected: 'very_fast_parser' }], hiddenTests: [{ args: ['simple'], expected: 'simple', label: '대문자 없음', guidance: '바꿀 문자가 없으면 입력과 같아야 해요.' }, { args: ['aB'], expected: 'a_b', label: '짧은 이름', guidance: '마지막 문자가 대문자인 경우도 처리하세요.' }],
    observation: '대문자를 만났을 때 그 문자 앞에 어떤 구분자를 추가해야 할까요?', algorithmHint: '대문자 패턴을 찾아 밑줄과 소문자로 치환하거나 직접 순회할 수 있어요.', pseudocode: '1. 대문자를 찾습니다.\n2. 각 대문자를 밑줄과 해당 소문자로 바꿉니다.\n3. 변환된 문자열을 반환합니다.', commonMistakes: ['대문자를 소문자로 바꾸지 않음', '문자열 앞에 불필요한 밑줄을 붙임'], explanation: '대문자 경계가 새 단어의 시작이므로 `_소문자`로 변환합니다.', referenceSolution: "function solution(name) { return name.replace(/[A-Z]/g, ch => '_' + ch.toLowerCase()); }",
  },
  {
    id: 'JS0024', title: '한정 예산으로 몇 개', difficulty: 2, category: 'Greedy', args: ['costs', 'budget'], concepts: ['Greedy', 'Sort', 'Counting'],
    description: '각 항목의 비용이 주어질 때 예산 안에서 살 수 있는 최대 항목 수를 반환하세요. 항목은 한 번씩만 살 수 있습니다.', constraints: ['0 ≤ costs.length ≤ 2,000', '0 ≤ budget ≤ 1,000,000'],
    publicTests: [{ args: [[4, 2, 1, 3], 6], expected: 3 }, { args: [[5, 6], 4], expected: 0 }], hiddenTests: [{ args: [[], 10], expected: 0, label: '빈 목록', guidance: '고를 항목이 없으면 0개입니다.' }, { args: [[0, 0, 3], 0], expected: 2, label: '비용 0', guidance: '비용이 0인 항목은 예산 0에서도 고를 수 있어요.' }],
    observation: '항목 수를 늘리려면 비싼 것과 싼 것 중 무엇부터 골라야 할까요?', algorithmHint: '비용을 오름차순 정렬하고 감당할 수 있는 동안 누적하세요.', pseudocode: '1. 비용을 오름차순으로 복사 정렬합니다.\n2. 싼 항목부터 예산에서 차감합니다.\n3. 더 살 수 없으면 지금까지의 개수를 반환합니다.', commonMistakes: ['원본 배열을 정렬함', 'budget과 같은 비용을 제외함'], explanation: '항목 가치가 모두 같으므로 가장 싼 비용부터 선택하는 탐욕 전략이 최적입니다.', referenceSolution: 'function solution(costs, budget) { let used=0,count=0; for(const cost of [...costs].sort((a,b)=>a-b)){ if(used+cost>budget) break; used+=cost; count++; } return count; }',
  },
  {
    id: 'JS0025', title: '목표 합의 두 값', difficulty: 3, category: 'Set', args: ['numbers', 'target'], concepts: ['Set', 'TwoSum', 'Array'],
    description: '배열의 서로 다른 두 인덱스 값을 더해 target을 만들 수 있으면 true, 아니면 false를 반환하세요.', constraints: ['0 ≤ numbers.length ≤ 10,000'],
    publicTests: [{ args: [[2, 7, 11], 9], expected: true }, { args: [[1, 2, 4], 8], expected: false }], hiddenTests: [{ args: [[3], 6], expected: false, label: '원소 재사용', guidance: '같은 인덱스의 값을 두 번 쓸 수 없어요.' }, { args: [[3, 3], 6], expected: true, label: '중복값', guidance: '같은 값이 서로 다른 위치에 두 번 있으면 사용할 수 있어요.' }],
    observation: '현재 값 n을 보고 있다면 이전 값 중 어떤 값이 있었는지만 확인하면 될까요?', algorithmHint: 'target - n을 Set에서 찾은 뒤 현재 값을 기록하세요.', pseudocode: '1. 빈 Set을 만듭니다.\n2. 각 값에 대해 target에서 뺀 값이 Set에 있는지 봅니다.\n3. 있으면 true, 없으면 현재 값을 저장하고 계속합니다.', commonMistakes: ['현재 값을 먼저 넣어 자기 자신과 짝지음', '중첩 반복문으로만 접근함'], explanation: '필요한 짝을 역산하고 이전 값만 저장하면 한 번의 순회로 판단할 수 있습니다.', referenceSolution: 'function solution(numbers, target) { const seen=new Set(); for(const n of numbers){ if(seen.has(target-n)) return true; seen.add(n); } return false; }',
  },
  {
    id: 'JS0026', title: '글자 재배열 확인', difficulty: 2, category: 'Map', args: ['left', 'right'], concepts: ['Map', 'String', 'Counting'],
    description: '두 문자열이 같은 문자를 같은 개수만큼 사용해 만들어졌는지 반환하세요. 대소문자는 구분합니다.', constraints: ['0 ≤ left.length, right.length ≤ 2,000'],
    publicTests: [{ args: ['listen', 'silent'], expected: true }, { args: ['apple', 'apply'], expected: false }], hiddenTests: [{ args: ['', ''], expected: true, label: '빈 문자열', guidance: '두 빈 문자열의 문자 구성은 같습니다.' }, { args: ['Aa', 'aa'], expected: false, label: '대소문자', guidance: '대소문자를 임의로 통일하지 마세요.' }],
    observation: '문자의 순서가 아니라 각 문자가 몇 번 나오는지가 핵심이지 않을까요?', algorithmHint: '한 문자열의 빈도를 올리고 다른 문자열을 읽으며 내려보세요.', pseudocode: '1. 길이가 다르면 false입니다.\n2. left의 문자별 개수를 Map에 저장합니다.\n3. right를 순회하며 개수를 줄이고 부족하면 false를 반환합니다.', commonMistakes: ['Set만 사용해 중복 횟수를 놓침', '대소문자를 합침'], explanation: '문자별 빈도표를 비교하면 배열 정렬 없이 구성의 동일성을 판별할 수 있습니다.', referenceSolution: 'function solution(left, right) { if(left.length!==right.length)return false; const counts=new Map(); for(const ch of left)counts.set(ch,(counts.get(ch)||0)+1); for(const ch of right){ const count=counts.get(ch)||0; if(!count)return false; counts.set(ch,count-1); } return true; }',
  },
  {
    id: 'JS0027', title: '연속 구간 최고 합', difficulty: 3, category: 'Sliding Window', args: ['numbers', 'size'], concepts: ['SlidingWindow', 'Array', 'Sum'],
    description: '길이가 size인 연속 부분 배열 중 가장 큰 합을 반환하세요. size가 유효하지 않으면 null입니다.', constraints: ['0 ≤ numbers.length ≤ 10,000', 'size는 정수입니다.'],
    publicTests: [{ args: [[1, 4, 2, 7, 3], 2], expected: 10 }, { args: [[-5, -2, -3], 2], expected: -5 }], hiddenTests: [{ args: [[1, 2], 3], expected: null, label: '유효하지 않은 크기', guidance: '배열보다 큰 구간은 만들 수 없어요.' }, { args: [[8], 1], expected: 8, label: '원소 하나', guidance: '크기 1의 구간 합은 원소 값입니다.' }],
    observation: '창을 한 칸 옮길 때 전체를 다시 더하지 않고 빠지는 값과 들어오는 값만 반영할 수 있을까요?', algorithmHint: '첫 구간 합을 만든 뒤 왼쪽 값을 빼고 새 오른쪽 값을 더하세요.', pseudocode: '1. size의 유효성을 검사합니다.\n2. 첫 size개 합을 구합니다.\n3. 창을 옮기며 합과 최대 합을 갱신합니다.', commonMistakes: ['최댓값을 0으로 시작해 음수 입력을 틀림', 'size가 0인 경우를 놓침'], explanation: '겹치는 연속 구간의 합을 재사용하는 슬라이딩 윈도우 기초입니다.', referenceSolution: 'function solution(numbers, size) { if(size<1||size>numbers.length)return null; let sum=0; for(let i=0;i<size;i++)sum+=numbers[i]; let best=sum; for(let i=size;i<numbers.length;i++){sum+=numbers[i]-numbers[i-size];best=Math.max(best,sum);} return best; }',
  },
  {
    id: 'JS0028', title: '좌표의 구역', difficulty: 1, category: '조건문', args: ['x', 'y'], concepts: ['Condition', 'Coordinate'],
    description: '좌표 (x, y)의 위치를 반환하세요. 축 위면 "AXIS", 원점이면 "ORIGIN", 그 외에는 "Q1"~"Q4"를 반환합니다.', constraints: ['-1,000 ≤ x, y ≤ 1,000'],
    publicTests: [{ args: [3, 2], expected: 'Q1' }, { args: [-4, 5], expected: 'Q2' }], hiddenTests: [{ args: [0, 0], expected: 'ORIGIN', label: '원점', guidance: '축 검사보다 원점 검사를 먼저 해야 구분할 수 있어요.' }, { args: [0, -3], expected: 'AXIS', label: '축', guidance: '둘 중 하나만 0이어도 축 위입니다.' }],
    observation: '원점과 축은 사분면 조건보다 먼저 분리해야 하지 않을까요?', algorithmHint: '특수한 경우를 먼저 return한 뒤 x와 y의 부호 조합을 확인하세요.', pseudocode: '1. x와 y가 모두 0이면 ORIGIN입니다.\n2. 하나만 0이면 AXIS입니다.\n3. 두 값의 부호로 사분면을 정합니다.', commonMistakes: ['원점을 AXIS로 반환함', 'Q2와 Q4를 뒤바꿈'], explanation: '조건을 구체적인 특수 사례부터 일반 사례 순서로 배치합니다.', referenceSolution: "function solution(x,y){ if(x===0&&y===0)return 'ORIGIN'; if(x===0||y===0)return 'AXIS'; if(x>0)return y>0?'Q1':'Q4'; return y>0?'Q2':'Q3'; }",
  },
  {
    id: 'JS0029', title: '경기 순위표', difficulty: 2, category: '정렬', args: ['scores'], concepts: ['Sort', 'Map', 'Ranking'],
    description: '점수 배열을 받아 각 원소의 공동 순위를 반환하세요. 더 높은 점수가 앞 순위이며, 같은 점수는 같은 순위입니다. 다음 순위는 건너뜁니다.', constraints: ['0 ≤ scores.length ≤ 2,000'],
    publicTests: [{ args: [[90, 80, 90, 70]], expected: [1, 3, 1, 4] }, { args: [[100, 90, 80]], expected: [1, 2, 3] }], hiddenTests: [{ args: [[]], expected: [], label: '빈 배열', guidance: '순위를 매길 값이 없어요.' }, { args: [[5, 5, 5]], expected: [1, 1, 1], label: '모두 동점', guidance: '같은 점수는 모두 같은 순위입니다.' }],
    observation: '각 점수보다 높은 점수가 몇 개인지를 알면 순위는 어떻게 계산할 수 있을까요?', algorithmHint: '내림차순 정렬한 배열에서 각 고유 점수가 처음 나타난 인덱스 + 1이 순위입니다.', pseudocode: '1. 점수를 내림차순으로 복사 정렬합니다.\n2. 처음 보는 점수에 현재 인덱스 + 1을 저장합니다.\n3. 원래 점수를 순위로 변환합니다.', commonMistakes: ['동점 다음 순위를 건너뛰지 않음', '원본 순서를 잃음'], explanation: '정렬 위치를 순위 Map에 기록한 뒤 원본 순서로 매핑하면 공동 순위를 유지합니다.', referenceSolution: 'function solution(scores){const sorted=[...scores].sort((a,b)=>b-a), rank=new Map();sorted.forEach((score,i)=>{if(!rank.has(score))rank.set(score,i+1);});return scores.map(score=>rank.get(score));}',
  },
  {
    id: 'JS0030', title: '대기열 명령 처리', difficulty: 3, category: 'Queue', args: ['commands'], concepts: ['Queue', 'Simulation', 'Performance'],
    description: '문자열 명령 배열을 처리하세요. "PUSH 값"은 값을 넣고, "POP"은 가장 먼저 넣은 값을 결과에 추가합니다. 비어 있으면 -1을 추가하세요. POP 결과 배열을 반환합니다.', constraints: ['0 ≤ commands.length ≤ 20,000'],
    publicTests: [{ args: [['PUSH 3', 'PUSH 7', 'POP', 'POP']], expected: [3, 7] }, { args: [['POP', 'PUSH 2', 'POP', 'POP']], expected: [-1, 2, -1] }], hiddenTests: [{ args: [[]], expected: [], label: '명령 없음', guidance: 'POP이 없으면 결과도 빈 배열입니다.' }, { args: [['PUSH 0','POP']], expected: [0], label: '0 값', guidance: '0을 빈 값처럼 취급하지 마세요.' }],
    observation: '배열 맨 앞을 매번 제거하면 남은 원소들은 어떻게 움직일까요?', algorithmHint: 'shift 대신 head 인덱스를 증가시키는 큐를 만들어보세요.', pseudocode: '1. 배열 큐와 head=0을 준비합니다.\n2. PUSH는 뒤에 추가합니다.\n3. POP은 head가 범위 안이면 queue[head]를 읽고 head를 올립니다.', commonMistakes: ['Array.shift를 반복해 성능이 느려짐', '값 0을 없다고 판단함'], explanation: 'head 포인터를 사용하면 POP마다 배열 전체를 이동하지 않아도 되어 O(1)에 처리됩니다.', referenceSolution: "function solution(commands){const queue=[],result=[];let head=0;for(const command of commands){if(command.startsWith('PUSH '))queue.push(Number(command.slice(5)));else if(command==='POP')result.push(head<queue.length?queue[head++]:-1);}return result;}",
  },
];

export const level0Problems = definitions.map((definition) => createProblem({
  ...definition,
  languageVariants: { java: javaLevel0Variants[definition.id] },
}));
export default level0Problems;
