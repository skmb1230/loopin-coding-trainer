# loopin

정답을 바로 보여주지 않고 문제 이해 → 관찰 → 자료구조 후보 → 의사코드 순서로 사고를 여는 코딩테스트 트레이너입니다. 외부 서버, 로그인, AI API 없이 브라우저와 내 컴퓨터의 로컬 개발 서버에서 동작합니다. JavaScript와 Java를 모두 선택할 수 있으며 언어별 코드·진도·복습 기록을 따로 저장합니다.

## 다운로드한 뒤 처음 실행하기

[Node.js 22.12 이상](https://nodejs.org/)이 필요합니다. Java 문제를 실행하려면 [Temurin JDK 21 이상](https://adoptium.net/temurin/releases/?version=21)도 설치합니다. JavaScript만 학습할 때는 JDK가 없어도 됩니다.

### 1. 프로젝트 받기

Git을 사용할 수 있다면 터미널에서 다음 명령을 실행합니다.

```bash
git clone https://github.com/skmb1230/loopin-coding-trainer.git
cd loopin-coding-trainer
npm install
```

Git을 사용하지 않는다면 GitHub의 **Code → Download ZIP**을 누르고 압축을 풉니다. 터미널에서 압축을 푼 폴더로 이동한 뒤 `npm install`을 실행하면 됩니다.

### 2-A. macOS에서 아이콘으로 실행하기

프로젝트 폴더에서 아래 명령을 한 번만 실행합니다.

```bash
npm run install:app
```

바탕화면에 `Loopin.app` 아이콘이 자동으로 만들어집니다. 이후에는 터미널 명령 없이 아이콘을 더블클릭하면 로컬 서버가 시작되고 브라우저가 열립니다.

- macOS 보안 경고가 나오면 아이콘을 우클릭하고 **열기**를 선택합니다.
- 프로젝트 폴더를 다른 위치로 옮겼다면 `npm run install:app`을 다시 실행합니다.
- JDK를 나중에 설치했다면 `Loopin.app`을 완전히 종료한 뒤 다시 실행합니다. Settings에서 Java 실행 환경 상태를 확인할 수 있습니다.
- 실행에 실패하면 `~/Library/Logs/Loopin.log`에서 기록을 확인할 수 있습니다.

### 2-B. Windows에서 실행하기

Windows 10/11에서는 PowerShell 또는 Windows 터미널로 실행하면 됩니다. 별도의 서버 계정은 필요하지 않습니다.

#### 1) 필요한 프로그램 설치

1. [Node.js 공식 사이트](https://nodejs.org/)에서 Node.js 22.12 이상(LTS 권장)을 설치합니다.
2. Java 문제도 풀려면 [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=21)에서 Windows용 JDK 21 이상을 설치합니다.
   - 설치 화면에서 `Add to PATH`와 `JAVA_HOME` 설정 항목을 켜는 것을 권장합니다.
3. 설치가 끝나면 열려 있던 PowerShell을 닫고 새로 연 뒤 아래 명령으로 확인합니다.

```powershell
node -v
npm -v
java -version
javac -version
```

JavaScript 학습만 할 때는 `java`와 `javac`가 없어도 됩니다.

#### 2) 프로젝트 받기

Git이 설치되어 있다면 PowerShell에서 다음 명령을 실행합니다.

```powershell
git clone https://github.com/skmb1230/loopin-coding-trainer.git
cd loopin-coding-trainer
npm install
```

Git이 없다면 GitHub 저장소의 `Code` → `Download ZIP`을 누르고 압축을 푼 뒤, 해당 폴더를 Windows 터미널로 엽니다. 압축 파일 안에서 바로 실행하지 말고 반드시 먼저 압축을 풀어 주세요.

#### 3) 앱 실행 및 종료

프로젝트 폴더에서 다음 명령을 실행합니다.

```powershell
npm run dev
```

터미널에 `Local: http://localhost:5173/`가 표시되면 브라우저에서 [http://localhost:5173](http://localhost:5173)을 엽니다. 학습 중에는 터미널 창을 닫지 말고, 종료할 때는 터미널에서 `Ctrl+C`를 누릅니다.

Windows에서도 진도, 작성 코드, 오답 노트는 현재 사용 중인 브라우저 프로필에 로컬 저장됩니다. 다른 PC나 브라우저로 옮기기 전에는 앱의 `설정 → 데이터 백업`에서 JSON 파일을 내려받아 주세요.

#### 4) Windows에서 업데이트하기

Git으로 받은 경우 프로젝트 폴더에서 다음 명령을 실행합니다.

```powershell
git pull
npm install
npm run dev
```

ZIP으로 받은 경우에는 GitHub에서 새 ZIP을 다시 내려받아 압축을 풀면 됩니다. 기존 학습 데이터는 프로젝트 폴더가 아니라 브라우저에 저장되지만, 안전을 위해 먼저 JSON 백업을 권장합니다.

#### Windows 문제 해결

- `'node' 또는 'npm'을 찾을 수 없습니다`: Node.js를 다시 설치한 뒤 PowerShell을 완전히 닫고 새로 여세요.
- `'javac'을 찾을 수 없습니다` 또는 설정에서 JDK가 없다고 나옵니다: JDK 21 이상을 설치하면서 PATH 옵션을 켠 뒤 PowerShell과 앱을 다시 실행하세요.
- `npm.ps1 ... 스크립트를 실행할 수 없습니다`: PowerShell 실행 정책을 바꾸지 않고 `npm.cmd install`, `npm.cmd run dev`처럼 `npm.cmd`를 사용하면 됩니다.
- 5173 포트를 이미 사용 중이라고 나옵니다: 이전에 실행한 Loopin 터미널을 찾아 `Ctrl+C`로 종료한 뒤 다시 실행하세요.

### 2-C. Linux 또는 일반 터미널에서 실행하기

프로젝트 폴더에서 실행합니다.

```bash
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173)을 엽니다. 사용하는 동안 터미널을 닫지 말고, 종료할 때는 터미널에서 `Ctrl+C`를 누릅니다.

## 업데이트하기

Git으로 받은 경우 프로젝트 폴더에서 다음 명령을 실행합니다.

```bash
git pull
npm install
```

ZIP으로 받은 경우에는 새 ZIP을 다시 받아 압축을 풉니다. macOS 아이콘이 새 폴더를 바라보게 하려면 새 폴더에서 `npm run install:app`도 다시 실행합니다.

## 개발 및 검증 명령

배포용 번들 확인:

```bash
npm run build
npm run preview
```

핵심 로직 테스트와 문제 데이터 검증:

```bash
npm test
npm run validate:problems
npm run validate:java # JDK 21 이상 필요
```

## 제공 기능

- JavaScript/Java별 8문제 진단 또는 Level 0 직접 시작 온보딩과 진단 결과 리포트
- 앱을 시작할 때 오늘 학습할 JavaScript/Java를 선택하고 해당 언어의 독립된 계획·진도·복습을 로딩
- Level 0~5 총 800문제: 200 · 220 · 180 · 120 · 60 · 20개를 레벨 선택 시 lazy loading
- 실제 풀이 기록으로 현재 레벨을 자동 계산하고, 레벨별 해결 수·무힌트 풀이 비율·숙련도를 모두 통과하면 다음 레벨로 진급
- 매일 가능한 시간을 다시 확인해 문제 수와 세션을 조정하며, 완료한 세션 상태도 새로고침 후 복원하는 오늘의 계획
- CodeMirror 6 JavaScript·Java 구문 에디터, 언어별 자동 저장, 키보드 단축키
- JavaScript는 실행마다 새 Web Worker에서, Java는 로컬 JDK 프로세스에서 메모리·시간 제한과 함께 실행
- 공개·정적 숨김 테스트와 제출 순간 문제별 seed로 생성했다가 제거하는 추가 숨김 테스트
- 5단계 질문형 힌트, 상황별 `막혔어요`, 단계형 풀이 포기·복기
- 막힌 이유 선택 → 내 기억 꺼내기 → 작은 단서 → 다음 시도 기록 → 다음 날 복습으로 이어지는 막힘 코치
- 전 레벨 문제·개념별 숙련도, 1·3·7·14일 복습 큐와 실제 날짜 기반 연속 학습 기록
- Roadmap, JavaScript/브라우저 이론, Java/JVM/컬렉션 이론, FE × AI 사고 문제, Git·AWS 면접 보조 트랙, Analytics
- SMTP·IMAP·POP3·MIME·MX·SPF/DKIM/DMARC부터 TLS·CORS·XSS·CSRF·인증/인가·OAuth/OIDC·CSP·사고 대응까지 연결한 네트워크·메일·보안 24개 학습 주제
- 기본 배분 55% 코테 · 15% 이론 · 10% AI · 10% 네트워크/메일/보안 · 5% Git/AWS · 5% 복습이며, 2시간 미만인 날에도 보안 학습은 유지하고 Git/AWS만 자동 생략
- 이론별 내 말 정리와 완료 상태를 자동 저장하고 JSON 백업·복구에 포함
- 이론·문제·힌트의 어려운 용어를 자동 표시하는 마우스 오버·탭 용어 설명
- IndexedDB 저장과 JSON 백업/복구, 항목별 초기화
- 현재 레벨 지연 로딩, 필요할 때만 여는 800문제 전체 검색, 50개 단위 페이지 탐색
- Light/Dark, 집중 모드, 문제 타이머, 반응형 레이아웃

## 회의 용어 연습실

왼쪽 메뉴의 **회의 용어** 또는 Today의 **오늘의 용어 고르기**에서 시작합니다. 컴퓨터 기초, 비즈니스, 기획, 영업, 회의·판교어를 프로그래밍 언어와 관계없이 같은 진도로 학습합니다.

1. 하루 목표를 1~20개로 정하고, 원하는 분야를 여러 개 선택합니다. 기본은 5개이며 용어 하나당 약 2분을 예상합니다. 코테 시간과 별도로 짧게 공부하는 트랙입니다.
2. 추천을 받거나 검색해서 궁금한 용어를 직접 고릅니다. `카니발매출`, `마이그레이션`, `포팅`, `피저빌리티`처럼 실제 들었던 표현으로도 찾을 수 있습니다. 직접 고르지 않은 자리는 복습할 용어와 새로운 용어로 채웁니다.
3. 쉬운 뜻 → 실제 회의 문장 → 상대가 요청하는 내용 → 답하거나 되물어볼 문장 → 헷갈리는 표현의 차이를 읽습니다.
4. 다른 회의 상황의 객관식 문제를 풀고 해설을 확인합니다. 단순히 설명을 읽거나 뜻을 다시 보는 것만으로 완료되지 않습니다.
5. 틀린 용어를 다시 맞히면 오늘 학습은 완료하지만 첫 오답 기록은 유지합니다. 틀렸거나 도움을 받은 말은 내일, 스스로 맞힌 말은 1·3·7·14일 간격으로 복습합니다.

5개 분야에 각 12개, 총 60개 용어와 120개 상황 문제가 있습니다. 보기 순서와 연습 상황을 바꾸어 위치 암기를 줄입니다. 자동 추천은 복습을 우선하고 새로운 용어는 분야를 번갈아 배치합니다. 계획을 바꿔도 이미 읽거나 답한 용어는 남기므로, 새 용어를 추가하면 오늘 실제 개수가 설정 목표보다 많아질 수 있습니다.

학습 중 새로고침해도 오늘 목록과 답변 기록이 복원됩니다. 다음 날에는 개수·분야 설정을 재사용하며, 어제 직접 골랐던 용어를 무조건 반복하지는 않습니다. 기록은 현재 브라우저에 저장되고 **Settings → JSON 내보내기/가져오기**에 포함됩니다. 앱 업데이트나 Git push만으로 학습 기록이 다른 PC에 동기화되지는 않습니다.

어려운 용어에 붙은 돋보기 설명에도 새 표현을 연결했습니다. 상황 퀴즈에서는 뜻을 바로 노출하지 않으며, 모르면 **아직 모르겠어요 · 뜻 다시 보기**로 다시 익힐 수 있습니다. 회사마다 용어의 범위와 지표 계산법이 다를 수 있어 설명과 함께 확인 질문을 제시합니다. 참고 자료는 연습실 하단에서 확인할 수 있습니다.

## 문제 구조

문제는 `src/data/problems/level0`부터 `level5`까지 레벨별 dynamic import로 분리됩니다. 현재 Level 0~5에 각각 200/220/180/120/60/20개, 총 800개가 등록되어 있으며 모든 문제를 JavaScript와 Java로 풀 수 있습니다. 30개 개별 설계 입문 문제를 포함해 72개 핵심 설계 유형을 두고, 전처리·부분 선택·정규화·복합 조건 같은 별도 학습 목표를 결합한 362개 템플릿과 결정적 파라미터 변형으로 구성합니다. 단순히 숫자만 바꾼 문제를 템플릿 하나로 세지 않으며 validator가 최소 250개 템플릿을 강제합니다. 문제의 `languageVariants`와 `supportedLanguages`, `src/core/languages/registry.js`를 통해 언어별 시작 코드·기준 풀이·타입 명세·실행기를 분리합니다.

주요 schema:

```js
{
  id, language, supportedLanguages, languageVariants,
  title, level, difficulty, category, tags,
  description, constraints, examples, starterCode,
  estimatedMinutes, prerequisites, concepts,
  hints, commonMistakes, reviewQuestions,
  testGenerator: { seed, strategy },
  tests, solutionExplanation, referenceSolution
}
```

새 문제는 해당 레벨 모듈에 정의하고 `createProblem()`으로 정규화합니다. 각 문제에는 공개·숨김 테스트, 3~5개 힌트, 설명과 언어별 기준 풀이가 필요합니다. 제출 시 `testGenerator.seed`로 추가 숨김 테스트 4개를 메모리에서 결정적으로 만들고 실행 후 버립니다. `npm run validate:problems`는 800문제의 ID 중복, 레벨별 개수, 250개 이상 템플릿, 필수 필드, 범위, 힌트와 6,400개 JavaScript 정적·생성 테스트를 검사합니다. `npm run validate:java`는 800개 Java 기준 풀이를 JDK 21에서 실제로 컴파일해 같은 6,400개 테스트를 확인합니다.

`npm run generate:problems -- 10482`는 고정 seed와 검증된 템플릿을 사용하는 800문제 manifest를 생성합니다. 같은 seed는 같은 순서를 만들며 manifest에는 레벨별 목표·실제 등록 수, 핵심 유형·템플릿 수와 각 문제 seed가 기록됩니다.

## 폴더 구조

```text
src/
  app/                 앱 조합
  core/
    curriculum/        학습 배분·추천·난이도
    mastery/           개념 숙련도
    problems/          레벨별 lazy loader
    review/            간격 복습
    runner/            JavaScript/Java 실행·결과 분석
    storage/           IndexedDB와 localStorage
  data/                문제·이론·AI 학습 데이터
  features/            온보딩·에디터·문제 풀이 UI
  workers/             JavaScript 사용자 코드 전용 Worker
  styles/              공통 디자인
scripts/               문제 생성·검증·로컬 Java 실행기
tests/                 핵심 학습 로직 테스트
```

## 로컬 데이터와 백업

테마·프로필·기본 언어 같은 작은 설정은 `localStorage`에, 진도·작성 코드·메모·학습 기록·오늘 세션 상태는 `IndexedDB(loopin-learning)`에 저장합니다. 진도와 코드는 `문제 ID:언어 ID` 키로 분리됩니다. 앱 시작 시 해당 언어에서 시도한 레벨만 다시 불러오므로 고레벨 복습·메모·분석도 새로고침 후 유지됩니다. Settings의 데이터 내보내기는 양쪽 데이터를 version 1 JSON으로 묶으며, 가져오기 시 schema version을 확인하고 복구합니다. 특정 Level만 진도·코드·메모를 초기화하는 기능도 제공합니다.
