import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLocal, setLocal } from '../../core/storage/db.js';
import { createWorkplaceState, normalizeWorkplaceState, createDailySession, recordWorkplaceAnswer, markWorkplaceTermSeen, getWorkplaceSummary, localDayKey } from '../../core/workplace/learning.js';
import { workplaceCategories, workplaceTerms, workplaceSources } from '../../data/workplaceTerms.js';
import GlossaryText from '../glossary/GlossaryText.jsx';
import './workplace.css';

export const WORKPLACE_STORAGE_KEY = 'loopin-workplace-learning';
const termsById = new Map(workplaceTerms.map((term) => [term.id, term]));
const categoryLabel = (id) => workplaceCategories.find((category) => category.id === id)?.label || id;

export function useWorkplaceLearning() {
  const [state, setState] = useState(() => normalizeWorkplaceState(getLocal(WORKPLACE_STORAGE_KEY, createWorkplaceState()), workplaceTerms));
  const current = useRef(state);
  const [day, setDay] = useState(() => localDayKey(new Date()));
  const [saveError, setSaveError] = useState('');
  const update = useCallback((transform) => {
    const currentDay = localDayKey(new Date());
    if (day !== currentDay) {
      setDay(currentDay);
      setSaveError('날짜가 바뀌었어요. 오늘의 용어를 새로 골라 주세요. 이전 기록은 그대로 저장되어 있어요.');
      return false;
    }
    const next = transform(current.current);
    try {
      setLocal(WORKPLACE_STORAGE_KEY, next);
      current.current = next;
      setState(next);
      setSaveError('');
      return true;
    } catch {
      setSaveError('기록을 저장하지 못했어요. 브라우저 저장 공간과 개인정보 보호 설정을 확인한 뒤 다시 시도해 주세요.');
      return false;
    }
  }, [day]);
  useEffect(() => {
    const checkDay = () => setDay(localDayKey(new Date()));
    const sync = (event) => {
      if (event.key !== WORKPLACE_STORAGE_KEY && event.key !== null) return;
      const next = normalizeWorkplaceState(getLocal(WORKPLACE_STORAGE_KEY, createWorkplaceState()), workplaceTerms);
      current.current = next;
      setState(next);
    };
    const timer = window.setInterval(checkDay, 30000);
    window.addEventListener('focus', checkDay);
    window.addEventListener('storage', sync);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', checkDay); window.removeEventListener('storage', sync); };
  }, []);
  const summary = useMemo(() => getWorkplaceSummary(state, workplaceTerms, day), [state, day]);
  return { state, summary, update, day, saveError };
}

export function WorkplaceTodayCard({ learning, onOpen }) {
  const { state, summary, day } = learning;
  const hasToday = state.session?.day === day && state.session.termIds.length > 0;
  return <section className="workplace-today">
    <span className="workplace-symbol" aria-hidden="true">Aa</span>
    <div><span className="eyebrow">A LITTLE EVERY DAY</span><h2>회의에서 놓쳤던 말, 오늘은 내 말로.</h2>
      <p>{hasToday ? `오늘 ${summary.completedCount} / ${summary.selectedCount}개 완료` : `하루 ${state.preferences.count}개부터 · 분야와 용어를 직접 선택`}
        {' · '}코테와 별도로 약 {(hasToday ? summary.selectedCount : state.preferences.count) * 2}분
        {summary.dueCount > 0 && ` · 복습할 용어 ${summary.dueCount}개`}</p></div>
    <button className="secondary-button" onClick={onOpen}>{hasToday ? summary.complete ? '오늘 결과 보기' : '용어 학습 이어하기' : '오늘의 용어 고르기'} →</button>
  </section>;
}

