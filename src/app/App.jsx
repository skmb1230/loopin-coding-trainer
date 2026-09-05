import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Onboarding, { OnboardingResult } from '../features/onboarding/Onboarding.jsx';
import { loadProblemsByLevel, loadProblemsByLevels } from '../core/problems/problemLoader.js';
import { storage, getLocal, setLocal, clearLocalLearningData } from '../core/storage/db.js';
import { calculateConceptMastery } from '../core/mastery/calculateMastery.js';
import { calculateStudyAllocation, buildStudySessions, migrateCompletedStudySessions } from '../core/curriculum/calculateStudyAllocation.js';
import { selectDailyProblems } from '../core/curriculum/selectDailyProblems.js';
import { calculateStudyStreak, isSolvedOnLocalDay, deriveCurriculumState, getLevelsReferencedByIds, getLevelsReferencedByProgress, getProblemIdFromStorageKey, getProblemLevel, problemCountsByLevel } from '../core/curriculum/curriculumEngine.js';
import { theoryTopics, javaTheoryTopics, aiTopics, careerTopics } from '../data/learningContent.js';
import { systemsSecurityTopics } from '../data/systemsSecurityContent.js';
import GlossaryText, { GlossaryGuide } from '../features/glossary/GlossaryText.jsx';
import { getAvailableLanguages, getDisplayProblemId, getLanguage, getProgressStorageKey } from '../core/languages/registry.js';
import { normalizeSettings } from '../core/storage/settings.js';
import { localDayKey } from '../core/dates/localDay.js';
const WORKPLACE_STORAGE_KEY = 'loopin-workplace-learning';
const WorkplaceLearning = lazy(() => import('../features/workplace/WorkplaceLearning.jsx'));

const ProblemSolver = lazy(() => import('../features/problems/ProblemSolver.jsx'));

const navItems = [
  ['today', '◫', 'Today'], ['problems', '⌁', 'Problems'], ['roadmap', '⌘', 'Roadmap'], ['review', '↻', 'Review'],
  ['theory', '◈', 'Theory'], ['ai', '✦', 'AI'], ['systems', '◎', 'Network · Security'], ['words', 'Aa', '회의 용어'], ['career', '◇', 'Git · AWS'], ['notes', '≡', 'Notes'], ['analytics', '⌗', 'Analytics'], ['settings', '⚙', 'Settings'],
];

const statusLabels = {
  NOT_STARTED: '시작 전', TRYING: '풀이 중', SOLVED: '해결', SOLVED_WITH_HINT: '힌트로 해결', FAILED: '복습 필요', REVIEW: '복습 예정', MASTERED: '익숙함',
};

