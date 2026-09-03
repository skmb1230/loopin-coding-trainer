# loopin

정답을 바로 보여주지 않고 문제 이해 → 관찰 → 자료구조 후보 → 의사코드 순서로 사고를 여는 코딩테스트 트레이너입니다. 서버, 로그인, AI API 없이 브라우저에서 로컬로 동작합니다. 첫 학습 언어는 JavaScript이며 Python·Java 실행기를 지연 로딩 방식으로 추가할 수 있는 언어 registry 구조를 사용합니다.

## 다운로드한 뒤 처음 실행하기

[Node.js 22.12 이상](https://nodejs.org/)이 필요합니다. Node.js만 먼저 설치하면 다운로드한 사람이 `Loopin.app`을 직접 만들 필요는 없습니다.

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
- 실행에 실패하면 `~/Library/Logs/Loopin.log`에서 기록을 확인할 수 있습니다.

### 2-B. Windows·Linux 또는 터미널로 실행하기

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
```

## 제공 기능

- 8문제 진단 또는 Level 0 직접 시작 온보딩과 진단 결과 리포트
- 매일 가능한 시간을 다시 확인해 문제 수와 세션을 조정하는 오늘의 계획
- CodeMirror 6 JavaScript 에디터, 자동 저장, 키보드 단축키
- 실행마다 새로 만드는 Web Worker와 2초 실행 제한
- 공개 테스트 / 데이터가 가려진 숨김 테스트
- 5단계 질문형 힌트, 상황별 `막혔어요`, 단계형 풀이 포기·복기
- 막힌 이유 선택 → 내 기억 꺼내기 → 작은 단서 → 다음 시도 기록 → 다음 날 복습으로 이어지는 막힘 코치
- 문제·개념별 숙련도, 1·3·7·14일 복습 큐
- Roadmap, JavaScript/브라우저 이론, FE × AI 사고 문제, Git·AWS 면접 보조 트랙, Analytics
- 기본 배분 55% 코테 · 20% 이론 · 15% AI · 5% Git/AWS · 5% 복습이며, 2시간 미만인 날에는 Git/AWS를 자동 생략
- 이론·문제·힌트의 어려운 용어를 자동 표시하는 마우스 오버·탭 용어 설명
- IndexedDB 저장과 JSON 백업/복구, 항목별 초기화
- Light/Dark, 집중 모드, 문제 타이머, 반응형 레이아웃

## 문제 구조

문제는 `src/data/problems/level0`부터 `level5`까지 레벨별 dynamic import로 분리됩니다. 첫 버전에는 JavaScript로 플레이 가능한 Level 0 문제 30개가 포함되어 있습니다. 문제의 `language`와 `supportedLanguages`, `src/core/languages/registry.js`를 통해 언어별 코드와 실행기를 분리 확장합니다.

주요 schema:

```js
{
  id, language, supportedLanguages,
  title, level, difficulty, category, tags,
  description, constraints, examples, starterCode,
  estimatedMinutes, prerequisites, concepts,
  hints, commonMistakes, reviewQuestions,
  testGenerator: { seed, strategy },
  tests, solutionExplanation, referenceSolution
}
```

새 문제는 해당 레벨 모듈에 정의하고 `createProblem()`으로 정규화합니다. 각 문제에는 공개·숨김 테스트, 3~5개 힌트, 설명과 기준 풀이가 필요합니다. `npm run validate:problems`는 ID 중복, 필수 필드, 범위, 테스트 수, 힌트 수와 기준 풀이의 결과를 검사합니다.

`npm run generate:problems -- 10482`는 고정 seed와 검증된 템플릿을 사용하는 확장 manifest를 생성합니다. 같은 seed는 같은 순서를 만듭니다. 목표 분포는 Level 0~5에 200/220/180/120/60/20개입니다.

## 폴더 구조

```text
src/
  app/                 앱 조합
  core/
    curriculum/        학습 배분·추천·난이도
    mastery/           개념 숙련도
    problems/          레벨별 lazy loader
    review/            간격 복습
    runner/            실행·결과 분석
    storage/           IndexedDB와 localStorage
  data/                문제·이론·AI 학습 데이터
  features/            온보딩·에디터·문제 풀이 UI
  workers/             사용자 코드 전용 Worker
  styles/              공통 디자인
scripts/               문제 생성·검증
tests/                 핵심 학습 로직 테스트
```

## 로컬 데이터와 백업

테마·프로필 같은 작은 설정은 `localStorage`에, 진도·작성 코드·메모·학습 기록은 `IndexedDB(loopin-learning)`에 저장합니다. Settings의 데이터 내보내기는 양쪽 데이터를 version 1 JSON으로 묶으며, 가져오기 시 schema version을 확인하고 복구합니다.
