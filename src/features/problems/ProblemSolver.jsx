import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runCode } from '../../core/runner/runner.js';
import { analyzeFailure } from '../../core/runner/analyzeFailure.js';
import { storage } from '../../core/storage/db.js';
import { calculateMastery } from '../../core/mastery/calculateMastery.js';
import { calculateNextReview } from '../../core/review/calculateNextReview.js';
import { createStruggleProgress, createStruggleRecord } from '../../core/review/createStruggleReview.js';
import { getAvailableLanguages, getCodeStorageKey, getDisplayProblemId, getLanguage, getProblemLanguageVariant } from '../../core/languages/registry.js';
import GlossaryText, { GlossaryGuide } from '../glossary/GlossaryText.jsx';

const CodeEditor = lazy(() => import('../editor/CodeEditor.jsx'));

const stringify = (value) => typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

function TestResults({ result, mode }) {
  if (!result) return <div className="empty-result"><span>⌘ ↵</span><p>코드를 실행하면 결과가 여기에 표시됩니다.</p></div>;
  if (result.status === 'running') return <div className="running-result"><span className="spinner" /> 테스트를 실행하고 있어요…</div>;
  const analysis = analyzeFailure(result);
  if (result.status === 'timeout' || result.status === 'error') return <div className="failure-summary"><strong>{analysis.title}</strong>{analysis.suggestions.map((item) => <p key={item}>↳ {item}</p>)}</div>;
  return (
    <div className="test-list">
      <div className={`result-banner ${result.status}`}><strong>{result.status === 'passed' ? (mode === 'submit' ? '모든 테스트를 통과했어요.' : '공개 테스트를 모두 통과했어요.') : analysis.title}</strong><span>{result.results.filter((item) => item.passed).length} / {result.results.length} 통과</span></div>
      {result.results.map((item) => item.visibility === 'hidden' ? (
        <div className="test-row" key={item.index}><span className={`status-symbol ${item.passed ? 'pass' : 'fail'}`}>{item.passed ? '✓' : '!'}</span><div><b>Hidden test {item.index + 1}</b><small>{item.passed ? '통과' : `${item.label || 'Edge Case'} · ${item.guidance || '경계 조건을 확인해보세요.'}`}</small></div><time>{item.duration.toFixed(1)}ms</time></div>
      ) : (
        <div className="test-row public" key={item.index}><span className={`status-symbol ${item.passed ? 'pass' : 'fail'}`}>{item.passed ? '✓' : '!'}</span><div><b>Public test {item.index + 1}</b>{item.error ? <small>{item.error}</small> : <small>기대 {stringify(item.expected)} · 실제 {stringify(item.actual)}</small>}</div><time>{item.duration.toFixed(1)}ms</time></div>
      ))}
      {result.status === 'failed' && <div className="failure-questions">{analysis.suggestions.map((item) => <p key={item}>→ {item}</p>)}</div>}
    </div>
  );
}

function HintDrawer({ problem, hintLevel, onNext, onClose, onStuck, onGiveUp }) {
  return <aside className="drawer" aria-label="힌트"><div className="drawer-head"><div><span className="eyebrow">STEP BY STEP</span><h2>막힌 부분이 있나요?</h2></div><button className="icon-button" aria-label="힌트 닫기" onClick={onClose}>×</button></div><div className="hint-meter"><span>{hintLevel || 1} / 5</span><div>{[1,2,3,4,5].map((level)=><i key={level} className={level <= Math.max(1,hintLevel) ? 'active' : ''} />)}</div></div><div className="hint-stack">{problem.hints.slice(0, Math.max(1, hintLevel)).map((hint, index)=><div className="hint-item" key={hint}><span>{String(index + 1).padStart(2,'0')}</span><div><small>{['문제 이해','입력과 출력','핵심 관찰','도구 후보','의사코드'][index]}</small><p><GlossaryText text={hint} /></p></div></div>)}</div>{hintLevel < 5 && <button className="primary-button full" onClick={onNext}>다음 방향 열기 <span>→</span></button>}<p className="hint-note">힌트는 점수를 깎기 위한 장치가 아니에요. 복습 시점을 더 잘 정하는 데만 사용합니다.</p><div className="drawer-links"><button onClick={onStuck}>🧭 막힘 코치 시작하기</button><button onClick={onGiveUp}>풀이 포기하고 복기하기</button></div></aside>;
}