const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}시간${rest ? ` ${rest}분` : ''}` : `${rest}분`;
};

const dateLabel = () => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(new Date());
const legacyTodayKey = (day = localDayKey(new Date())) => `daily-${day}`;
const todayKey = (languageId = 'javascript', day = localDayKey(new Date())) => `daily-${day}:${languageId}`;
const languageChoiceKey = () => `loopin-language-choice:${localDayKey(new Date())}`;
const dailyProblemCount = (minutes) => minutes <= 30 ? 2 : minutes <= 60 ? 3 : minutes <= 120 ? 4 : minutes <= 180 ? 5 : minutes <= 240 ? 7 : minutes <= 300 ? 8 : 9;

const progressForLanguage = (problems, progress, languageId) => problems.reduce((result, problem) => {
  const record = progress[getProgressStorageKey(problem.id, languageId)] || (languageId === 'javascript' ? progress[problem.id] : undefined);
  if (record) result[problem.id] = record;
  return result;
}, {});

function Sidebar({ active, collapsed, onToggle, onNavigate, profile, languageId, currentLevel }) {
  const renderItem = ([id, icon, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onNavigate(id)} aria-label={label} aria-current={active === id ? 'page' : undefined} title={collapsed ? label : undefined}><span aria-hidden="true">{icon}</span>{!collapsed && <span className="nav-item-label">{label}</span>}</button>;
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="sidebar-top"><button className="brand" onClick={() => onNavigate('today')} aria-label="loopin 오늘의 학습"><span className="brand-mark">L</span>{!collapsed && <b>loopin</b>}</button><button className="collapse-button" onClick={onToggle} aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}>{collapsed ? '›' : '‹'}</button></div>
    <nav aria-label="학습 메뉴">
      {navItems.filter(([id]) => ['today','problems','roadmap','review'].includes(id)).map(renderItem)}
      <div className="nav-label">{!collapsed && 'LEARN'}</div>
      {navItems.filter(([id]) => ['theory','ai','systems','career'].includes(id)).map(renderItem)}
      <div className="nav-label">{!collapsed && '선택 학습'}</div>
      {navItems.filter(([id]) => id === 'words').map(renderItem)}
      <div className="nav-spacer" />
      {navItems.filter(([id]) => ['notes','analytics','settings'].includes(id)).map(renderItem)}
    </nav>
    <div className="profile-mini"><span>{getLanguage(languageId).label.slice(0,1)}</span>{!collapsed && <div><strong>{getLanguage(languageId).label} Track</strong><small>Level {currentLevel} · {profile?.goal || '코딩테스트 학습'}</small></div>}</div>
  </aside>;
}

function PageHeader({ eyebrow, title, description, action }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</header>;
}

function DailyTimeControl({ minutes, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const [customHours, setCustomHours] = useState(String(minutes / 60));
  const options = [[30,'30분'],[60,'1시간'],[90,'1시간 30분'],[120,'2시간'],[180,'3시간'],[240,'4시간'],[300,'5시간'],[360,'6시간']];
  const apply = (value) => { onChange(value); setCustomHours(String(value / 60)); setOpen(false); };
  return <div className={`daily-time-control ${compact?'compact':''}`}><button className="daily-time-button" onClick={()=>setOpen((value)=>!value)} aria-expanded={open}><span>오늘 가능 시간</span><strong>{formatMinutes(minutes)}</strong><i>⌄</i></button>{open&&<div className="time-popover"><small>TODAY'S AVAILABLE TIME</small><h3>오늘은 얼마나 할 수 있나요?</h3><p>오늘 계획에만 적용되고 기본 설정은 바뀌지 않아요.</p><div>{options.map(([value,label])=><button className={minutes===value?'active':''} key={value} onClick={()=>apply(value)}>{label}</button>)}</div><label>직접 입력 <span><input type="number" min="0.5" max="12" step="0.5" value={customHours} onChange={(event)=>setCustomHours(event.target.value)} /> 시간</span></label><button className="primary-button full" onClick={()=>apply(Math.min(720,Math.max(30,Math.round(Number(customHours||1)*60))))}>이 시간으로 계획 조정</button></div>}</div>;
}

function LanguageStartSetup({ selectedLanguage, onConfirm }) {
  const languages = [
    { id:'javascript', mark:'JS', title:'JavaScript', description:'Web Worker에서 안전하게 실행하며 프론트엔드 코테 문법과 알고리즘을 함께 연습합니다.', meta:'별도 런타임 설치 없음' },
    { id:'java', mark:'J', title:'Java', description:'같은 문제를 Java 타입·컬렉션·표준 라이브러리 방식으로 풀고 별도 진도를 쌓습니다.', meta:'문제 실행 시 JDK 21 이상' },
  ];
  return <div className="modal-backdrop language-start-backdrop"><section className="modal language-start" role="dialog" aria-modal="true" aria-labelledby="language-start-title"><span className="eyebrow">CHOOSE TODAY'S LANGUAGE · {dateLabel()}</span><h2 id="language-start-title">오늘은 어떤 언어로<br />공부할까요?</h2><p className="support-copy">언어마다 코드·진도·복습·오늘 계획이 따로 저장됩니다. 나중에 Settings에서도 언제든 바꿀 수 있어요.</p><div className="language-start-options">{languages.map((language)=><button className={selectedLanguage===language.id?'selected':''} onClick={()=>onConfirm(language.id)} key={language.id}><span>{language.mark}</span><div><small>{selectedLanguage===language.id?'LAST SELECTED':'LEARNING TRACK'}</small><strong>{language.title}</strong><p>{language.description}</p><em>{language.meta}</em></div><b>→</b></button>)}</div></section></div>;
}

function DailyTimeSetup({ defaultMinutes, onConfirm }) {
  const [minutes, setMinutes] = useState(defaultMinutes || 120);
  const [customHours, setCustomHours] = useState('');
  const options = [[30,'30분'],[60,'1시간'],[120,'2시간'],[180,'3시간'],[240,'4시간'],[300,'5시간'],[360,'6시간']];
  const customValue = Math.min(720, Math.max(30, Math.round(Number(customHours || 0) * 60)));
  return <div className="modal-backdrop daily-setup-backdrop"><section className="modal daily-setup" role="dialog" aria-modal="true"><span className="eyebrow">PLAN FOR TODAY · {dateLabel()}</span><h2>오늘은 몇 시간<br />공부할 수 있나요?</h2><p className="support-copy">초기 설정 시간은 기본값일 뿐이에요. 오늘 상황에 맞춰 문제 수와 세션을 다시 구성할게요.</p><div className="daily-time-options">{options.map(([value,label])=><button className={minutes===value&&!customHours?'selected':''} key={value} onClick={()=>{setMinutes(value);setCustomHours('');}}><strong>{label}</strong><small>{dailyProblemCount(value)}문제 내외</small></button>)}</div><label className="custom-time-field"><span>직접 입력</span><div><input type="number" min="0.5" max="12" step="0.5" placeholder="예: 2.5" value={customHours} onChange={(event)=>setCustomHours(event.target.value)} /> 시간</div></label><div className="daily-plan-preview"><span><b>{formatMinutes(customHours?customValue:minutes)}</b> 학습</span><i>→</i><span><b>{dailyProblemCount(customHours?customValue:minutes)}문제</b> + 이론 · 네트워크/보안 · 복습{(customHours?customValue:minutes)>=120?' · Git/AWS':''}</span></div><button className="primary-button full" onClick={()=>onConfirm(customHours?customValue:minutes)}>오늘 계획 만들기 <span>→</span></button></section></div>;
}

function TodayPage({ profile, daily, todayMinutes, onTimeChange, progress, mastery, onOpen, settings, languageId, curriculum, completedSessions, onSessionToggle, planDay }) {
  profile = { ...profile, dailyMinutes: todayMinutes };
  const allocation = useMemo(() => calculateStudyAllocation(todayMinutes, curriculum.stage), [todayMinutes, curriculum.stage]);
  const languageLabel = getLanguage(languageId).label;
  const sessions = useMemo(() => buildStudySessions(allocation, settings.focusMinutes || profile.focusMinutes, new Date(), languageLabel).map((session)=>({...session,done:completedSessions.includes(session.id)})), [allocation, completedSessions, languageLabel, profile.focusMinutes, settings.focusMinutes]);
  const solvedToday = daily.filter((item) => isSolvedOnLocalDay(progress[item.id], planDay)).length;
  const startProblem = daily.find((item) => !isSolvedOnLocalDay(progress[item.id], planDay)) || daily[0];
  const weakConcept = Object.entries(mastery).filter(([,score])=>score>0).sort(([,a],[,b])=>a-b)[0]?.[0] || (curriculum.currentLevel === 0 ? 'Array 기초' : `Level ${curriculum.currentLevel} 핵심 유형`);
  return <div className="page today-page"><PageHeader eyebrow={`${dateLabel()} · ${getLanguage(languageId).label.toUpperCase()} · LEVEL ${curriculum.currentLevel}`} title="오늘의 학습" action={<div className="day-progress"><span>{solvedToday} / {daily.length}</span><div><i style={{width:`${daily.length ? solvedToday/daily.length*100 : 0}%`}} /></div></div>} /><section className="today-hero"><div><span className="hero-label">TODAY'S FOCUS · LEVEL {curriculum.currentLevel}</span><h2>작게 시작해서,<br />끝까지 생각해보기.</h2><p>오늘은 <b>{weakConcept}</b>에 집중해요. 최근 풀이를 반영한 목표 난이도는 {curriculum.targetDifficulty}/5이며, 막히면 정답 대신 다음 질문을 열어보세요.</p><button className="start-learning" onClick={()=>startProblem&&onOpen(startProblem)}>오늘 학습 시작 <span>→</span></button></div><div className="time-allocation"><div className="total-time"><small>총 학습 시간</small><strong>{formatMinutes(profile.dailyMinutes)}</strong></div>{[['problems','코딩테스트'],['theory',`${getLanguage(languageId).label} · 알고리즘 이론`],['ai','AI · FE 공부'],['systems','메일 · 네트워크 · 보안'],['career','Git · AWS 면접'],['review','복습']].map(([key,label])=><div className="allocation-row" key={key}><span><i className={key} />{label}</span><b>{formatMinutes(allocation[key])}</b><div><em className={key} style={{width:`${allocation[key]/profile.dailyMinutes*100}%`}} /></div></div>)}</div></section><section className="today-grid"><div className="today-main"><div className="section-title"><div><span className="eyebrow">PROBLEM SET</span><h2>오늘의 문제</h2></div><span>{daily.length} problems</span></div><div className="daily-problems">{daily.map((problem,index)=>{const record=progress[problem.id];const status=!isSolvedOnLocalDay(record,planDay)&&(['SOLVED','SOLVED_WITH_HINT','MASTERED'].includes(record?.status)||record?.nextReview)?'REVIEW':record?.status||'NOT_STARTED';const groups=progress[problem.id]?.nextReview?'REVIEW':problem.difficulty>curriculum.targetDifficulty?'CHALLENGE':index<2?'WARM UP':'CORE';return <button key={problem.id} onClick={()=>onOpen(problem)}><span className={`problem-state ${status.toLowerCase()}`}>{['SOLVED','SOLVED_WITH_HINT','MASTERED'].includes(status)?'✓':String(index+1).padStart(2,'0')}</span><div><small>{groups} · {getDisplayProblemId(problem.id, languageId)} · LEVEL {problem.level}</small><strong>{problem.title}</strong><span>{problem.category} · {problem.estimatedMinutes}분</span></div><em>{statusLabels[status]||status} <b>→</b></em></button>})}</div></div><aside className="session-plan"><div className="section-title"><div><span className="eyebrow">SESSION PLAN</span><h2>학습 세션</h2></div></div><div className="session-list">{sessions.map((session,index)=><button className={session.done?'done':''} key={session.id} onClick={()=>onSessionToggle(session.id)}><span>{session.done?'✓':index+1}</span><div><strong>{session.title}</strong><small>{session.duration}분 집중{index<sessions.length-1?' · 10분 휴식':''}</small></div></button>)}</div><div className="quiet-note"><span>⌁</span><p><b>오늘의 원칙</b>메일·네트워크·보안은 매일 유지하고 Git·AWS만 여유 있는 날에 짧게 학습해요.</p></div></aside></section></div>;
}

function ProblemsPage({ problems, storedProgress, onOpen, languageId, level, onLevelChange, loading, error, onRetry }) {
  const [query,setQuery]=useState(''); const [category,setCategory]=useState('전체'); const [status,setStatus]=useState('전체'); const [page,setPage]=useState(1);
  const progress=useMemo(()=>progressForLanguage(problems,storedProgress,languageId),[problems,storedProgress,languageId]);
  useEffect(()=>{setCategory('전체');setStatus('전체');setPage(1);},[level]);
  const categories=['전체',...new Set(problems.map((item)=>item.category))];
  const filtered=problems.filter((item)=>item.title.includes(query)||getDisplayProblemId(item.id,languageId).toLowerCase().includes(query.toLowerCase())).filter((item)=>category==='전체'||item.category===category).filter((item)=>status==='전체'||(progress[item.id]?.status||'NOT_STARTED')===status);
  const pageSize=50; const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize)); const safePage=Math.min(page,pageCount); const visible=filtered.slice((safePage-1)*pageSize,safePage*pageSize);
  const scopeLabel=level===-1?'ALL LEVELS':`LEVEL ${level}`; const total=level===-1?problemCountsByLevel.reduce((sum,count)=>sum+count,0):problemCountsByLevel[level];
  return <div className="page"><PageHeader eyebrow={`${total} PROBLEMS · ${scopeLabel} · ${getLanguage(languageId).label.toUpperCase()}`} title="문제 탐색" description="레벨·유형·진행 상태로 필요한 문제를 찾아보세요. 전체 레벨에서는 800문제를 검색할 수 있어요." action={<div className="header-stat"><b>{Object.values(progress).filter((item)=>item.status?.startsWith('SOLVED')||item.status==='MASTERED').length}</b><span>solved</span></div>} /><div className="filter-bar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event)=>{setQuery(event.target.value);setPage(1);}} placeholder="문제명 또는 ID 검색" /></label><label>Level<select value={level} onChange={(event)=>onLevelChange(Number(event.target.value))}><option value="-1">전체 레벨 · 800개</option>{problemCountsByLevel.map((count,index)=><option value={index} key={index}>Level {index} · {count}개</option>)}</select></label><label>Category<select value={category} onChange={(event)=>{setCategory(event.target.value);setPage(1);}}>{categories.map((item)=><option key={item}>{item}</option>)}</select></label><label>Status<select value={status} onChange={(event)=>{setStatus(event.target.value);setPage(1);}}><option>전체</option><option value="NOT_STARTED">시작 전</option><option value="TRYING">풀이 중</option><option value="SOLVED">해결</option><option value="SOLVED_WITH_HINT">힌트로 해결</option><option value="FAILED">복습 필요</option><option value="MASTERED">익숙함</option></select></label></div>{error&&<div className="data-action-error" role="alert">{error}<button className="secondary-button" onClick={onRetry}>다시 불러오기</button></div>}<div className="problem-table"><div className="table-head"><span>상태</span><span>번호</span><span>문제</span><span>유형</span><span>난이도</span><span>예상 시간</span><span>마지막 풀이</span></div>{loading?<div className="empty-table">{scopeLabel} 문제를 불러오는 중입니다.</div>:visible.map((problem)=>{const record=progress[problem.id];const state=record?.status||'NOT_STARTED';return <button className="table-row" key={problem.id} onClick={()=>onOpen(problem)}><span><i className={`table-status ${state.toLowerCase()}`}>{['SOLVED','MASTERED'].includes(state)?'✓':state==='FAILED'?'!':'·'}</i>{statusLabels[state]}</span><span>{getDisplayProblemId(problem.id,languageId)}</span><span><b>{problem.title}</b><small>Level {problem.level} · {problem.concepts.join(' · ')}</small></span><span>{problem.category}</span><span>{'●'.repeat(problem.difficulty)}<i>{'●'.repeat(5-problem.difficulty)}</i></span><span>{problem.estimatedMinutes}분</span><span>{record?.lastAttempt?new Intl.DateTimeFormat('ko-KR').format(new Date(record.lastAttempt)):'—'} <b>→</b></span></button>})}{!loading&&!filtered.length&&<div className="empty-table">조건에 맞는 문제가 없어요.</div>}</div>{!loading&&filtered.length>pageSize&&<nav className="table-pagination" aria-label="문제 목록 페이지"><button disabled={safePage===1} onClick={()=>setPage((value)=>Math.max(1,value-1))}>← 이전</button><span>{safePage} / {pageCount} · {filtered.length}문제</span><button disabled={safePage===pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))}>다음 →</button></nav>}</div>;
}

const roadmapNodes = [
  { title:'Programming Basics', concepts:['Number','Condition','Loop','Array','String'] },
  { title:'Core Data Handling', concepts:['Map','Set','Sort','Stack','Queue','TwoPointer'] },
  { title:'Algorithm Foundations', concepts:['BinarySearch','DFS','BFS','PrefixSum','DP'] },
  { title:'Applied Algorithms', concepts:['Graph','ShortestPath','Heap','Greedy','TopologicalSort'] },
  { title:'Advanced Problem Solving', concepts:['MST','KMP','Bitmask','Tree','Combinatorics'] },
  { title:'Expert Challenges', concepts:['MaximumFlow','SCC','LCA','Matrix','Assignment'] },
];

function RoadmapPage({ mastery, curriculum, onOpenLevel }) {
  const values=Object.values(mastery);const overall=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
  return <div className="page"><PageHeader eyebrow={`LEARNING PATH · CURRENT LEVEL ${curriculum.currentLevel}`} title="Roadmap" description="각 레벨의 실제 풀이 기록·힌트 의존도·숙련도를 함께 보고 다음 단계가 자동으로 열립니다." action={<div className="roadmap-score"><strong>{overall}</strong><span>overall mastery</span></div>} /><section className="roadmap-layout"><div className="roadmap-tree">{roadmapNodes.map((node,index)=>{const stats=curriculum.levels[index];const locked=index>curriculum.unlockedLevel;const complete=index<curriculum.currentLevel;const current=index===curriculum.currentLevel;const requirement=stats.requirement;return <button disabled={locked} onClick={()=>onOpenLevel(index)} className={`roadmap-node ${locked?'locked':complete?'complete':current?'current':'available'}`} key={node.title}>{index<roadmapNodes.length-1&&<i className="road-line" />}<span className="node-index">{locked?'×':complete?'✓':String(index).padStart(2,'0')}</span><div><small>{locked?'LOCKED':complete?'PASSED':current?'CURRENT TRACK':'AVAILABLE'}</small><h3>Level {index} · {node.title}</h3><p>{node.concepts.join(' · ')}</p>{requirement&&<em>{stats.solved}/{requirement.minSolved} 해결 · 독립 풀이 {Math.round(stats.independentRate*100)}%/{Math.round(requirement.minIndependentRate*100)}% · 숙련도 {stats.mastery}/{requirement.minMastery}</em>}</div><strong>{stats.mastery}<small>/100</small></strong></button>})}</div><aside className="mastery-panel"><span className="eyebrow">CONCEPT MASTERY</span><h2>개념별 이해도</h2><p>시도한 문제만 기준으로 계산합니다. 아직 만나지 않은 개념은 0으로 남습니다.</p>{Object.entries(mastery).sort(([,a],[,b])=>b-a).slice(0,10).map(([concept,score])=><div className="mastery-row" key={concept}><span>{concept}<b>{score}</b></span><div><i style={{width:`${score}%`}} /></div></div>)}</aside></section></div>;
}

function ReviewPage({ problems, progress, onOpen, languageId }) {
  const [filter,setFilter]=useState('전체'); const now=Date.now();
  const review=problems.filter((problem)=>{const item=progress[problem.id];return item&&(['FAILED','SOLVED_WITH_HINT','REVIEW'].includes(item.status)||item.nextReview);}).filter((problem)=>{const item=progress[problem.id];if(filter==='전체')return true;if(filter==='오답')return item.status==='FAILED';if(filter==='힌트 사용')return item.hintsUsed>0;if(filter==='막힘 기록')return item.stuckCount>0;if(filter==='시간 초과')return item.failureType==='timeout';if(filter==='오래 걸림')return item.timeSpent>problem.estimatedMinutes*60;if(filter==='복습 예정')return item.nextReview;return true;});
  return <div className="page"><PageHeader eyebrow={`SPACED REPETITION · ${getLanguage(languageId).label.toUpperCase()}`} title="복습 큐" description="틀린 문제와 막혔던 문제를 잊기 전에 다시 만나, 먼저 기억을 꺼내봅니다." action={<div className="header-stat amber"><b>{review.filter((item)=>!progress[item.id].nextReview||new Date(progress[item.id].nextReview).getTime()<=now).length}</b><span>오늘 복습</span></div>} /><div className="segmented">{['전체','오답','힌트 사용','막힘 기록','시간 초과','오래 걸림','복습 예정'].map((item)=><button className={filter===item?'active':''} key={item} onClick={()=>setFilter(item)}>{item}</button>)}</div><div className="review-list">{review.map((problem)=>{const item=progress[problem.id];const due=!item.nextReview||new Date(item.nextReview).getTime()<=now;const memory=item.recallCard;return <button key={problem.id} onClick={()=>onOpen(problem)}><span className={`review-icon ${item.status==='FAILED'?'failed':memory?'memory':'hinted'}`}>{item.status==='FAILED'?'!':memory?'↻':'💡'}</span><div><small>{getDisplayProblemId(problem.id,languageId)} · {problem.category}</small><strong>{problem.title}</strong><p>{memory?`막힌 지점 · ${memory.blockage}`:item.failureType==='timeout'?'시간 초과 · 현재 방식의 반복 횟수를 확인해보세요.':item.hintsUsed?`힌트 ${item.hintsUsed}단계 사용 · 스스로 다시 설명해보세요.`:'경계 조건을 다시 확인해보세요.'}</p></div><aside><b>{due?'오늘 복습':'예정'}</b><span>{item.nextReview?new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric'}).format(new Date(item.nextReview)):'지금'}</span></aside></button>})}{!review.length&&<div className="empty-state"><span>✓</span><h3>지금 밀린 복습이 없어요.</h3><p>오답, 힌트 사용, 막힘 기록이 생기면 1·3·7·14일 간격으로 이곳에 나타납니다.</p></div>}</div></div>;
}

function LearningPage({ type, languageId }) {
  const config=type==='AI'
    ? { topics:aiTopics, eyebrow:'FRONT-END × AI', title:'AI 학습', description:'도구 사용법보다 AI 기능을 안전하게 제품에 넣는 법을 연습합니다.' }
    : type==='Systems'
      ? { topics:systemsSecurityTopics, eyebrow:'NETWORK · MAIL · SECURITY · 10%', title:'네트워크 · 메일 · 보안', description:'SMTP·IMAP부터 인증과 웹 공격 방어, 운영 사고 대응까지 흐름으로 연결합니다.' }
    : type==='Career'
      ? { topics:careerTopics, eyebrow:'INTERVIEW SUPPORT · 5%', title:'Git · AWS', description:`코테와 ${getLanguage(languageId).label} 학습을 해치지 않는 범위에서 자주 나오는 실무 면접 개념을 익힙니다.` }
      : languageId === 'java'
        ? { topics:javaTheoryTopics, eyebrow:'JAVA THEORY', title:'Java 이론 학습', description:'문법 암기를 넘어 타입·컬렉션·JVM과 코딩테스트 구현을 연결합니다.' }
        : { topics:theoryTopics, eyebrow:'DEVELOPER THEORY', title:'JavaScript 이론 학습', description:'경력에 맞는 깊이로 JavaScript·브라우저·React를 다시 연결합니다.' };
  const topics=config.topics; const [active,setActive]=useState(topics[0]); const [reveal,setReveal]=useState(0); const [learningProgress,setLearningProgress]=useState(()=>getLocal('loopin-learning-progress',{})); const [learningError,setLearningError]=useState('');
  useEffect(()=>{setActive(topics[0]);setReveal(0);},[type, languageId, topics]);
  const choose=(topic)=>{setActive(topic);setReveal(0);};
  const completedCount=topics.filter((topic)=>learningProgress[topic.id]?.completed).length;
  const saveActive=(patch)=>{
    const next={...learningProgress,[active.id]:{...learningProgress[active.id],...patch,topicId:active.id,area:active.area}};
    setLearningProgress(next);
    try{setLocal('loopin-learning-progress',next);setLearningError('');}
    catch{setLearningError('이론 기록을 저장하지 못했어요. 입력한 내용은 화면에 유지되어 있어요.');}
  };
  const activeProgress=learningProgress[active.id]||{};
  return <div className="page"><PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} action={<div className="header-stat green"><b>{completedCount}</b><span>/ {topics.length} 완료</span></div>} />{learningError&&<div className="data-action-error" role="alert">{learningError}<button className="secondary-button" onClick={()=>saveActive({})}>다시 저장</button></div>}<section className="learning-layout"><aside className="topic-list">{topics.map((topic,index)=>{const completed=learningProgress[topic.id]?.completed;return <button className={`${active.id===topic.id?'active':''} ${completed?'complete':''}`} onClick={()=>choose(topic)} key={topic.id}><span>{completed?'✓':String(index+1).padStart(2,'0')}</span><div><small>{topic.area}</small><strong>{topic.title}</strong><p>{topic.minutes}분 · {type==='Career'||type==='Systems'?'개념·면접 질문':'사고 질문 포함'}</p></div></button>;})}</aside><article className="lesson">{type==='Systems'&&<div className="track-priority-note systems"><span>10%</span><p><strong>매일 유지하는 실무 기초</strong>메일·네트워크와 보안을 번갈아 학습하며, 2시간 미만인 날에도 생략하지 않습니다.</p></div>}{type==='Career'&&<div className="track-priority-note"><span>5%</span><p><strong>후순위 면접 보조 트랙</strong>2시간 미만인 날은 생략하고, 충분한 날에만 Git과 AWS를 번갈아 짧게 학습합니다.</p></div>}<GlossaryGuide /><div className="lesson-meta"><span>{active.area}</span>{active.level&&<span>{active.level}</span>}<span>약 {active.minutes}분</span>{activeProgress.completed&&<span className="completed">학습 완료</span>}</div><h1>{active.title}</h1><p className="lesson-intro">설명을 읽기 전에 먼저 생각해보세요. 정답 여부보다 어떤 근거로 판단했는지가 중요합니다.</p><div className="thought-question"><span>QUESTION</span><h2><GlossaryText text={active.question} /></h2>{reveal===0&&<button className="secondary-button" onClick={()=>setReveal(1)}>힌트만 보기</button>}{reveal>=1&&<div className="thought-hint"><small>생각의 방향</small><p><GlossaryText text={active.hint} /></p></div>}{reveal===1&&<button className="primary-button" onClick={()=>setReveal(2)}>개념 확인하기 <span>→</span></button>}{reveal>=2&&<div className="thought-answer"><small>CONCEPT</small><p><GlossaryText text={active.answer} /></p><label>내 말로 한 줄 정리<textarea value={activeProgress.summary||''} onChange={(event)=>saveActive({summary:event.target.value})} placeholder="내가 이해한 내용을 짧게 적어보세요." /></label><button className={`learning-complete ${activeProgress.completed?'done':''}`} onClick={()=>saveActive({completed:true,updatedAt:new Date().toISOString()})}>{activeProgress.completed?'✓ 학습 완료됨':'이해했어요 · 학습 완료'} <span>→</span></button></div>}</div></article></section></div>;
}

function NotesPage({ notes, problems }) {
  const entries=Object.entries(notes).filter(([,value])=>value);
  return <div className="page"><PageHeader eyebrow="MY OBSERVATIONS" title="Notes" description="풀이 중 적은 관찰과 해결 후 복기를 한곳에서 다시 봅니다." /><div className="notes-grid">{entries.map(([key,value])=>{const id=key.slice(0,6);const languageId=typeof value==='object'&&value.language?value.language:key.includes(':java')?'java':'javascript';const problem=problems.find((item)=>item.id===id);return <article key={key}><span>{getDisplayProblemId(id,languageId)} · {problem?.category||'복기'}</span>{typeof value==='string'?<p>{value}</p>:<><h3>{value.idea||'풀이 복기'}</h3><p>{value.signal||value.reason}</p><small>{value.type==='struggle'?'막힘 기억 카드':value.complexity}</small></>}</article>})}{!entries.length&&<div className="empty-state wide"><span>≡</span><h3>아직 남긴 메모가 없어요.</h3><p>문제 화면의 내 메모와 풀이 후 복기가 자동으로 모입니다.</p></div>}</div></div>;
}

function AnalyticsPage({ problems, progress, mastery, rawProgress, languageId, curriculum }) {
  const records=Object.values(progress);const solved=records.filter((item)=>item.status?.startsWith('SOLVED')||item.status==='MASTERED');const attempts=records.reduce((sum,item)=>sum+(item.attempts||0),0);const hintRate=solved.length?Math.round(solved.filter((item)=>item.hintsUsed>0).length/solved.length*100):0;const avg=records.length?Math.round(records.reduce((sum,item)=>sum+(item.timeSpent||0),0)/records.length/60):0;const weak=Object.entries(mastery).sort(([,a],[,b])=>a-b).slice(0,3);
  const streak=calculateStudyStreak(rawProgress,languageId); const attemptedLevels=curriculum.levels.filter((item)=>item.attempted>0);
  return <div className="page"><PageHeader eyebrow={`LEARNING SIGNALS · LEVEL ${curriculum.currentLevel}`} title="Analytics" description="점수가 아니라 다음 학습을 결정하는 신호만 보여드립니다." /><div className="analytics-stats">{[[attempts,'풀이 시도'],[solved.length,'정답 문제'],[records.filter((item)=>item.nextReview).length,'복습 문제'],[`${avg}분`,'평균 풀이 시간'],[`${hintRate}%`,'힌트 사용률'],[`${streak}일`,'연속 학습']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><section className="level-analytics"><span className="eyebrow">LEVEL PROGRESS</span>{attemptedLevels.length?attemptedLevels.map((item)=><div key={item.level}><span>Level {item.level}</span><div><i style={{width:`${Math.min(100,item.total?item.solved/item.total*100:0)}%`}} /></div><b>{item.solved} / {item.total}</b><em>숙련도 {item.mastery}</em></div>):<p>첫 문제를 풀면 레벨별 기록이 표시됩니다.</p>}</section><section className="analytics-grid"><div className="concept-chart"><span className="eyebrow">CONCEPTS</span><h2>개념별 숙련도</h2>{Object.entries(mastery).sort(([,a],[,b])=>b-a).slice(0,12).map(([concept,score])=><div key={concept}><span>{concept}</span><div><i style={{width:`${score}%`}} /></div><b>{score}</b></div>)}</div><aside className="weak-panel"><span className="eyebrow">NEXT FOCUS</span><h2>가장 약한 개념</h2>{weak.map(([concept,score],index)=><div key={concept}><span>0{index+1}</span><p><strong>{concept}</strong><small>mastery {score}</small></p></div>)}<p className="weak-advice">약한 개념의 쉬운 문제부터 다시 연결해볼게요. 난이도를 급하게 낮추지는 않습니다.</p></aside></section></div>;
}

function JavaRuntimeStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let active = true;
    fetch('/api/java/status').then((response) => response.json()).then((next) => active && setStatus(next)).catch(() => active && setStatus({ available: false }));
    return () => { active = false; };
  }, []);
  return <div className={`java-runtime-status ${status?.available ? 'ready' : 'missing'}`}><span>{status === null ? '…' : status.available ? '✓' : '!'}</span><div><strong>{status === null ? 'Java 실행 환경 확인 중' : status.available ? `${status.version} 사용 가능` : 'JDK 21 이상 설치 필요'}</strong><p>{status?.available ? 'Java 코드를 로컬에서 컴파일하고 테스트할 준비가 됐습니다.' : <>Java 문제의 실행·제출에만 필요합니다. <a href="https://adoptium.net/temurin/releases/?version=21" target="_blank" rel="noreferrer">Temurin JDK 21 받기 ↗</a></>}</p></div></div>;
}

function SettingsPage({ settings, onSetting, onReload }) {
  const [resetLevel,setResetLevel]=useState(0);
  const [dataError,setDataError]=useState('');
  const [busy,setBusy]=useState(false);
  const working=useRef(false);
  const runDataAction=async(action)=>{
    if(working.current)return;
    working.current=true;setBusy(true);setDataError('');
    try{await action();}
    catch(error){setDataError(error?.message||'데이터 작업을 완료하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.');}
    finally{working.current=false;setBusy(false);}
  };
  const exportData=()=>runDataAction(async()=>{
    const data=await storage.exportAll();
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`loopin-backup-${localDayKey(new Date())}.json`;
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const importData=async(event)=>{
    const input=event.target;const file=input.files?.[0];if(!file)return;
    await runDataAction(async()=>{
      const backup=JSON.parse(await file.text());
      if(!window.confirm('백업 파일의 기록으로 현재 진도·코드·메모를 교체할까요? 필요한 기록은 먼저 JSON으로 내보내 주세요.'))return;
      await storage.importAll(backup);
      window.alert('백업을 가져왔어요. 앱을 새로 불러옵니다.');onReload();
    });
    input.value='';
  };
  const reset=(store,label)=>runDataAction(async()=>{
    if(!window.confirm(`${label}을(를) 초기화할까요? 이 작업은 되돌릴 수 없어요.`))return;
    await storage.clear(store);onReload();
  });
  const resetLearningHistory=()=>runDataAction(async()=>{
    if(!window.confirm('코테 세션·이론 학습 기록을 초기화할까요? 선택 학습인 회의 용어 기록은 유지됩니다.'))return;
    await Promise.all([storage.clear('sessions'),storage.clear('curriculum')]);
    localStorage.removeItem('loopin-learning-progress');onReload();
  });
  const resetWords=()=>runDataAction(async()=>{
    if(!window.confirm('선택 학습인 회의 용어의 기록만 초기화할까요?'))return;
    localStorage.removeItem(WORKPLACE_STORAGE_KEY);onReload();
  });
  const clearLevel=()=>runDataAction(async()=>{
    if(!window.confirm(`Level ${resetLevel}의 진도·코드·메모를 두 언어 모두 초기화할까요?`))return;
    const matches=(key)=>getProblemLevel(getProblemIdFromStorageKey(key))===resetLevel;
    await Promise.all(['progress','code','notes'].map((store)=>storage.removeWhere(store,(key)=>matches(key))));
    onReload();
  });
  const resetAll=()=>runDataAction(async()=>{
    if(!window.confirm('프로필과 선택 학습을 포함한 전체 데이터를 초기화할까요?'))return;
    for(const store of ['progress','code','notes','sessions','curriculum'])await storage.clear(store);
    clearLocalLearningData();onReload();
  });
  return <div className="page settings-page"><PageHeader eyebrow="PREFERENCES & DATA" title="Settings" description="집중 환경과 로컬 학습 데이터를 관리합니다." />{dataError&&<p className="data-action-error" role="alert">{dataError}</p>}{busy&&<p role="status">데이터 작업 중이에요. 완료될 때까지 기다려 주세요.</p>}<section><h2>학습 언어</h2><div className="setting-row"><div><strong>기본 풀이 언어</strong><p>Today·Problems·Theory·복습 기록이 선택한 언어로 전환됩니다.</p></div><select value={settings.learningLanguage} onChange={(event)=>onSetting('learningLanguage',event.target.value)}>{getAvailableLanguages().map((language)=><option value={language.id} key={language.id}>{language.label}</option>)}</select></div>{settings.learningLanguage==='java'&&<JavaRuntimeStatus />}</section><section><h2>화면과 에디터</h2><div className="setting-row"><div><strong>화면 테마</strong><p>오래 봐도 편안한 화면을 선택하세요.</p></div><div className="toggle-group"><button className={settings.theme==='light'?'active':''} onClick={()=>onSetting('theme','light')}>Light</button><button className={settings.theme==='dark'?'active':''} onClick={()=>onSetting('theme','dark')}>Dark</button></div></div><div className="setting-row"><div><strong>에디터 글자 크기</strong><p>코드 에디터에만 적용됩니다.</p></div><select value={settings.editorFontSize} onChange={(event)=>onSetting('editorFontSize',Number(event.target.value))}>{[13,14,15,16,18].map((item)=><option value={item} key={item}>{item}px</option>)}</select></div><div className="setting-row"><div><strong>기본 집중 세션</strong><p>오늘의 학습 세션을 나누는 기준입니다.</p></div><select value={settings.focusMinutes} onChange={(event)=>onSetting('focusMinutes',Number(event.target.value))}>{[25,40,50,60,90].map((item)=><option value={item} key={item}>{item}분</option>)}</select></div></section><section><h2>Backup</h2><div className="setting-row"><div><strong>데이터 내보내기</strong><p>진도, 코드, 메모, 이론과 회의 용어의 계획·복습 기록을 JSON 파일로 저장합니다.</p></div><button className="secondary-button" disabled={busy} onClick={exportData}>JSON 내보내기</button></div><div className="setting-row"><div><strong>데이터 가져오기</strong><p>다른 PC에서 저장한 loopin 백업을 복구합니다.</p></div><label className="secondary-button file-button">JSON 가져오기<input type="file" accept="application/json" disabled={busy} onChange={importData} /></label></div></section><section className="danger-zone"><h2>Reset</h2><div className="setting-row"><div><strong>특정 Level 초기화</strong><p>선택한 레벨의 진도·코드·메모만 지웁니다.</p></div><div className="inline-reset"><select value={resetLevel} onChange={(event)=>setResetLevel(Number(event.target.value))}>{problemCountsByLevel.map((_,level)=><option value={level} key={level}>Level {level}</option>)}</select><button onClick={clearLevel}>선택 Level 초기화</button></div></div><div className="reset-actions"><button onClick={()=>reset('progress','문제 진행 상황')}>문제 진행 초기화</button><button disabled={busy} onClick={resetLearningHistory}>코테·이론 학습 기록 초기화</button><button disabled={busy} onClick={resetWords}>회의 용어 기록만 초기화</button><button onClick={()=>reset('code','작성 코드')}>문제 코드 초기화</button><button disabled={busy} onClick={resetAll}>전체 데이터 초기화</button></div></section></div>;
}

export default function App() {
  const [profile,setProfile]=useState(()=>getLocal('loopin-profile',null));
  const [settings,setSettings]=useState(()=>normalizeSettings(getLocal('loopin-settings', {}),profile));
  const [settingsError,setSettingsError]=useState('');
  const [active,setActive]=useState(()=>navItems.some(([id])=>id===window.location.hash.slice(1))?window.location.hash.slice(1):'today'); const [collapsed,setCollapsed]=useState(false); const [problems,setProblems]=useState([]); const [browseLevel,setBrowseLevel]=useState(profile?.startLevel||0); const [browseProblems,setBrowseProblems]=useState([]); const [browseLoading,setBrowseLoading]=useState(false); const [browseError,setBrowseError]=useState(''); const [browseRetry,setBrowseRetry]=useState(0); const [dailyPlan,setDailyPlan]=useState([]); const [todayMinutes,setTodayMinutes]=useState(profile?.dailyMinutes||120); const [needsDailyTime,setNeedsDailyTime]=useState(false); const [needsLanguageChoice,setNeedsLanguageChoice]=useState(()=>Boolean(profile)&&sessionStorage.getItem(languageChoiceKey())!=='done'); const [dailySessionDone,setDailySessionDone]=useState([]); const [progress,setProgress]=useState({}); const [notes,setNotes]=useState({}); const [selected,setSelected]=useState(null); const [loading,setLoading]=useState(Boolean(profile));

  const progressRef = useRef(progress);
  const progressWrites = useRef(Promise.resolve());
  const dailyWrites = useRef(Promise.resolve());
  const dailySnapshot = useRef({minutes:todayMinutes,plan:dailyPlan,sessions:dailySessionDone});
  const [dailyError,setDailyError] = useState('');
  const loadRequest = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [planDay, setPlanDay] = useState(() => localDayKey(new Date()));
  const loadData=async(activeProfile=profile, languageOverride)=>{
    const requestId = ++loadRequest.current;
    const requestedDay = localDayKey(new Date());
    setLoadError('');
    try {
    await Promise.all([progressWrites.current.catch(() => {}),dailyWrites.current.catch(() => {})]);
    setLoading(true);
    const languageId = languageOverride || settings.learningLanguage || activeProfile?.learningLanguage || 'javascript';
    const [storedProgress,storedNotes,languageDaily,legacyDaily] = await Promise.all([
      storage.getAll('progress'), storage.getAll('notes'), storage.get('curriculum',todayKey(languageId,requestedDay)),
      languageId === 'javascript' ? storage.get('curriculum',legacyTodayKey(requestedDay)) : null,
    ]);
    const storedDaily = languageDaily || legacyDaily;
    const curriculum = deriveCurriculumState({profile:activeProfile,progress:storedProgress,languageId});
    const levels=[...new Set([
      curriculum.currentLevel,
      ...getLevelsReferencedByProgress(storedProgress,languageId),
      ...getLevelsReferencedByIds(storedDaily?.ids||[]),
    ])];
    const loaded=await loadProblemsByLevels(levels);
    const activeProgress=progressForLanguage(loaded,storedProgress,languageId);
    const minutes=storedDaily?.minutes||activeProfile?.dailyMinutes||120;
    const loadedMastery=calculateConceptMastery(loaded,activeProgress);
    const savedSessions=Array.isArray(storedDaily?.completedSessions)?storedDaily.completedSessions:[];
    const savedLevel=Number.isInteger(storedDaily?.level)?storedDaily.level:curriculum.currentLevel;
    const savedStage=savedLevel>=4?'practical':savedLevel>=2?'intermediate':'beginner';
    const completedSessions=storedDaily?.sessionVersion===3?savedSessions:migrateCompletedStudySessions(savedSessions,calculateStudyAllocation(minutes,savedStage),storedDaily?.sessionFocusMinutes||settings.focusMinutes,new Date(),getLanguage(languageId).label,storedDaily?.sessionVersion||1);
    let daily=(storedDaily?.ids||[]).map((id)=>loaded.find((item)=>item.id===id)).filter(Boolean);
    if(!daily.length)daily=selectDailyProblems({problems:loaded,progress:activeProgress,mastery:loadedMastery,count:dailyProblemCount(minutes),difficulty:curriculum.targetDifficulty,targetLevel:curriculum.currentLevel});
    if(requestId!==loadRequest.current)return;
    progressRef.current=storedProgress;setPlanDay(requestedDay);dailySnapshot.current={minutes,plan:daily,sessions:completedSessions};
    setProblems(loaded);setBrowseLevel(curriculum.currentLevel);setBrowseProblems(loaded.filter((item)=>item.level===curriculum.currentLevel));setDailyPlan(daily);setTodayMinutes(minutes);setNeedsDailyTime(!storedDaily?.minutes);setDailySessionDone(completedSessions);setProgress(storedProgress);setNotes(storedNotes);setLoading(false);
    } catch(error) {
      if(requestId===loadRequest.current){setLoadError('학습 기록을 불러오지 못했어요. 브라우저 저장 공간과 설정을 확인한 뒤 다시 시도해 주세요.');setLoading(false);}
    }
  };
  useEffect(()=>{if(profile&&active!=='words')loadData();},[active==='words']);
  useEffect(()=>{
    const checkDay=()=>{
      if(!profile||active==='words'||selected||loading||loadError||localDayKey(new Date())===planDay)return;
      setNeedsLanguageChoice(sessionStorage.getItem(languageChoiceKey())!=='done');
      loadData(profile,settings.learningLanguage);
    };
    const timer=window.setInterval(checkDay,30000);
    window.addEventListener('focus',checkDay);
    checkDay();
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',checkDay);};
  },[profile,active,selected,loading,loadError,planDay,settings.learningLanguage]);
  useEffect(()=>{if(!profile||active!=='problems')return;let current=true;setBrowseLoading(true);setBrowseError('');const request=browseLevel===-1?loadProblemsByLevels([0,1,2,3,4,5]):loadProblemsByLevel(browseLevel);request.then((items)=>{if(current){setBrowseProblems(items);setProblems((existing)=>[...existing,...items].filter((problem,index,array)=>array.findIndex((candidate)=>candidate.id===problem.id)===index));}}).catch(()=>{if(current){setBrowseProblems([]);setBrowseError('문제를 불러오지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.');}}).finally(()=>{if(current)setBrowseLoading(false);});return()=>{current=false;};},[active,browseLevel,profile,browseRetry]);
  useEffect(()=>{
    document.documentElement.dataset.theme=settings.theme;
    try{setLocal('loopin-settings',settings);setSettingsError('');}
    catch{setSettingsError('화면 설정을 저장하지 못했어요. 브라우저 저장 공간을 확인한 뒤 설정을 다시 선택해 주세요.');}
  },[settings]);
  const knownProblems=useMemo(()=>[...problems,...browseProblems].filter((problem,index,items)=>items.findIndex((candidate)=>candidate.id===problem.id)===index),[problems,browseProblems]);
  const knownLanguageProgress=useMemo(()=>progressForLanguage(knownProblems,progress,settings.learningLanguage),[knownProblems,progress,settings.learningLanguage]);
  const languageProgress=knownLanguageProgress;
  const curriculum=useMemo(()=>deriveCurriculumState({profile,progress,languageId:settings.learningLanguage}),[profile,progress,settings.learningLanguage]);
  const masteryProblems=useMemo(()=>knownProblems.filter((problem)=>problem.level===curriculum.currentLevel||knownLanguageProgress[problem.id]),[curriculum.currentLevel,knownLanguageProgress,knownProblems]);
  const mastery=useMemo(()=>calculateConceptMastery(masteryProblems,knownLanguageProgress),[masteryProblems,knownLanguageProgress]);
  useEffect(()=>{if(!profile||active==='words'||problems.some((problem)=>problem.level===curriculum.currentLevel))return;let current=true;loadProblemsByLevel(curriculum.currentLevel).then((items)=>{if(current)setProblems((existing)=>[...existing,...items].filter((problem,index,array)=>array.findIndex((candidate)=>candidate.id===problem.id)===index));}).catch(()=>{if(current)setLoadError('새 레벨의 문제를 불러오지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.');});return()=>{current=false;};},[curriculum.currentLevel,problems,profile,active==='words']);
  const completeOnboarding=async(nextProfile)=>{setLocal('loopin-profile',nextProfile);sessionStorage.setItem(languageChoiceKey(),'done');setNeedsLanguageChoice(false);setProfile(nextProfile);setSettings((current)=>({...current,learningLanguage:nextProfile.learningLanguage||'javascript',focusMinutes:nextProfile.focusMinutes||current.focusMinutes}));await loadData(nextProfile,nextProfile.learningLanguage||'javascript');};
  const updateProgress=(id,patch,languageId=settings.learningLanguage)=>{
    const write=progressWrites.current.catch(()=>{}).then(async()=>{
      const current=progressRef.current;
      const key=getProgressStorageKey(id,languageId);
      const legacy=languageId==='javascript'?current[id]:undefined;
      const record={...(legacy||{}),...current[key],...patch,problemId:id,level:getProblemLevel(id),language:languageId};
      await storage.set('progress',key,record);
      progressRef.current={...current,[key]:record};
      setProgress(progressRef.current);
    });
    progressWrites.current=write;
    return write;
  };
  const saveDaily=(transform)=>{
    const key=todayKey(settings.learningLanguage,planDay);
    const write=dailyWrites.current.catch(()=>{}).then(async()=>{
      const next=transform(dailySnapshot.current);
      await storage.set('curriculum',key,{minutes:next.minutes,ids:next.plan.map((item)=>item.id),completedSessions:next.sessions,sessionVersion:3,sessionFocusMinutes:settings.focusMinutes,level:curriculum.currentLevel,targetDifficulty:curriculum.targetDifficulty,updatedAt:new Date().toISOString()});
      dailySnapshot.current=next;
      setTodayMinutes(next.minutes);setDailyPlan(next.plan);setDailySessionDone(next.sessions);setNeedsDailyTime(false);setDailyError('');
    });
    dailyWrites.current=write;
    return write.catch(()=>setDailyError('오늘 계획을 저장하지 못했어요. 저장 공간을 확인한 뒤 시간 선택이나 세션 체크를 다시 시도해 주세요.'));
  };
  const changeTodayMinutes=(minutes)=>{
    const nextMinutes=Math.min(720,Math.max(30,Math.round(Number(minutes)||30)));
    return saveDaily((current)=>{
      const desired=dailyProblemCount(nextMinutes);
      const recommendations=selectDailyProblems({problems,progress:languageProgress,mastery,count:Math.max(desired,current.plan.length),difficulty:curriculum.targetDifficulty,targetLevel:curriculum.currentLevel});
      const completed=current.plan.filter((item)=>isSolvedOnLocalDay(languageProgress[item.id],planDay));
      const pending=current.plan.filter((item)=>!completed.some((done)=>done.id===item.id));
      const combined=[...completed,...pending,...recommendations].filter((item,index,array)=>array.findIndex((candidate)=>candidate.id===item.id)===index);
      return {...current,minutes:nextMinutes,plan:combined.slice(0,Math.max(desired,completed.length))};
    });
  };
  const toggleDailySession=(id)=>saveDaily((current)=>({...current,sessions:current.sessions.includes(id)?current.sessions.filter((item)=>item!==id):[...current.sessions,id]}));
  const onSetting=(key,value)=>{setSettings((current)=>({...current,[key]:value}));if(key==='learningLanguage'&&value!==settings.learningLanguage)loadData(profile,value);};
  const confirmStartLanguage=(languageId)=>{sessionStorage.setItem(languageChoiceKey(),'done');setNeedsLanguageChoice(false);onSetting('learningLanguage',languageId);};
  const nextProblem=()=>{if(!selected)return;const sequence=dailyPlan.some((item)=>item.id===selected.id)?dailyPlan:browseProblems.some((item)=>item.id===selected.id)?browseProblems:problems;const index=sequence.findIndex((item)=>item.id===selected.id);if(sequence.length)setSelected(sequence[(Math.max(0,index)+1)%sequence.length]);};
  const navigate=(view)=>{setSelected(null);setActive(view);window.history.replaceState(null,'',`#${view}`);};
  const openRoadmapLevel=(level)=>{setBrowseLevel(level);setActive('problems');};
  const closeSolver=async()=>{setSelected(null);setNotes(await storage.getAll('notes'));};

  if(!profile&&active!=='words')return <Onboarding onComplete={completeOnboarding}/>;
  if(profile&&profile.onboardingResultSeen!==true&&active!=='words')return <OnboardingResult profile={profile} onComplete={completeOnboarding}/>;
  if(loadError&&active!=='words')return <div className="app-loading"><p role="alert">{loadError}</p><button className="secondary-button" onClick={()=>loadData()}>다시 불러오기</button></div>;
  if(loading&&active!=='words')return <div className="app-loading"><span className="brand-mark">L</span><p>오늘의 학습을 준비하고 있어요.</p></div>;
  if(selected){const selectedProgress=progress[getProgressStorageKey(selected.id,settings.learningLanguage)]||(settings.learningLanguage==='javascript'?progress[selected.id]:undefined);return <Suspense fallback={<div className="app-loading"><span className="brand-mark">L</span><p>코드 에디터를 준비하고 있어요.</p></div>}><ProblemSolver key={`${selected.id}:${settings.learningLanguage}`} problem={selected} languageId={settings.learningLanguage} initialProgress={selectedProgress} settings={{...settings,onChange:onSetting}} onClose={closeSolver} onProgress={updateProgress} onNext={nextProblem}/></Suspense>;}

  let page;
  if(active==='today')page=<TodayPage profile={profile} daily={dailyPlan} todayMinutes={todayMinutes} onTimeChange={changeTodayMinutes} progress={languageProgress} mastery={mastery} onOpen={setSelected} settings={settings} languageId={settings.learningLanguage} curriculum={curriculum} completedSessions={dailySessionDone} onSessionToggle={toggleDailySession} planDay={planDay}/>;
  if(active==='problems')page=<ProblemsPage problems={browseProblems} storedProgress={progress} onOpen={setSelected} languageId={settings.learningLanguage} level={browseLevel} onLevelChange={setBrowseLevel} loading={browseLoading} error={browseError} onRetry={()=>setBrowseRetry((value)=>value+1)}/>;
  if(active==='roadmap')page=<RoadmapPage mastery={mastery} curriculum={curriculum} onOpenLevel={openRoadmapLevel}/>;
  if(active==='review')page=<ReviewPage problems={knownProblems} progress={knownLanguageProgress} onOpen={setSelected} languageId={settings.learningLanguage}/>;
  if(active==='theory')page=<LearningPage type="Theory" languageId={settings.learningLanguage}/>;
  if(active==='ai')page=<LearningPage type="AI" languageId={settings.learningLanguage}/>;
  if(active==='systems')page=<LearningPage type="Systems" languageId={settings.learningLanguage}/>;
  if(active==='words')page=<Suspense fallback={<div className="app-loading"><p>선택 학습을 불러오는 중이에요.</p></div>}><WorkplaceLearning/></Suspense>;
  if(active==='career')page=<LearningPage type="Career" languageId={settings.learningLanguage}/>;
  if(active==='notes')page=<NotesPage notes={notes} problems={knownProblems}/>;
  if(active==='analytics')page=<AnalyticsPage problems={knownProblems} progress={knownLanguageProgress} mastery={mastery} rawProgress={progress} languageId={settings.learningLanguage} curriculum={curriculum}/>;
  if(active==='settings')page=<SettingsPage settings={settings} onSetting={onSetting} onReload={()=>window.location.reload()}/>;
  return <><div className="app-shell"><Sidebar active={active} collapsed={collapsed} onToggle={()=>setCollapsed((value)=>!value)} onNavigate={navigate} profile={profile} languageId={settings.learningLanguage} currentLevel={curriculum.currentLevel}/><div className="app-content">{(dailyError||settingsError)&&<div className="app-save-alert" role="alert">{dailyError||settingsError}</div>}{page}{active==='today'&&!needsDailyTime&&<div className="today-time-floating"><DailyTimeControl minutes={todayMinutes} onChange={changeTodayMinutes} compact/></div>}</div></div>{needsLanguageChoice&&active!=='words'?<LanguageStartSetup selectedLanguage={settings.learningLanguage} onConfirm={confirmStartLanguage}/>:active==='today'&&needsDailyTime&&<DailyTimeSetup defaultMinutes={todayMinutes} onConfirm={changeTodayMinutes}/>}</>;
}