function TermExplanation({ term }) {
  return <div className="word-explanation">
    <span className="word-category">{categoryLabel(term.category)}</span>
    <h2>{term.term}</h2><p className="word-english">{term.english}</p>
    <p className="word-meaning"><GlossaryText text={term.meaning} /></p>
    <div className="meeting-scene"><span>회의에서는 이렇게 들려요</span><blockquote>“{term.situation.replace(/^“|”$/g, '')}”</blockquote></div>
    <div className="word-translation"><h3>쉬운 말로 풀면</h3><p><GlossaryText text={term.interpretation} /></p></div>
    <div className="word-reply"><h3>이렇게 답하거나 물어보세요</h3><p>“{term.exampleReply}”</p></div>
    <div className="word-distinction"><h3>헷갈리기 쉬운 부분</h3><p><GlossaryText text={term.distinction} /></p></div>
  </div>;
}

function DailyWordSetup({ learning, onStart }) {
  const { state, update, day } = learning;
  const [count, setCount] = useState(state.preferences.count);
  const [categories, setCategories] = useState(state.preferences.categories);
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const [message, setMessage] = useState('');
  const normalizedCount = Math.min(20, Math.max(1, Math.round(Number(count) || 5)));
  const filtered = workplaceTerms.filter((term) => (!categories.length || categories.includes(term.category))
    && [term.term, term.english, ...term.aliases].some((text) => text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const eligibleCount = workplaceTerms.filter((term) => !categories.length || categories.includes(term.category)).length;
  const toggleCategory = (id) => {
    const next = categories.includes(id) ? categories.filter((item) => item !== id) : [...categories, id];
    setCategories(next);
    setSelectedIds((ids) => ids.filter((termId) => !next.length || next.includes(termsById.get(termId)?.category)));
    setMessage('');
  };
  const toggleTerm = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((item) => item !== id));
    else if (selectedIds.length < normalizedCount) setSelectedIds([...selectedIds, id]);
    else setMessage(`오늘 목표가 ${normalizedCount}개예요. 목표 개수를 늘리거나 선택한 용어를 빼 주세요.`);
  };
  const start = () => {
    if (selectedIds.length > normalizedCount) { setMessage('선택한 용어 수만큼 하루 목표를 늘리거나 선택을 줄여 주세요.'); return; }
    if (update((previous) => createDailySession(previous, workplaceTerms, { count: normalizedCount, categories, termIds: selectedIds }, new Date()))) onStart();
  };
  return <div className="word-setup-layout">
    <section className="word-plan-panel">
      <span className="eyebrow">01 · YOUR DAILY PLAN</span><h2>오늘은 몇 개 익힐까요?</h2>
      <p className="support-copy">개수만 정해 추천받아도 되고, 궁금했던 단어를 직접 골라도 좋아요.</p>
      <div className="word-count-presets">{[3, 5, 10].map((value) => <button key={value} className={Number(count) === value ? 'active' : ''} aria-pressed={Number(count) === value} onClick={() => { setCount(value); setMessage(''); }}>{value}개</button>)}
        <label>직접 <input aria-label="하루 용어 개수" type="number" min="1" max="20" value={count} onChange={(event) => setCount(event.target.value)} onBlur={() => setCount(normalizedCount)} />개</label></div>
      <p className="word-plan-note">1~20개 · 약 {normalizedCount * 2}분 · 프로그래밍 언어와 관계없이 같은 진도로 저장</p>
      <h3>배우고 싶은 분야 <small>여러 개 선택 가능</small></h3>
      <div className="word-categories"><button aria-pressed={!categories.length} className={!categories.length ? 'selected' : ''} onClick={() => setCategories([])}>전체 분야</button>
        {workplaceCategories.map((category) => <button key={category.id} className={categories.includes(category.id) ? 'selected' : ''} aria-pressed={categories.includes(category.id)} onClick={() => toggleCategory(category.id)}><strong>{category.label}</strong><span>{category.description}</span></button>)}</div>
      <div className="word-selected"><h3>직접 고른 용어 <small>{selectedIds.length} / {normalizedCount}</small></h3>
        {selectedIds.length ? <div>{selectedIds.map((id) => <button key={id} onClick={() => toggleTerm(id)} aria-label={`${termsById.get(id).term} 선택 해제`}>{termsById.get(id).term} ×</button>)}</div> : <p>선택하지 않은 자리는 복습할 용어와 새로운 용어로 채워요.</p>}</div>
      {eligibleCount < normalizedCount && <p className="word-plan-note">선택한 분야에 있는 {eligibleCount}개만 구성합니다.</p>}
      {state.session?.day === day && <p className="word-plan-note">이미 읽거나 답한 용어는 유지돼요. 새 용어를 추가하면 오늘 총개수가 목표보다 많아질 수 있어요.</p>}
      {message && <p className="word-inline-error" role="alert">{message}</p>}
      <button className="primary-button full" onClick={start}>{selectedIds.length ? '선택한 용어로 학습 시작' : '오늘의 용어 추천받기'} →</button>
    </section>
    <section className="word-library-panel">
      <div className="word-library-heading"><div><span className="eyebrow">02 · PICK WHAT YOU NEED</span><h2>회의 용어 사전 <small>{workplaceTerms.length}개</small></h2></div><span>설명 → 상황 퀴즈 → 복습</span></div>
      <label className="word-search"><span aria-hidden="true">⌕</span><input aria-label="회의 용어 검색" placeholder="카니발매출, 마이그레이션, 포팅, 피저빌리티…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <p className="word-plan-note">회사마다 쓰는 범위가 다를 수 있어요. 상황과 지표의 기준까지 확인하는 연습을 합니다.</p>
      <div className="word-library-list">{filtered.map((term) => <article key={term.id} className={selectedIds.includes(term.id) ? 'selected' : ''}>
        <button className="word-library-info" onClick={() => setPreviewId(previewId === term.id ? null : term.id)} aria-expanded={previewId === term.id}><span>{categoryLabel(term.category)}</span><strong>{term.term}</strong><small>{term.english}</small><em>{previewId === term.id ? '설명 접기 ↑' : '뜻과 상황 보기 ↓'}</em></button>
        <button className="word-pick-button" aria-label={`${term.term} ${selectedIds.includes(term.id) ? '선택 해제' : '선택'}`} aria-pressed={selectedIds.includes(term.id)} onClick={() => toggleTerm(term.id)}>{selectedIds.includes(term.id) ? '✓ 선택됨' : '+ 고르기'}</button>
        {previewId === term.id && <div className="word-library-preview"><TermExplanation term={term} /></div>}
      </article>)}</div>
      {!filtered.length && <div className="word-empty">찾는 용어가 없어요. 검색어를 줄이거나 전체 분야를 선택해 보세요.</div>}
    </section>
  </div>;
}