const stuckGuidance = {
  '문제 자체가 이해되지 않음': {
    prompt: '입력 하나와 출력 하나를 골라, “무엇을 받아 무엇을 반환해야 하는지” 내 말로 적어보세요.',
    placeholder: '예: 숫자 배열을 받아 가장 큰 값의 위치를 반환한다.',
    clue: '문제의 배경 설명은 잠시 내려놓고 입력의 자료형, 출력의 자료형, 둘 사이에서 바뀌어야 하는 것만 표시해보세요.',
  },
  '접근 방법이 떠오르지 않음': {
    prompt: '가장 작은 예제를 직접 계산한 과정을 한 단계씩 적어보세요. 매 단계에서 기억한 값은 무엇인가요?',
    placeholder: '예: 첫 값을 저장하고 다음 값과 비교해 더 큰 값을 남긴다.',
    clue: '손으로 푼 과정에서 반복되는 행동과 계속 유지되는 값을 찾으면 반복문과 필요한 자료구조가 보입니다.',
  },
  '알고리즘은 알겠는데 구현이 안 됨': {
    prompt: '초기값, 반복할 대상, 매번 바꿀 값, 마지막 반환값을 각각 한 줄로 적어보세요.',
    placeholder: '예: count=0으로 시작 → 배열 순회 → 조건이 맞으면 count 증가 → count 반환',
    clue: '완성된 코드를 한 번에 쓰지 말고 방금 적은 네 줄을 위에서부터 JavaScript 한 줄씩으로 바꿔보세요.',
  },
  '코드는 작성했는데 틀림': {
    prompt: '현재 코드가 실패할 것 같은 입력을 하나 직접 만들고, 기대 결과와 실제 흐름을 적어보세요.',
    placeholder: '예: 빈 배열이면 첫 값이 없어서 undefined가 된다.',
    clue: '공개 예제뿐 아니라 빈 입력, 값 하나, 중복, 최솟값·최댓값, 마지막 인덱스를 코드에 직접 넣어보세요.',
  },
  '시간초과가 발생함': {
    prompt: '입력 하나를 처리할 때 전체 배열을 몇 번 다시 훑는지 적어보세요. 반복문 안에 또 탐색이 있나요?',
    placeholder: '예: 모든 원소마다 includes를 호출해 배열을 다시 훑는다.',
    clue: '이미 본 값을 Map이나 Set에 저장하면 같은 배열을 반복해서 찾는 일을 한 번의 조회로 바꿀 수 있는지 확인해보세요.',
  },
};

function StuckDialog({ problem, languageLabel, onClose, onSave }) {
  const [selected, setSelected] = useState('');
  const [step, setStep] = useState(0);
  const [recall, setRecall] = useState('');
  const [nextAttempt, setNextAttempt] = useState('');
  const [saving, setSaving] = useState(false);
  const guide = selected ? stuckGuidance[selected] : null;

  const choose = (item) => {
    setSelected(item);
    setRecall('');
    setNextAttempt('');
    setStep(1);
  };

  const save = async () => {
    setSaving(true);
    await onSave({ blockage: selected, prompt: guide.prompt, recall, nextAttempt });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal stuck-coach" role="dialog" aria-modal="true" aria-labelledby="stuck-coach-title">
        <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <span className="eyebrow">GUIDED STRUGGLE · {problem.id}</span>
        <h2 id="stuck-coach-title">정답 대신, 기억에 남을<br />다음 한 걸음을 찾아볼게요.</h2>
        <div className="coach-progress" aria-label={`막힘 코치 ${step + 1}단계 중 3단계`}>
          {['막힌 지점', '기억 꺼내기', '다음 시도'].map((label, index) => <span className={index <= step ? 'active' : ''} key={label}><i>{index + 1}</i>{label}</span>)}
        </div>

        {step === 0 && <div className="coach-screen"><h3>지금 어디에서 막혔나요?</h3><p>가장 가까운 상태를 고르면 정답을 노출하지 않고 질문으로 안내합니다.</p><div className="stuck-options">{Object.keys(stuckGuidance).map((item)=><button key={item} onClick={()=>choose(item)}>{item}<span>→</span></button>)}</div></div>}

        {step === 1 && guide && <div className="coach-screen"><button className="coach-back" onClick={()=>setStep(0)}>← 막힌 지점 다시 선택</button><span className="coach-label">먼저 내 기억 사용하기</span><h3><GlossaryText text={guide.prompt} /></h3><p>완벽한 답이 아니어도 괜찮아요. 지금 떠오르는 것부터 적는 과정이 기억을 만듭니다.</p><textarea value={recall} onChange={(event)=>setRecall(event.target.value)} placeholder={guide.placeholder} autoFocus /><div className="coach-actions"><small>{recall.trim().length < 5 ? '5자 이상 적으면 작은 단서가 열려요.' : '좋아요. 이제 작은 단서만 확인해보세요.'}</small><button className="primary-button" disabled={recall.trim().length < 5} onClick={()=>setStep(2)}>작은 단서 보기 <span>→</span></button></div></div>}

        {step === 2 && guide && <div className="coach-screen"><button className="coach-back" onClick={()=>setStep(1)}>← 내 생각 수정하기</button><div className="recall-echo"><small>내가 먼저 떠올린 것</small><p>{recall}</p></div><div className="guided-answer"><span>정답이 아닌 작은 단서</span><p><GlossaryText text={guide.clue.replace('JavaScript', languageLabel)} /></p></div><label className="next-attempt-field"><span>코드로 돌아가 가장 먼저 시도할 한 단계는?</span><textarea value={nextAttempt} onChange={(event)=>setNextAttempt(event.target.value)} placeholder="예: 빈 배열 테스트를 먼저 추가한다." autoFocus /></label><div className="memory-schedule"><span>↻</span><p><strong>내일 다시 떠올리도록 복습 큐에 넣을게요.</strong>지금 적은 내용은 답을 가린 기억 카드로 저장됩니다.</p></div><button className="primary-button full" disabled={nextAttempt.trim().length < 5 || saving} onClick={save}>{saving ? '기억 카드 저장 중…' : '기억 카드 저장하고 다시 풀기'} <span>→</span></button></div>}
      </section>
    </div>
  );
}

