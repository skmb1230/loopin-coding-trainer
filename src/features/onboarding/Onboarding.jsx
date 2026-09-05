import { useMemo, useState } from 'react';
import { calculateStudyAllocation } from '../../core/curriculum/calculateStudyAllocation.js';
import { getLanguage } from '../../core/languages/registry.js';

const javascriptDiagnostics = [
  { area: '문자열', question: "'hello'.slice(1, 4)의 결과는?", options: ['ell', 'ello', 'hel'], answer: 0 },
  { area: '배열', question: '[1, 2, 3].map(x => x * 2)의 결과는?', options: ['[2, 4, 6]', '6', '[1, 2, 3, 2]'], answer: 0 },
  { area: 'Map/Set', question: '중복 없는 값의 존재 여부를 빠르게 확인할 때 알맞은 것은?', options: ['Set', 'Array.shift', 'JSON.stringify'], answer: 0 },
  { area: '구현', question: '배열의 마지막 유효 인덱스는?', options: ['length', 'length - 1', 'length + 1'], answer: 1 },
  { area: '정렬', question: '숫자 오름차순 sort comparator는?', options: ['(a,b) => a-b', '(a,b) => a>b', '생략한다'], answer: 0 },
  { area: 'Stack', question: '가장 나중에 넣은 값부터 꺼내는 구조는?', options: ['Queue', 'Stack', 'Set'], answer: 1 },
  { area: '완전탐색', question: '후보 수가 작을 때 모든 경우를 확인하는 접근은?', options: ['완전탐색', '이진탐색', '위상정렬'], answer: 0 },
  { area: '시간복잡도', question: '길이 N 배열을 한 번 순회할 때 복잡도는?', options: ['O(1)', 'O(log N)', 'O(N)'], answer: 2 },
];

const javaDiagnostics = [
  { area: '문자열', question: '"hello".substring(1, 4)의 결과는?', options: ['ell', 'ello', 'hel'], answer: 0 },
  { area: '배열', question: 'int[] numbers = {1, 2, 3}; 배열 길이를 읽는 표현은?', options: ['numbers.length', 'numbers.length()', 'numbers.size()'], answer: 0 },
  { area: 'Map/Set', question: '중복 없는 값의 존재 여부를 빠르게 확인할 때 알맞은 것은?', options: ['HashSet', 'ArrayList.remove', 'StringBuilder'], answer: 0 },
  { area: '구현', question: '배열의 마지막 유효 인덱스는?', options: ['length', 'length - 1', 'length + 1'], answer: 1 },
  { area: '정렬', question: 'int[]를 오름차순 정렬하는 표준 메서드는?', options: ['Arrays.sort(numbers)', 'numbers.sort()', 'Collections.sort(numbers)'], answer: 0 },
  { area: 'Stack', question: 'Java에서 스택·큐를 구현할 때 자주 권장되는 인터페이스는?', options: ['Deque', 'String', 'TreeMap'], answer: 0 },
  { area: '완전탐색', question: '후보 수가 작을 때 모든 경우를 확인하는 접근은?', options: ['완전탐색', '이진탐색', '위상정렬'], answer: 0 },
  { area: '시간복잡도', question: '길이 N 배열을 한 번 순회할 때 복잡도는?', options: ['O(1)', 'O(log N)', 'O(N)'], answer: 2 },
];

const diagnosticsForLanguage = (languageId) => languageId === 'java' ? javaDiagnostics : javascriptDiagnostics;
export const diagnosticStartLevel = (score) => score >= 7 ? 1 : 0;

const steps = ['기본 정보', '학습 목표', '시작점'];

const experienceDepth = (years = '') => {
  const firstNumber = Number.parseInt(years, 10) || 0;
  if (firstNumber >= 8) return '시니어 심화';
  if (firstNumber >= 4) return '실무 심화';
  if (firstNumber >= 2) return '실무 기초';
  return '기초 연결';
};