// Different situations and a deterministic choice rotation prevent memorizing an answer position.
function questionFor(term, day, attempts) {
  const seed = [...`${term.id}:${day}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  const question = term.questions[(seed + attempts) % term.questions.length];
  const options = question.options.map((label, index) => ({ label, correct: index === question.answerIndex }));
  const offset = (seed + attempts) % options.length;
  return { ...question, choices: [...options.slice(offset), ...options.slice(0, offset)] };
}

function WordPractice({ term, learning, onNext, onActivate }) {
  const { state, update, day } = learning;
  const [phase, setPhase] = useState(state.session?.seenTermIds?.includes(term.id) ? 'quiz' : 'learn');
  const [question, setQuestion] = useState(() => questionFor(term, day, state.session?.answers?.[term.id]?.attempts || 0));
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(null);
  const submitting = useRef(false);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [phase]);
  const answer = (choice, index) => {
    if (submitting.current || feedback) return;
    submitting.current = true;
    onActivate(term.id);
    if (update((previous) => recordWorkplaceAnswer(previous, term.id, { correct: choice.correct, assisted: false }, new Date()))) {
      setSelected(index); setFeedback(choice.correct ? 'correct' : 'incorrect');
    }
    submitting.current = false;
  };
  const showMeaning = () => {
    onActivate(term.id);
    if (update((previous) => recordWorkplaceAnswer(previous, term.id, { correct: false, assisted: true }, new Date()))) {
      setFeedback(null); setSelected(null); setPhase('recap');
    }
  };
  const beginQuiz = () => {
    if (!update((previous) => markWorkplaceTermSeen(previous, term.id, new Date()))) return;
    setQuestion(questionFor(term, day, state.session?.answers?.[term.id]?.attempts || 0));
    setSelected(null); setFeedback(null); setPhase('quiz');
  };
  return <article className="word-practice">
    <div className="word-practice-top"><span className="eyebrow">{phase === 'quiz' ? '02 · RECALL IN CONTEXT' : '01 · UNDERSTAND THE SITUATION'}</span><span>{phase === 'quiz' ? '뜻을 떠올려 답해보세요' : '읽는 것만으로 완료 처리되지 않아요'}</span></div>
    {phase !== 'quiz' ? <><div ref={heading} tabIndex={-1}><TermExplanation term={term} /></div><button className="primary-button" onClick={beginQuiz}>{phase === 'recap' ? '다른 상황으로 다시 풀기' : '상황을 이해했어요 · 맞혀보기'} →</button></>
      : <><h2 ref={heading} tabIndex={-1}>이 회의에서 무슨 뜻일까요?</h2><p className="word-question">{question.prompt}</p>
        <div className="word-answer-options">{question.choices.map((choice, index) => <button key={choice.label} disabled={Boolean(feedback)} className={feedback ? choice.correct ? 'correct' : selected === index ? 'incorrect' : '' : ''} onClick={() => answer(choice, index)}><span>{index + 1}</span><p>{choice.label}</p>{feedback && choice.correct && <b>✓ 정답</b>}</button>)}</div>
        {!feedback && <button className="text-button" onClick={showMeaning}>아직 모르겠어요 · 뜻 다시 보기</button>}
        {feedback && <div className={`word-feedback ${feedback}`} role="status"><h3>{feedback === 'correct' ? '맞았어요. 이 상황에서 꺼내 쓸 수 있는 말이에요.' : '괜찮아요. 어떤 부분이 다른지 비교해 볼까요?'}</h3><p>{question.explanation}</p><p className="word-feedback-note">{feedback === 'incorrect' || state.session?.answers?.[term.id]?.hadError || state.session?.answers?.[term.id]?.assisted ? '다른 상황으로 다시 풀고, 내일도 한 번 더 만나요.' : '잊기 전에 다시 만나도록 복습 날짜를 저장했어요.'}</p><div>
          {feedback === 'incorrect' && <button className="secondary-button" onClick={() => setPhase('recap')}>뜻과 차이 다시 보기</button>}
          <button className="primary-button" onClick={onNext}>{feedback === 'correct' ? '다음으로' : '다음 순서로 · 다시 도전'} →</button></div></div>}
      </>}
  </article>;
}

function WordResults({ learning, onConfigure }) {
  const { state, summary } = learning;
  return <section className="word-results"><span className="word-result-mark">✓</span><span className="eyebrow">TODAY, IN YOUR OWN WORDS</span><h2>오늘의 용어를 모두 연습했어요.</h2><p>바로 맞힌 말도, 다시 생각해서 맞힌 말도 따로 기억해 둘게요.</p>
    <div className="word-result-stats"><div><strong>{summary.completedCount}</strong><span>오늘 완료</span></div><div><strong>{summary.firstCorrectCount}</strong><span>첫 시도 정답</span></div><div><strong>{summary.selectedCount - summary.firstCorrectCount}</strong><span>다시 익힌 용어</span></div></div>
    <div className="word-result-list">{state.session.termIds.map((id) => <div key={id}><strong>{termsById.get(id)?.term}</strong><span>{state.session.answers[id]?.hadError || state.session.answers[id]?.assisted ? '내일 다시 보기' : '다음 복습'} · {state.terms[id]?.nextReviewDay}</span></div>)}</div>
    <p className="word-plan-note">틀렸거나 뜻을 다시 본 말은 내일, 스스로 맞힌 말은 1·3·7·14일 간격으로 복습합니다.</p><button className="secondary-button" onClick={onConfigure}>용어 사전 보기 · 오늘 개수 조정</button>
  </section>;
}

export default function WorkplaceLearning({ learning }) {
  const { state, summary, day, saveError } = learning;
  const hasSession = state.session?.day === day && state.session.termIds.length > 0;
  const [configuring, setConfiguring] = useState(!hasSession);
  const [activeId, setActiveId] = useState(null);
  const [round, setRound] = useState(0);
  const pendingIds = hasSession ? state.session.termIds.filter((id) => !state.session.answers[id]?.correct) : [];
  const displayedId = activeId && state.session?.termIds.includes(activeId) ? activeId : pendingIds[0];
  useEffect(() => { setActiveId(null); setRound(0); }, [day]);
  const next = () => {
    const order = state.session.termIds;
    const index = order.indexOf(displayedId);
    const following = [...order.slice(index + 1), ...order.slice(0, index + 1)];
    setActiveId(following.find((id) => pendingIds.includes(id)) || null);
    setRound((value) => value + 1);
  };
  // Keep the final answer explanation visible until the learner presses Next.
  const showResults = summary.complete && !activeId;
  return <main className="page workplace-page">
    <header className="page-header"><div><span className="eyebrow">MEETING LANGUAGE · {day}</span><h1>회의 용어 연습실</h1><p>어려운 말을 쉬운 말로. 듣고, 이해하고, 내 말로 답하는 연습.</p></div><div className="word-header-count"><strong>{summary.learnedCount}</strong><span>/ {workplaceTerms.length}개 익힘</span></div></header>
    {saveError && <div className="word-inline-error" role="alert">{saveError}</div>}
    {!configuring && hasSession && <div className="word-session-bar"><div><strong>오늘 {summary.completedCount} / {summary.selectedCount}개</strong><span>틀린 용어는 다시 연습 · 진도 자동 저장</span></div><button className="text-button" onClick={() => setConfiguring(true)}>분야·개수 변경 / 사전</button><progress aria-label="오늘 용어 학습 진행률" value={summary.completedCount} max={Math.max(1, summary.selectedCount)} /></div>}
    {configuring || !hasSession ? <DailyWordSetup key={day} learning={learning} onStart={() => { setConfiguring(false); setActiveId(null); setRound((value) => value + 1); }} />
      : showResults ? <WordResults learning={learning} onConfigure={() => setConfiguring(true)} />
        : displayedId && <div className="word-study-layout"><aside className="word-today-list"><h2>오늘 고른 용어</h2>{state.session.termIds.map((id, index) => <div key={id} className={displayedId === id ? 'active' : ''}><span>{state.session.answers[id]?.correct ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{termsById.get(id)?.term}</strong><small>{state.session.answers[id]?.correct ? '완료' : state.session.answers[id]?.attempts ? '다시 연습' : categoryLabel(termsById.get(id)?.category)}</small></div></div>)}<p>문장을 읽고 뜻을 익힌 다음, 다른 회의 상황에서 맞혀보세요.</p></aside>
          <WordPractice key={`${displayedId}:${round}:${day}`} term={termsById.get(displayedId)} learning={learning} onNext={next} onActivate={setActiveId} /></div>}
    <footer className="word-sources"><details><summary>용어 설명의 기준과 참고 자료</summary><p>실무에서 통하는 일반적인 뜻을 학습용 상황으로 풀었습니다. 회사·팀마다 표현이 다르므로 대상, 범위, 계산 기준을 함께 확인하세요.</p><div>{workplaceSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div></details></footer>
  </main>;
}