function MemoryRecall({ card }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="memory-recall">
      <span>MEMORY CHECK · 지난번 막힌 지점</span>
      <small>{card.blockage}</small>
      <h3><GlossaryText text={card.prompt} /></h3>
      <p>지난 답을 보기 전에 머릿속으로 먼저 설명해보세요.</p>
      <button className="secondary-button" onClick={()=>setRevealed((value)=>!value)}>{revealed ? '기억 카드 접기' : '내가 남긴 기억 카드 보기'}</button>
      {revealed && <div className="memory-reveal"><small>내가 떠올렸던 것</small><p>{card.recall}</p><small>다음에 하기로 한 것</small><p>{card.nextAttempt}</p></div>}
    </section>
  );
}

function GiveUpDialog({ problem, onClose }) {
  const [reflection, setReflection] = useState({ tried: '', blocked: '', reason: '' });
  const [reveal, setReveal] = useState(0);
  const ready = Object.values(reflection).every((value) => value.trim().length >= 3);
  return <div className="modal-backdrop"><section className="modal solution-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose} aria-label="닫기">×</button><span className="eyebrow">포기가 아니라 복기의 시작</span><h2>내 시도를 먼저 남겨주세요.</h2><p className="support-copy">세 문장을 적으면 개념 → 의사코드 → 최종 코드 순서로 확인할 수 있어요.</p><div className="reflection-fields"><label>내가 시도했던 방법<textarea value={reflection.tried} onChange={(event)=>setReflection({...reflection,tried:event.target.value})} /></label><label>막힌 부분<textarea value={reflection.blocked} onChange={(event)=>setReflection({...reflection,blocked:event.target.value})} /></label><label>왜 실패했다고 생각하는지<textarea value={reflection.reason} onChange={(event)=>setReflection({...reflection,reason:event.target.value})} /></label></div>{ready && <div className="solution-reveal"><button className={reveal>=1?'active':''} onClick={()=>setReveal(Math.max(1,reveal))}>1. 개념 설명</button><button disabled={reveal<1} className={reveal>=2?'active':''} onClick={()=>setReveal(Math.max(2,reveal))}>2. 의사코드</button><button disabled={reveal<2} className={reveal>=3?'active':''} onClick={()=>setReveal(3)}>3. 최종 코드</button>{reveal===1 && <div className="solution-content"><p><GlossaryText text={problem.solutionExplanation.concept} /></p><button className="secondary-button" onClick={()=>setReveal(2)}>의사코드 보기 →</button></div>}{reveal===2 && <div className="solution-content"><pre>{problem.solutionExplanation.pseudocode}</pre><button className="secondary-button" onClick={()=>setReveal(3)}>최종 코드 보기 →</button></div>}{reveal===3 && <div className="solution-content"><pre><code>{problem.solutionExplanation.code}</code></pre></div>}</div>}</section></div>;
}