export function OnboardingResult({ profile, onComplete }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const finish = async () => {
    if (saving) return;
    setSaving(true); setSaveError('');
    try { await onComplete({ ...profile, onboardingResultSeen: true }); }
    catch { setSaveError('시작 설정을 저장하지 못했어요. 진단 결과는 이 화면에 유지됩니다. 저장 공간과 브라우저 설정을 확인한 뒤 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  };
  const diagnostics = diagnosticsForLanguage(profile.learningLanguage);
  const language = getLanguage(profile.learningLanguage);
  const score = profile.diagnosticScore || 0;
  const tookDiagnostic = profile.diagnosticTaken ?? score > 0;
  const answers = profile.diagnosticAnswers || [];
  const allocation = calculateStudyAllocation(profile.dailyMinutes || 120, 'beginner');
  const algorithmTrack = !tookDiagnostic
    ? 'Level 0 · 차근차근'
    : profile.startLevel >= 1 ? 'Level 1 · 기초 확인 병행' : score >= 4 ? 'Level 0 · 핵심 트랙' : 'Level 0 · 기초 강화';
  const firstFocus = tookDiagnostic
    ? diagnostics.filter((item, index) => answers[index] !== item.answer).map((item) => item.area).slice(0, 3)
    : ['배열', '문자열', '반복문'];

  return (
    <main className="result-shell">
      <section className="result-main">
        <div className="brand brand-large"><span className="brand-mark">L</span> loopin</div>
        <div className="result-heading">
          <span className="eyebrow">YOUR STARTING POINT</span>
          <h1>시작할 준비가 됐어요.</h1>
          <p>{language.label} 학습과 실무 경력, 코딩테스트 실력을 분리해 첫 경로를 만들었습니다.</p>
        </div>

        <div className="assessment-summary">
          <div className="score-ring"><strong>{tookDiagnostic ? score : '—'}</strong><span>{tookDiagnostic ? '/ 8' : '미응시'}</span></div>
          <div><small>코딩테스트 진단</small><h2>{algorithmTrack}</h2><p>{tookDiagnostic ? `${8 - score}개 영역은 쉬운 문제로 다시 연결하고, 익숙한 영역은 빠르게 통과합니다.` : '진단 점수 대신 기초 문제의 실제 풀이 기록으로 난이도를 조정합니다.'}</p></div>
        </div>

        <div className="separate-tracks">
          <article><span>01</span><small>ALGORITHM TRACK</small><h3>{algorithmTrack}</h3><p>문제 난이도는 오직 진단과 실제 풀이 기록으로 조정</p></article>
          <article><span>02</span><small>{language.label.toUpperCase()} THEORY TRACK</small><h3>{experienceDepth(profile.frontendYears)}</h3><p>{profile.frontendYears} 경력을 참고한 추천 깊이 · 이론 주제는 직접 선택</p></article>
        </div>

        <div className="result-focus"><div><small>FIRST FOCUS</small><strong>{firstFocus.length ? firstFocus.join(' · ') : 'Map/Set · 구현 심화'}</strong></div><div><small>WEEKLY RHYTHM</small><strong>주 {formatResultTime((profile.dailyMinutes || 120) * (profile.daysPerWeek || 5))}</strong></div><div><small>TARGET</small><strong>{profile.targetWeeks}주 · {profile.goal}</strong></div></div>
        <div className="result-notice"><span>i</span><p><b>{formatResultTime(profile.dailyMinutes)}은 기본값이에요.</b> 실제 계획은 매일 “오늘 가능한 시간”을 다시 확인한 뒤 만듭니다.</p></div>
        {saveError && <p className="data-action-error" role="alert">{saveError}</p>}
        <button className="primary-button result-cta" disabled={saving} onClick={finish}>{saving ? '시작 설정 저장 중…' : '오늘 계획 만들기'} <span>→</span></button>
      </section>
      <aside className="result-aside">
        <span className="aside-kicker">DEFAULT DAY · {formatResultTime(profile.dailyMinutes)}</span>
        <h2>첫 학습 배분</h2>
        <p>오늘 시간에 맞춰 세션과 문제 수가 달라집니다. 짧은 날에는 Git·AWS를 줄이고 핵심 학습을 우선합니다.</p>
        <div className="result-allocation">
          {[
            ['problems', '코딩테스트 문제', '55%'],
            ['theory', `${language.label} · 알고리즘 이론`, '15%'],
            ['ai', 'AI · FE 학습', '10%'],
            ['systems', 'SMTP · 네트워크 · 보안', '10%'],
            ['career', 'Git · AWS 면접', '5%'],
            ['review', '오답 복습', '5%'],
          ].map(([key, label]) => <div key={key}><span className={key}>{Math.round(allocation[key] / (profile.dailyMinutes || 120) * 100)}%</span><p><strong>{label}</strong><small>{formatResultTime(allocation[key])}</small></p></div>)}
        </div>
        <div className="result-principle"><small>ADAPTIVE PLAN</small><p>정답률이 떨어지면 난이도만 낮추지 않고, 같은 개념의 더 작은 문제로 연결합니다.</p></div>
      </aside>
    </main>
  );
}

function formatResultTime(minutes = 0) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}시간${rest ? ` ${rest}분` : ''}` : `${rest}분`;
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [diagnosticIndex, setDiagnosticIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [resultProfile, setResultProfile] = useState(null);
  const [profile, setProfile] = useState({
    careerYears: '6~7년', frontendYears: '6~7년', codingTestLevel: '처음', dailyMinutes: 240,
    daysPerWeek: 5, targetWeeks: 12, goal: '일반 FE 이직', focusMinutes: 50, learningLanguage: 'javascript',
  });
  const canContinue = useMemo(() => profile.dailyMinutes > 0 && profile.daysPerWeek > 0, [profile]);
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));

  const answerDiagnostic = (answer) => {
    const diagnostics = diagnosticsForLanguage(profile.learningLanguage);
    const nextAnswers = [...answers, answer];
    if (diagnosticIndex === diagnostics.length - 1) {
      const score = nextAnswers.reduce((sum, value, index) => sum + (value === diagnostics[index].answer ? 1 : 0), 0);
      setResultProfile({ ...profile, diagnosticScore: score, diagnosticTaken: true, diagnosticAnswers: nextAnswers, startLevel: diagnosticStartLevel(score) });
      return;
    }
    setAnswers(nextAnswers);
    setDiagnosticIndex((index) => index + 1);
  };

  if (resultProfile) return <OnboardingResult profile={resultProfile} onComplete={onComplete} />;

  if (diagnosticMode) {
    const diagnostics = diagnosticsForLanguage(profile.learningLanguage);
    const item = diagnostics[diagnosticIndex];
    return (
      <main className="onboarding-shell">
        <section className="diagnostic-panel">
          <div className="brand brand-large"><span className="brand-mark">L</span> loopin</div>
          <div className="eyebrow">진단 {diagnosticIndex + 1} / {diagnostics.length} · {item.area}</div>
          <div className="diagnostic-progress"><span style={{ width: `${((diagnosticIndex + 1) / diagnostics.length) * 100}%` }} /></div>
          <h1>{item.question}</h1>
          <p className="support-copy">모르면 괜찮아요. 현재 위치를 정하기 위한 짧은 확인입니다.</p>
          <div className="option-stack">
            {item.options.map((option, index) => <button key={option} className="choice-button" onClick={() => answerDiagnostic(index)}>{String.fromCharCode(65 + index)}<span>{option}</span></button>)}
          </div>
          <button className="text-button" onClick={() => setResultProfile({ ...profile, diagnosticScore: 0, diagnosticTaken: false, startLevel: 0 })}>진단을 그만두고 Level 0부터 시작</button>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel">
        <div className="brand brand-large"><span className="brand-mark">L</span> loopin</div>
        <div className="step-indicator" aria-label="온보딩 진행 단계">
          {steps.map((label, index) => <div key={label} className={index <= step ? 'active' : ''}><span>{index + 1}</span>{label}</div>)}
        </div>

        {step === 0 && <div className="onboarding-content"><div className="eyebrow">나에게 맞는 출발점</div><h1>경력과 코테 실력은<br />따로 보고 시작할게요.</h1><p className="support-copy">개발 경력은 이론 깊이에만, 문제 난이도는 별도의 진단 결과에만 반영합니다.</p><div className="form-grid"><label className="wide">먼저 학습할 언어<select value={profile.learningLanguage} onChange={(event) => update('learningLanguage', event.target.value)}><option value="javascript">JavaScript</option><option value="java">Java</option></select></label><label>전체 개발 경력<select value={profile.careerYears} onChange={(event) => update('careerYears', event.target.value)}>{['0~1년','2~3년','4~5년','6~7년','8~10년','10년+'].map((item)=><option key={item}>{item}</option>)}</select></label><label>프론트엔드 경력<select value={profile.frontendYears} onChange={(event) => update('frontendYears', event.target.value)}>{['0~1년','2~3년','4~5년','6~7년','8~10년','10년+'].map((item)=><option key={item}>{item}</option>)}</select></label><label className="wide">코딩테스트 경험<select value={profile.codingTestLevel} onChange={(event) => update('codingTestLevel', event.target.value)}>{['처음','Level 0','Level 1','Level 2','Level 3+'].map((item)=><option key={item}>{item}</option>)}</select></label></div></div>}
        {step === 1 && <div className="onboarding-content"><div className="eyebrow">현실적인 학습 리듬</div><h1>꾸준히 지킬 수 있는<br />시간을 알려주세요.</h1><p className="support-copy">하루 시간을 문제풀이·이론·AI·네트워크·보안·복습으로 나누고, 여유 있는 날에만 Git·AWS 면접 학습을 짧게 넣습니다.</p><div className="form-grid"><label>하루 학습 시간<select value={profile.dailyMinutes} onChange={(event) => update('dailyMinutes', Number(event.target.value))}>{[[30,'30분'],[60,'1시간'],[120,'2시간'],[180,'3시간'],[240,'4시간'],[300,'5시간'],[360,'6시간']].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>주당 학습일<select value={profile.daysPerWeek} onChange={(event) => update('daysPerWeek', Number(event.target.value))}>{[2,3,4,5,6,7].map((item)=><option value={item} key={item}>{item}일</option>)}</select></label><label>목표 기간<select value={profile.targetWeeks} onChange={(event) => update('targetWeeks', Number(event.target.value))}>{[4,8,12,16].map((item)=><option value={item} key={item}>{item}주</option>)}</select></label><label>집중 세션<select value={profile.focusMinutes} onChange={(event) => update('focusMinutes', Number(event.target.value))}>{[25,40,50,60,90].map((item)=><option value={item} key={item}>{item}분</option>)}</select></label><label className="wide">목표<select value={profile.goal} onChange={(event) => update('goal', event.target.value)}>{['이직 준비','대기업 코테','일반 FE 이직','알고리즘 기초','개인 공부'].map((item)=><option key={item}>{item}</option>)}</select></label></div></div>}
        {step === 2 && <div className="onboarding-content start-choice"><div className="eyebrow">마지막 선택</div><h1>어디서부터 시작할까요?</h1><p className="support-copy">8개의 짧은 질문으로 시작점을 찾거나, 부담 없이 Level 0부터 시작할 수 있어요.</p><button className="start-card recommended" onClick={() => setDiagnosticMode(true)}><span className="tag">추천</span><strong>8문제 진단으로 시작</strong><small>약 5분 · 문자열부터 시간복잡도까지</small><span>진단 시작 →</span></button><button className="start-card" onClick={() => setResultProfile({ ...profile, diagnosticScore: 0, diagnosticTaken: false, startLevel: 0 })}><strong>그냥 Level 0부터 시작</strong><small>기초 사고 과정부터 차근차근</small><span>결과 확인 →</span></button></div>}

        {step < 2 && <div className="onboarding-actions"><button className="secondary-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>이전</button><button className="primary-button" disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>계속하기 <span>→</span></button></div>}
      </section>
      <aside className="onboarding-aside"><div><span className="aside-kicker">THE LOOPIN METHOD</span><blockquote>“정답을 외우는 대신,<br />다음 질문을 스스로<br />떠올리는 연습.”</blockquote></div><div className="method-list"><div><span>01</span><p><b>Understand</b>문제를 내 언어로 바꾸기</p></div><div><span>02</span><p><b>Observe</b>예제에서 반복되는 규칙 찾기</p></div><div><span>03</span><p><b>Implement</b>작은 단계부터 코드로 옮기기</p></div><div><span>04</span><p><b>Review</b>풀이 신호를 내 것으로 만들기</p></div></div></aside>
    </main>
  );
}
