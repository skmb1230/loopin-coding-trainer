// Version 1 is the original diagnostic. Keep its wording, option order and
// answer keys stable so an old saved answer still refers to the same question.
export const ONBOARDING_DIAGNOSTIC_VERSION = 1;

const javascriptQuestions = [
  { area: '문자열', question: "'hello'.slice(1, 4)의 결과는?", options: ['ell', 'ello', 'hel'], answer: 0, explanation: 'slice(1, 4)는 인덱스 1부터 4 직전까지 가져옵니다. 인덱스 1·2·3의 문자를 연결하면 ell입니다.' },
  { area: '배열', question: '[1, 2, 3].map(x => x * 2)의 결과는?', options: ['[2, 4, 6]', '6', '[1, 2, 3, 2]'], answer: 0, explanation: 'map은 각 원소에 함수를 적용한 새 배열을 만듭니다. 1·2·3을 각각 두 배로 바꾸므로 [2, 4, 6]이 됩니다.' },
  { area: 'Map/Set', question: '중복 없는 값의 존재 여부를 빠르게 확인할 때 알맞은 것은?', options: ['Set', 'Array.shift', 'JSON.stringify'], answer: 0, explanation: 'Set은 같은 값을 중복해서 저장하지 않으며 has로 존재 여부를 확인할 수 있습니다. shift는 첫 원소를 꺼내고 JSON.stringify는 값을 문자열로 바꿉니다.' },
  { area: '구현', question: '배열의 마지막 유효 인덱스는?', options: ['length', 'length - 1', 'length + 1'], answer: 1, explanation: '원소가 있는 배열의 인덱스는 0부터 시작하므로 마지막 인덱스는 length - 1입니다. 빈 배열에는 유효한 인덱스가 없습니다.' },
  { area: '정렬', question: '숫자 오름차순 sort comparator는?', options: ['(a,b) => a-b', '(a,b) => a>b', '생략한다'], answer: 0, explanation: 'a - b가 음수이면 a가 앞에 옵니다. 비교 함수를 생략하면 문자열 기준으로 정렬하고, a > b는 음수를 반환하지 않아 올바른 숫자 비교 함수가 아닙니다.' },
  { area: 'Stack', question: '가장 나중에 넣은 값부터 꺼내는 구조는?', options: ['Queue', 'Stack', 'Set'], answer: 1, explanation: 'Stack은 나중에 넣은 값을 먼저 꺼내는 후입선출 구조입니다. Queue는 먼저 넣은 값을 먼저 꺼내는 선입선출 구조입니다.' },
  { area: '완전탐색', question: '후보 수가 작을 때 모든 경우를 확인하는 접근은?', options: ['완전탐색', '이진탐색', '위상정렬'], answer: 0, explanation: '완전탐색은 가능한 후보를 모두 확인합니다. 후보 수가 처리 가능한지 먼저 따져본 뒤 가장 단순한 정답 풀이부터 만들 수 있습니다.' },
  { area: '시간복잡도', question: '길이 N 배열을 한 번 순회할 때 복잡도는?', options: ['O(1)', 'O(log N)', 'O(N)'], answer: 2, explanation: '원소마다 일정한 작업을 한 번씩 하면 원소 수 N에 비례해 작업이 늘어납니다. 이때 시간복잡도는 O(N)입니다.' },
];

const javaQuestions = [
  { area: '문자열', question: '"hello".substring(1, 4)의 결과는?', options: ['ell', 'ello', 'hel'], answer: 0, explanation: 'substring(1, 4)는 시작 인덱스 1을 포함하고 끝 인덱스 4는 제외합니다. 인덱스 1·2·3의 문자는 ell입니다.' },
  { area: '배열', question: 'int[] numbers = {1, 2, 3}; 배열 길이를 읽는 표현은?', options: ['numbers.length', 'numbers.length()', 'numbers.size()'], answer: 0, explanation: 'Java 배열의 길이는 length 필드로 읽습니다. String은 length(), List 같은 컬렉션은 size()를 사용하므로 대상의 타입을 구분해야 합니다.' },
  { area: 'Map/Set', question: '중복 없는 값의 존재 여부를 빠르게 확인할 때 알맞은 것은?', options: ['HashSet', 'ArrayList.remove', 'StringBuilder'], answer: 0, explanation: 'HashSet은 중복 없는 값을 저장하고 contains로 존재 여부를 확인합니다. ArrayList.remove는 원소 제거, StringBuilder는 문자열 조립에 쓰입니다.' },
  { area: '구현', question: '배열의 마지막 유효 인덱스는?', options: ['length', 'length - 1', 'length + 1'], answer: 1, explanation: '원소가 있는 Java 배열도 0부터 인덱스를 셉니다. 길이가 3이면 유효한 인덱스는 0·1·2이고, 빈 배열에는 유효한 인덱스가 없습니다.' },
  { area: '정렬', question: 'int[]를 오름차순 정렬하는 표준 메서드는?', options: ['Arrays.sort(numbers)', 'numbers.sort()', 'Collections.sort(numbers)'], answer: 0, explanation: 'Arrays.sort는 int[] 같은 배열을 정렬합니다. Collections.sort는 List를 대상으로 하므로 int[]에 그대로 사용할 수 없습니다.' },
  { area: 'Stack', question: 'Java에서 스택·큐를 구현할 때 자주 권장되는 인터페이스는?', options: ['Deque', 'String', 'TreeMap'], answer: 0, explanation: 'Deque는 양쪽 끝에서 값을 넣고 꺼낼 수 있어 스택과 큐를 모두 표현할 수 있습니다. 구현체로 ArrayDeque를 사용할 수 있습니다.' },
  { area: '완전탐색', question: '후보 수가 작을 때 모든 경우를 확인하는 접근은?', options: ['완전탐색', '이진탐색', '위상정렬'], answer: 0, explanation: '완전탐색은 가능한 후보를 빠짐없이 확인하는 접근입니다. 먼저 후보 수를 계산해 제한 시간 안에 모두 확인할 수 있는지 판단합니다.' },
  { area: '시간복잡도', question: '길이 N 배열을 한 번 순회할 때 복잡도는?', options: ['O(1)', 'O(log N)', 'O(N)'], answer: 2, explanation: '각 원소에서 일정한 작업을 수행하며 배열을 한 번 순회하면 N번의 작업이 필요합니다. 입력 크기에 비례하므로 O(N)입니다.' },
];

const freezeQuestions = (questions) => Object.freeze(questions.map((question) => Object.freeze({ ...question, options: Object.freeze(question.options) })));
const versionOne = Object.freeze({ javascript: freezeQuestions(javascriptQuestions), java: freezeQuestions(javaQuestions) });
const unsupported = Object.freeze([]);

export function getDiagnosticQuestions(languageId, version = ONBOARDING_DIAGNOSTIC_VERSION) {
  return version === 1 && Object.hasOwn(versionOne, languageId) ? versionOne[languageId] : unsupported;
}

export function diagnosticStartLevel(score) {
  return Number.isInteger(score) && score >= 7 && score <= 8 ? 1 : 0;
}
