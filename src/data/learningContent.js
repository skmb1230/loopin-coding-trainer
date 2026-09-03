export const theoryTopics = [
  { id: 'event-loop', area: 'JavaScript', title: '이벤트 루프와 작업의 순서', level: '중급', minutes: 18, question: 'Promise.then과 setTimeout(fn, 0)이 함께 있다면 무엇이 먼저 실행될까요?', hint: '현재 실행 중인 작업이 끝난 뒤 microtask queue와 task queue 중 어느 쪽을 먼저 비우는지 떠올려보세요.', answer: '현재 call stack이 비면 microtask queue의 Promise 콜백을 먼저 처리하고, 이후 task queue의 setTimeout 콜백을 실행합니다.' },
  { id: 'closure', area: 'JavaScript', title: 'Closure가 값을 기억하는 방식', level: '중급', minutes: 20, question: '함수 실행이 끝난 뒤에도 내부 함수가 바깥 변수를 읽을 수 있는 이유는 무엇일까요?', hint: '함수가 선언될 때 함께 저장되는 lexical environment를 생각해보세요.', answer: '내부 함수가 선언 당시의 lexical environment를 참조하고 있어 필요한 바깥 변수가 계속 유지되기 때문입니다.' },
  { id: 'rendering', area: 'Browser', title: '렌더링 파이프라인', level: '심화', minutes: 25, question: '요소의 width 변경과 transform 변경은 브라우저 작업량이 왜 다를까요?', hint: 'Layout, Paint, Composite 중 다시 수행해야 하는 단계를 비교해보세요.', answer: 'width는 보통 Layout과 Paint를 다시 유발하지만 transform은 합성 단계만으로 처리될 수 있어 비용이 더 낮습니다.' },
  { id: 'react-render', area: 'React', title: '렌더링과 메모이제이션', level: '심화', minutes: 22, question: 'React.memo를 모든 컴포넌트에 적용하면 항상 빨라질까요?', hint: 'props 비교 비용과 실제 렌더링 비용을 함께 비교해보세요.', answer: '아닙니다. props 비교에도 비용이 들고 자주 변하는 props에는 이득이 없어, 측정된 병목에 선택적으로 적용해야 합니다.' },
];

export const aiTopics = [
  { id: 'streaming', area: 'AI Application', title: 'Streaming UI', minutes: 20, question: 'LLM 응답을 완성될 때까지 기다리지 않고 생성되는 즉시 보여주려면 어떤 전송 방식을 고려할 수 있을까요?', hint: '서버에서 클라이언트 방향으로 작은 텍스트 조각을 계속 밀어주는 단방향 연결을 떠올려보세요.', answer: 'HTTP streaming이나 SSE를 사용할 수 있습니다. 단방향 토큰 스트림이라면 SSE가 단순하며, 양방향 상호작용까지 필요하면 WebSocket도 후보입니다.' },
  { id: 'evaluation', area: 'AI Production', title: '출력 품질 평가', minutes: 25, question: '프롬프트를 바꾼 뒤 “느낌상 좋아졌다”가 아니라 품질을 검증하려면 무엇이 필요할까요?', hint: '고정된 입력 모음, 기대 기준, 변경 전후 비교를 생각해보세요.', answer: '대표 입력 데이터셋과 명시적인 채점 기준을 만들고, 같은 조건에서 변경 전후 결과를 반복 평가해야 합니다.' },
  { id: 'tool-calling', area: 'AI Coding', title: 'Tool Calling 경계', minutes: 22, question: '모델이 DB 조회 도구를 호출할 때 응답을 바로 신뢰하면 안 되는 이유는 무엇일까요?', hint: '모델이 만든 인자와 도구가 반환한 외부 데이터 양쪽의 검증을 생각해보세요.', answer: '모델이 잘못된 인자를 만들 수 있고 외부 결과도 신뢰할 수 없으므로 schema 검증, 권한 확인, 결과 sanitization이 필요합니다.' },
  { id: 'prompt-injection', area: 'AI Security', title: 'Prompt Injection', minutes: 26, question: '사용자가 올린 문서 안의 “이전 지시를 무시하라”는 문장을 모델 지시로 취급하면 안 되는 이유는 무엇일까요?', hint: '데이터와 명령의 신뢰 경계가 섞일 때 생기는 위험을 생각해보세요.', answer: '외부 콘텐츠는 신뢰할 수 없는 데이터이며 시스템 지시가 아닙니다. 출처별 경계를 유지하고 도구 권한을 최소화해야 합니다.' },
];