function Retrospective({ problem, onDone }) {
  const [idea, setIdea] = useState('');
  const [complexity, setComplexity] = useState('');
  const [signal, setSignal] = useState('');
  const ready = idea.trim() && complexity && signal.trim();
  return <div className="modal-backdrop"><section className="modal retrospective" role="dialog" aria-modal="true"><div className="success-orbit">✓</div><span className="eyebrow">SOLVED · 짧은 복기</span><h2>좋아요. 이제 풀이를<br />내 것으로 만들 차례예요.</h2><label>이 문제의 핵심 아이디어는?<textarea value={idea} onChange={(event)=>setIdea(event.target.value)} placeholder="예: 이미 본 값을 Set에 저장했다." /></label><fieldset><legend><GlossaryText text="시간복잡도는?" /></legend><div className="complexity-grid">{['O(1)','O(log N)','O(N)','O(N log N)','O(N²)'].map((item)=><button type="button" className={complexity===item?'selected':''} onClick={()=>setComplexity(item)} key={item}>{item}</button>)}</div></fieldset><label>비슷한 문제를 다시 만나면 어떤 신호를 볼까요?<textarea value={signal} onChange={(event)=>setSignal(event.target.value)} placeholder="예: 같은 값을 여러 번 찾고 있는지 본다." /></label><button disabled={!ready} className="primary-button full" onClick={()=>onDone({idea,complexity,signal})}>복기 저장하고 다음 문제 <span>→</span></button></section></div>;
}

export default function ProblemSolver({ problem, languageId, initialProgress, settings, onClose, onProgress, onNext }) {
  const language = getLanguage(languageId || problem.language);
  const variant = getProblemLanguageVariant(problem, language.id);
  const displayProblemId = getDisplayProblemId(problem.id, language.id);
  const codeStorageKey = getCodeStorageKey(problem.id, language.id);
  const noteStorageKey = `${problem.id}:${language.id}`;
  const localizedProblem = useMemo(() => ({
    ...problem,
    id: displayProblemId,
    prerequisites: variant.prerequisites || problem.prerequisites,
    hints: [problem.hints[0], problem.hints[1], problem.hints[2], variant.algorithmHint || problem.hints[3], variant.pseudocode || problem.hints[4]],
    solutionExplanation: {
      ...problem.solutionExplanation,
      pseudocode: variant.pseudocode || problem.solutionExplanation.pseudocode,
      code: variant.referenceSolution || problem.solutionExplanation.code,
    },
  }), [displayProblemId, problem, variant]);
  const [code, setCode] = useState(variant.starterCode);
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [runMode, setRunMode] = useState('run');
  const [running, setRunning] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintLevel, setHintLevel] = useState(initialProgress?.hintsUsed || 0);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [giveUpOpen, setGiveUpOpen] = useState(false);
  const [retrospective, setRetrospective] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(initialProgress?.timeSpent || 0);
  const saveTimer = useRef(null);
  const attempts = useRef(initialProgress?.attempts || 0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      storage.get('code', codeStorageKey),
      language.id === 'javascript' ? storage.get('code', problem.id) : null,
      storage.get('notes', noteStorageKey),
      language.id === 'javascript' ? storage.get('notes', problem.id) : null,
    ]).then(([savedCode, legacyCode, savedNote, legacyNote]) => {
      if (!alive) return;
      setCode(savedCode || legacyCode || variant.starterCode);
      setNote(savedNote || legacyNote || '');
    });
    return () => { alive = false; };
  }, [codeStorageKey, language.id, noteStorageKey, problem.id, variant.starterCode]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.altKey && event.key.toLowerCase() === 'h') { event.preventDefault(); setHintOpen((value) => !value); }
      if (event.altKey && event.key.toLowerCase() === 'n') { event.preventDefault(); onNext(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onNext]);

  const saveCode = useCallback(async () => {
    await storage.set('code', codeStorageKey, code);
  }, [code, codeStorageKey]);

  const updateCode = (value) => {
    setCode(value);
    if (!timerRunning) setTimerRunning(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => storage.set('code', codeStorageKey, value), 500);
  };

  const execute = useCallback(async (mode) => {
    if (running) return;
    setTimerRunning(true);
    setRunning(true);
    setRunMode(mode);
    setResult({ status: 'running' });
    await storage.set('code', codeStorageKey, code);
    const tests = mode === 'run' ? problem.tests.filter((test) => test.visibility === 'public') : problem.tests;
    const nextResult = await runCode({ code, tests, language: language.id, javaSpec: variant.javaSpec, timeout: problem.difficulty >= 4 ? 5000 : 2000 });
    setResult(nextResult);
    setRunning(false);
    if (mode !== 'submit') return;
    attempts.current += 1;
    const solved = nextResult.status === 'passed';
    const newMastery = calculateMastery(initialProgress?.mastery || 0, { solved, firstTry: attempts.current === 1, hintsUsed: hintLevel, timedOut: nextResult.status === 'timeout' });
    const patch = {
      status: solved ? (hintLevel ? 'SOLVED_WITH_HINT' : 'SOLVED') : 'FAILED', attempts: attempts.current,
      hintsUsed: hintLevel, timeSpent: seconds, mastery: newMastery, lastAttempt: new Date().toISOString(),
      reviewCount: solved && initialProgress?.nextReview ? (initialProgress?.reviewCount || 0) + 1 : (initialProgress?.reviewCount || 0),
      nextReview: solved && hintLevel === 0 && !initialProgress?.nextReview ? null : calculateNextReview(new Date(), solved && initialProgress?.nextReview ? (initialProgress?.reviewCount || 0) + 1 : (initialProgress?.reviewCount || 0)),
      failureType: solved ? null : nextResult.status,
    };
    onProgress(problem.id, patch, language.id);
    if (solved) { setTimerRunning(false); setRetrospective(true); }
  }, [code, codeStorageKey, hintLevel, initialProgress, language.id, onProgress, problem, running, seconds, variant.javaSpec]);

  const useHint = () => {
    setHintLevel((level) => {
      const next = Math.min(5, Math.max(1, level + 1));
      onProgress(problem.id, { status: 'TRYING', hintsUsed: next, timeSpent: seconds }, language.id);
      return next;
    });
  };

  const saveStruggle = async ({ blockage, prompt, recall, nextAttempt }) => {
    const record = { ...createStruggleRecord({ problemId: problem.id, blockage, prompt, recall, nextAttempt }), language: language.id };
    const progressPatch = createStruggleProgress(initialProgress, record, hintLevel);
    await storage.set('notes', `${noteStorageKey}-struggle-${Date.now()}`, record);
    setHintLevel(progressPatch.hintsUsed);
    onProgress(problem.id, progressPatch, language.id);
    setStuckOpen(false);
    setHintOpen(false);
    setTimerRunning(true);
  };

  const finishReview = async (review) => {
    const record = { ...review, problemId: problem.id, language: language.id, createdAt: new Date().toISOString() };
    await storage.set('notes', `${noteStorageKey}-review-${Date.now()}`, record);
    setRetrospective(false);
    onProgress(problem.id, { reflection: review }, language.id);
    onNext();
  };

  const resetCode = () => {
    if (window.confirm('작성한 코드를 시작 코드로 되돌릴까요?')) {
      setCode(variant.starterCode);
      storage.set('code', codeStorageKey, variant.starterCode);
      setResult(null);
    }
  };

  const difficultyLabel = ['','입문','기초','도전','심화','고급'][problem.difficulty];
  return (
    <main className={`solver ${focusMode ? 'focus-mode' : ''}`}>
      <header className="solver-header"><div className="solver-brand"><button className="back-button" onClick={onClose} aria-label="문제 목록으로">←</button><span className="brand-mark small">L</span><div><span>{displayProblemId}</span><strong>{problem.title}</strong></div></div><div className="problem-meta"><span>Level {problem.level}</span><span>·</span><span>{difficultyLabel}</span><span>·</span><span>약 {problem.estimatedMinutes}분</span></div><div className="solver-tools"><button className="timer" onClick={()=>setTimerRunning((value)=>!value)} aria-label={timerRunning?'타이머 일시정지':'타이머 시작'}><i className={timerRunning?'live':''} />{formatTime(seconds)} <span>{timerRunning?'Ⅱ':'▶'}</span></button><button className="timer-reset" onClick={()=>{setTimerRunning(false);setSeconds(0);}} aria-label="타이머 초기화">↺</button><button className="tool-button" onClick={()=>setFocusMode((value)=>!value)}>{focusMode?'집중 모드 종료':'집중 모드'}</button><button className={`tool-button hint-trigger ${hintOpen?'active':''}`} onClick={()=>setHintOpen((value)=>!value)}>💡 조금만 도와줘 {hintLevel > 0 && <b>{hintLevel}</b>}</button></div></header>
      <div className="solver-body"><section className="problem-pane"><div className="pane-tabs"><button className="active">문제</button><button onClick={()=>document.querySelector('.memo-area')?.focus()}>내 메모</button></div><article className="problem-copy"><div className="problem-title-row"><span className="level-chip">LEVEL {problem.level}</span><span>{difficultyLabel}</span></div><h1>{problem.title}</h1><GlossaryGuide compact />{initialProgress?.recallCard && <MemoryRecall card={initialProgress.recallCard} />}<p className="problem-description"><GlossaryText text={problem.description} /></p><h3>제한사항</h3><ul>{problem.constraints.map((item)=><li key={item}><GlossaryText text={item} /></li>)}</ul><h3>입출력 예</h3>{problem.examples.map((example,index)=><div className="example" key={index}><span>예제 {index+1}</span><div><small>입력</small><code>{example.args.map(stringify).join(', ')}</code></div><div><small>출력</small><code>{stringify(example.expected)}</code></div></div>)}<h3>내 메모</h3><textarea className="memo-area" value={note} onChange={(event)=>{setNote(event.target.value);storage.set('notes',noteStorageKey,event.target.value);}} placeholder="떠오른 관찰, 시도할 방법, 놓치기 쉬운 조건을 적어보세요." /></article></section><section className="workspace-pane"><div className="editor-toolbar"><div className="language-picker"><span className="language-dot" /><select aria-label="풀이 언어" value={language.id} onChange={(event)=>settings.onChange('learningLanguage',event.target.value)}>{getAvailableLanguages().filter((item)=>problem.supportedLanguages.includes(item.id)).map((item)=><option value={item.id} key={item.id}>{item.label}</option>)}</select><small>solution()</small>{language.runtimeRequirement&&<em>{language.runtimeRequirement}</em>}</div><div><button onClick={()=>setCode(variant.starterCode)} title="시작 코드로 되돌리기">↶</button><label>글자 <select value={settings.editorFontSize} onChange={(event)=>settings.onChange('editorFontSize',Number(event.target.value))}>{[13,14,15,16,18].map((size)=><option key={size}>{size}</option>)}</select></label></div></div><div className="editor-host"><Suspense fallback={<div className="editor-loading"><span className="spinner" /> 에디터 불러오는 중</div>}><CodeEditor value={code} problemId={`${problem.id}:${language.id}`} language={language.id} languageLabel={language.label} onChange={updateCode} onRun={()=>execute('run')} onSubmit={()=>execute('submit')} onSave={saveCode} theme={settings.theme} fontSize={settings.editorFontSize} /></Suspense></div><div className="result-pane"><div className="result-head"><div><strong>Test Result</strong>{result && result.status!=='running' && <span className={`run-status ${result.status}`}>{result.status}</span>}</div><button onClick={()=>setResult(null)}>비우기</button></div><div className="result-content"><TestResults result={result} mode={runMode} /></div><div className="action-bar"><button className="text-button danger" onClick={resetCode}>초기화</button><div><span className="shortcut-help">⌘ ↵ 실행 · ⇧ ⌘ ↵ 제출</span><button className="secondary-button" disabled={running} onClick={()=>execute('run')}>실행</button><button className="primary-button" disabled={running} onClick={()=>execute('submit')}>제출하기 <span>→</span></button></div></div></div></section></div>
      {hintOpen && <HintDrawer problem={localizedProblem} hintLevel={hintLevel} onNext={useHint} onClose={()=>setHintOpen(false)} onStuck={()=>setStuckOpen(true)} onGiveUp={()=>setGiveUpOpen(true)} />}
      {stuckOpen && <StuckDialog problem={localizedProblem} languageLabel={language.label} onClose={()=>setStuckOpen(false)} onSave={saveStruggle} />}
      {giveUpOpen && <GiveUpDialog problem={localizedProblem} onClose={()=>setGiveUpOpen(false)} />}
      {retrospective && <Retrospective problem={problem} onDone={finishReview} />}
    </main>
  );
}
