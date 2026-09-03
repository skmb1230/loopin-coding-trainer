import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Onboarding, { OnboardingResult } from '../features/onboarding/Onboarding.jsx';
import { loadProblemsByLevel } from '../core/problems/problemLoader.js';
import { storage, getLocal, setLocal } from '../core/storage/db.js';
import { calculateConceptMastery } from '../core/mastery/calculateMastery.js';
import { calculateStudyAllocation, buildStudySessions } from '../core/curriculum/calculateStudyAllocation.js';
import { selectDailyProblems } from '../core/curriculum/selectDailyProblems.js';
import { theoryTopics, javaTheoryTopics, aiTopics, careerTopics } from '../data/learningContent.js';
import GlossaryText, { GlossaryGuide } from '../features/glossary/GlossaryText.jsx';
import { getAvailableLanguages, getDisplayProblemId, getLanguage, getProgressStorageKey } from '../core/languages/registry.js';

const ProblemSolver = lazy(() => import('../features/problems/ProblemSolver.jsx'));

const navItems = [
  ['today', '◫', 'Today'], ['problems', '⌁', 'Problems'], ['roadmap', '⌘', 'Roadmap'], ['review', '↻', 'Review'],
  ['theory', '◈', 'Theory'], ['ai', '✦', 'AI'], ['career', '◇', 'Git · AWS'], ['notes', '≡', 'Notes'], ['analytics', '⌗', 'Analytics'], ['settings', '⚙', 'Settings'],
];

const statusLabels = {
  NOT_STARTED: '시작 전', TRYING: '풀이 중', SOLVED: '해결', SOLVED_WITH_HINT: '힌트로 해결', FAILED: '복습 필요', REVIEW: '복습 예정', MASTERED: '익숙함',
};
const problemCountsByLevel = [200, 220, 180, 120, 60, 20];

const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}시간${rest ? ` ${rest}분` : ''}` : `${rest}분`;
};

const dateLabel = () => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(new Date());
const legacyTodayKey = () => `daily-${new Date().toLocaleDateString('en-CA')}`;
const todayKey = (languageId = 'javascript') => `daily-${new Date().toLocaleDateString('en-CA')}:${languageId}`;
const dailyProblemCount = (minutes) => minutes <= 30 ? 2 : minutes <= 60 ? 3 : minutes <= 120 ? 4 : minutes <= 180 ? 5 : minutes <= 240 ? 7 : minutes <= 300 ? 8 : 9;

const progressForLanguage = (problems, progress, languageId) => problems.reduce((result, problem) => {
  const record = progress[getProgressStorageKey(problem.id, languageId)] || (languageId === 'javascript' ? progress[problem.id] : undefined);
  if (record) result[problem.id] = record;
  return result;
}, {});

function Sidebar({ active, collapsed, onToggle, onNavigate, profile, languageId }) {
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}><div className="sidebar-top"><button className="brand" onClick={()=>onNavigate('today')}><span className="brand-mark">L</span>{!collapsed && <b>loopin</b>}</button><button className="collapse-button" onClick={onToggle} aria-label={collapsed?'사이드바 펼치기':'사이드바 접기'}>{collapsed?'›':'‹'}</button></div><nav>{navItems.slice(0,4).map(([id,icon,label])=><button className={active===id?'active':''} onClick={()=>onNavigate(id)} key={id}><span>{icon}</span>{!collapsed&&label}{id==='review'&&!collapsed&&<i>•</i>}</button>)}<div className="nav-label">{!collapsed&&'LEARN'}</div>{navItems.slice(4,6).map(([id,icon,label])=><button className={active===id?'active':''} onClick={()=>onNavigate(id)} key={id}><span>{icon}</span>{!collapsed&&label}</button>)}<div className="nav-spacer" />{navItems.slice(6).map(([id,icon,label])=><button className={active===id?'active':''} onClick={()=>onNavigate(id)} key={id}><span>{icon}</span>{!collapsed&&label}</button>)}</nav><div className="profile-mini"><span>{getLanguage(languageId).label.slice(0,1)}</span>{!collapsed&&<div><strong>{getLanguage(languageId).label} Track</strong><small>Level {profile?.startLevel || 0} · {profile?.goal}</small></div>}</div></aside>;
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

function DailyTimeSetup({ defaultMinutes, onConfirm }) {
  const [minutes, setMinutes] = useState(defaultMinutes || 120);
  const [customHours, setCustomHours] = useState('');
  const options = [[30,'30분'],[60,'1시간'],[120,'2시간'],[180,'3시간'],[240,'4시간'],[300,'5시간'],[360,'6시간']];
  const customValue = Math.min(720, Math.max(30, Math.round(Number(customHours || 0) * 60)));
  return <div className="modal-backdrop daily-setup-backdrop"><section className="modal daily-setup" role="dialog" aria-modal="true"><span className="eyebrow">PLAN FOR TODAY · {dateLabel()}</span><h2>오늘은 몇 시간<br />공부할 수 있나요?</h2><p className="support-copy">초기 설정 시간은 기본값일 뿐이에요. 오늘 상황에 맞춰 문제 수와 세션을 다시 구성할게요.</p><div className="daily-time-options">{options.map(([value,label])=><button className={minutes===value&&!customHours?'selected':''} key={value} onClick={()=>{setMinutes(value);setCustomHours('');}}><strong>{label}</strong><small>{dailyProblemCount(value)}문제 내외</small></button>)}</div><label className="custom-time-field"><span>직접 입력</span><div><input type="number" min="0.5" max="12" step="0.5" placeholder="예: 2.5" value={customHours} onChange={(event)=>setCustomHours(event.target.value)} /> 시간</div></label><div className="daily-plan-preview"><span><b>{formatMinutes(customHours?customValue:minutes)}</b> 학습</span><i>→</i><span><b>{dailyProblemCount(customHours?customValue:minutes)}문제</b> + 이론 · 복습{(customHours?customValue:minutes)>=120?' · Git/AWS':''}</span></div><button className="primary-button full" onClick={()=>onConfirm(customHours?customValue:minutes)}>오늘 계획 만들기 <span>→</span></button></section></div>;
}

function TodayPage({ profile, daily, todayMinutes, onTimeChange, progress, mastery, onOpen, settings, languageId }) {
  profile = { ...profile, dailyMinutes: todayMinutes };
  const allocation = useMemo(() => calculateStudyAllocation(todayMinutes, 'beginner'), [todayMinutes]);
  const languageLabel = getLanguage(languageId).label;
  const [sessions, setSessions] = useState(() => buildStudySessions(allocation, profile.focusMinutes || settings.focusMinutes, new Date(), languageLabel));
  useEffect(() => setSessions(buildStudySessions(allocation, profile.focusMinutes || settings.focusMinutes, new Date(), languageLabel)), [allocation, languageLabel, profile.focusMinutes, settings.focusMinutes]);
  const solvedToday = daily.filter((item) => ['SOLVED','SOLVED_WITH_HINT','MASTERED'].includes(progress[item.id]?.status)).length;
  const startProblem = daily.find((item) => !['SOLVED','SOLVED_WITH_HINT','MASTERED'].includes(progress[item.id]?.status)) || daily[0];
  return <div className="page today-page"><PageHeader eyebrow={`${dateLabel()} · ${getLanguage(languageId).label.toUpperCase()}`} title="오늘의 학습" action={<div className="day-progress"><span>{solvedToday} / {daily.length}</span><div><i style={{width:`${daily.length ? solvedToday/daily.length*100 : 0}%`}} /></div></div>} /><section className="today-hero"><div><span className="hero-label">TODAY'S FOCUS</span><h2>작게 시작해서,<br />끝까지 생각해보기.</h2><p>오늘은 <b>{mastery.Array < 50 ? 'Array 기초' : '가장 약한 개념'}</b>에 집중해요. 막히면 정답 대신 다음 질문을 열어보세요.</p><button className="start-learning" onClick={()=>startProblem&&onOpen(startProblem)}>오늘 학습 시작 <span>→</span></button></div><div className="time-allocation"><div className="total-time"><small>총 학습 시간</small><strong>{formatMinutes(profile.dailyMinutes)}</strong></div>{[['problems','코딩테스트'],['theory',`${getLanguage(languageId).label} · 알고리즘 이론`],['ai','AI · FE 공부'],['career','Git · AWS 면접'],['review','복습']].map(([key,label])=><div className="allocation-row" key={key}><span><i className={key} />{label}</span><b>{formatMinutes(allocation[key])}</b><div><em className={key} style={{width:`${allocation[key]/profile.dailyMinutes*100}%`}} /></div></div>)}</div></section><section className="today-grid"><div className="today-main"><div className="section-title"><div><span className="eyebrow">PROBLEM SET</span><h2>오늘의 문제</h2></div><span>{daily.length} problems</span></div><div className="daily-problems">{daily.map((problem,index)=>{const status=progress[problem.id]?.status||'NOT_STARTED';const groups=index<2?'WARM UP':index===daily.length-1?'CHALLENGE':index===daily.length-2?'REVIEW':'CORE';return <button key={problem.id} onClick={()=>onOpen(problem)}><span className={`problem-state ${status.toLowerCase()}`}>{['SOLVED','SOLVED_WITH_HINT','MASTERED'].includes(status)?'✓':String(index+1).padStart(2,'0')}</span><div><small>{groups} · {getDisplayProblemId(problem.id, languageId)}</small><strong>{problem.title}</strong><span>{problem.category} · {problem.estimatedMinutes}분</span></div><em>{statusLabels[status]||status} <b>→</b></em></button>})}</div></div><aside className="session-plan"><div className="section-title"><div><span className="eyebrow">SESSION PLAN</span><h2>학습 세션</h2></div></div><div className="session-list">{sessions.map((session,index)=><button className={session.done?'done':''} key={session.id} onClick={()=>setSessions((current)=>current.map((item)=>item.id===session.id?{...item,done:!item.done}:item))}><span>{session.done?'✓':index+1}</span><div><strong>{session.title}</strong><small>{session.duration}분 집중{index<sessions.length-1?' · 10분 휴식':''}</small></div></button>)}</div><div className="quiet-note"><span>⌁</span><p><b>오늘의 원칙</b>Git·AWS는 면접 대비 보조 트랙으로만 짧게 유지해요.</p></div></aside></section></div>;
}

function ProblemsPage({ problems, storedProgress, onOpen, languageId, level, onLevelChange, loading }) {
  const [query,setQuery]=useState(''); const [category,setCategory]=useState('전체'); const [status,setStatus]=useState('전체');
  const progress=useMemo(()=>progressForLanguage(problems,storedProgress,languageId),[problems,storedProgress,languageId]);
  useEffect(()=>{setCategory('전체');setStatus('전체');},[level]);
  const categories=['전체',...new Set(problems.map((item)=>item.category))];
  const filtered=problems.filter((item)=>item.title.includes(query)||getDisplayProblemId(item.id,languageId).toLowerCase().includes(query.toLowerCase())).filter((item)=>category==='전체'||item.category===category).filter((item)=>status==='전체'||(progress[item.id]?.status||'NOT_STARTED')===status);
  return <div className="page"><PageHeader eyebrow={`${problemCountsByLevel[level]} PROBLEMS · LEVEL ${level} · ${getLanguage(languageId).label.toUpperCase()}`} title="문제 탐색" description="레벨을 선택하면 해당 문제 데이터만 불러옵니다. 문제 유형과 현재 상태를 기준으로 다음 연습을 고르세요." action={<div className="header-stat"><b>{Object.values(progress).filter((item)=>item.status?.startsWith('SOLVED')||item.status==='MASTERED').length}</b><span>solved</span></div>} /><div className="filter-bar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="문제명 또는 ID 검색" /></label><label>Level<select value={level} onChange={(event)=>onLevelChange(Number(event.target.value))}>{problemCountsByLevel.map((count,index)=><option value={index} key={index}>Level {index} · {count}개</option>)}</select></label><label>Category<select value={category} onChange={(event)=>setCategory(event.target.value)}>{categories.map((item)=><option key={item}>{item}</option>)}</select></label><label>Status<select value={status} onChange={(event)=>setStatus(event.target.value)}><option>전체</option><option value="NOT_STARTED">시작 전</option><option value="TRYING">풀이 중</option><option value="SOLVED">해결</option><option value="SOLVED_WITH_HINT">힌트로 해결</option><option value="FAILED">복습 필요</option></select></label></div><div className="problem-table"><div className="table-head"><span>상태</span><span>번호</span><span>문제</span><span>유형</span><span>난이도</span><span>예상 시간</span><span>마지막 풀이</span></div>{loading?<div className="empty-table">Level {level} 문제를 불러오는 중입니다.</div>:filtered.map((problem)=>{const record=progress[problem.id];const state=record?.status||'NOT_STARTED';return <button className="table-row" key={problem.id} onClick={()=>onOpen(problem)}><span><i className={`table-status ${state.toLowerCase()}`}>{['SOLVED','MASTERED'].includes(state)?'✓':state==='FAILED'?'!':'·'}</i>{statusLabels[state]}</span><span>{getDisplayProblemId(problem.id,languageId)}</span><span><b>{problem.title}</b><small>{problem.concepts.join(' · ')}</small></span><span>{problem.category}</span><span>{'●'.repeat(problem.difficulty)}<i>{'●'.repeat(5-problem.difficulty)}</i></span><span>{problem.estimatedMinutes}분</span><span>{record?.lastAttempt?new Intl.DateTimeFormat('ko-KR').format(new Date(record.lastAttempt)):'—'} <b>→</b></span></button>})}{!loading&&!filtered.length&&<div className="empty-table">조건에 맞는 문제가 없어요.</div>}</div></div>;
}

const roadmapNodes = [
  { title:'Programming Basics', concepts:['Number','Condition','Loop'], threshold:0 },
  { title:'Array · String', concepts:['Array','String','Counting'], threshold:15 },
  { title:'Hash · Stack · Queue', concepts:['Map','Set','Stack','Queue'], threshold:35 },
  { title:'Brute Force · Greedy', concepts:['Prime','Greedy','Simulation'], threshold:50 },
  { title:'DFS · BFS', concepts:['DFS','BFS','Graph'], threshold:65 },
  { title:'Binary Search · Heap', concepts:['BinarySearch','Heap'], threshold:75 },
  { title:'DP · Advanced Graph', concepts:['DP','ShortestPath'], threshold:85 },
];

function RoadmapPage({ mastery }) {
  const values=Object.values(mastery);const overall=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
  return <div className="page"><PageHeader eyebrow="LEARNING PATH" title="Roadmap" description="문제 수가 아니라 개념별 이해도를 따라 다음 단계가 열립니다." action={<div className="roadmap-score"><strong>{overall}</strong><span>overall mastery</span></div>} /><section className="roadmap-layout"><div className="roadmap-tree">{roadmapNodes.map((node,index)=>{const score=node.concepts.reduce((sum,key)=>sum+(mastery[key]||0),0)/node.concepts.length;const locked=index>1&&overall<node.threshold;return <div className={`roadmap-node ${locked?'locked':score>45?'complete':'current'}`} key={node.title}>{index<roadmapNodes.length-1&&<i className="road-line" />}<span className="node-index">{locked?'×':String(index+1).padStart(2,'0')}</span><div><small>{locked?'LOCKED':score>45?'STRENGTHENING':'CURRENT TRACK'}</small><h3>{node.title}</h3><p>{node.concepts.join(' · ')}</p></div><strong>{Math.round(score)}<small>/100</small></strong></div>})}</div><aside className="mastery-panel"><span className="eyebrow">CONCEPT MASTERY</span><h2>개념별 이해도</h2><p>최근 풀이, 힌트 사용량, 복습 결과를 함께 반영합니다.</p>{Object.entries(mastery).sort(([,a],[,b])=>b-a).slice(0,10).map(([concept,score])=><div className="mastery-row" key={concept}><span>{concept}<b>{score}</b></span><div><i style={{width:`${score}%`}} /></div></div>)}</aside></section></div>;
}

function ReviewPage({ problems, progress, onOpen, languageId }) {
  const [filter,setFilter]=useState('전체'); const now=Date.now();
  const review=problems.filter((problem)=>{const item=progress[problem.id];return item&&(['FAILED','SOLVED_WITH_HINT','REVIEW'].includes(item.status)||item.nextReview);}).filter((problem)=>{const item=progress[problem.id];if(filter==='전체')return true;if(filter==='오답')return item.status==='FAILED';if(filter==='힌트 사용')return item.hintsUsed>0;if(filter==='막힘 기록')return item.stuckCount>0;if(filter==='시간 초과')return item.failureType==='timeout';if(filter==='오래 걸림')return item.timeSpent>problem.estimatedMinutes*60;if(filter==='복습 예정')return item.nextReview;return true;});
  return <div className="page"><PageHeader eyebrow={`SPACED REPETITION · ${getLanguage(languageId).label.toUpperCase()}`} title="복습 큐" description="틀린 문제와 막혔던 문제를 잊기 전에 다시 만나, 먼저 기억을 꺼내봅니다." action={<div className="header-stat amber"><b>{review.filter((item)=>!progress[item.id].nextReview||new Date(progress[item.id].nextReview).getTime()<=now).length}</b><span>오늘 복습</span></div>} /><div className="segmented">{['전체','오답','힌트 사용','막힘 기록','시간 초과','오래 걸림','복습 예정'].map((item)=><button className={filter===item?'active':''} key={item} onClick={()=>setFilter(item)}>{item}</button>)}</div><div className="review-list">{review.map((problem)=>{const item=progress[problem.id];const due=!item.nextReview||new Date(item.nextReview).getTime()<=now;const memory=item.recallCard;return <button key={problem.id} onClick={()=>onOpen(problem)}><span className={`review-icon ${item.status==='FAILED'?'failed':memory?'memory':'hinted'}`}>{item.status==='FAILED'?'!':memory?'↻':'💡'}</span><div><small>{getDisplayProblemId(problem.id,languageId)} · {problem.category}</small><strong>{problem.title}</strong><p>{memory?`막힌 지점 · ${memory.blockage}`:item.failureType==='timeout'?'시간 초과 · 현재 방식의 반복 횟수를 확인해보세요.':item.hintsUsed?`힌트 ${item.hintsUsed}단계 사용 · 스스로 다시 설명해보세요.`:'경계 조건을 다시 확인해보세요.'}</p></div><aside><b>{due?'오늘 복습':'예정'}</b><span>{item.nextReview?new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric'}).format(new Date(item.nextReview)):'지금'}</span></aside></button>})}{!review.length&&<div className="empty-state"><span>✓</span><h3>지금 밀린 복습이 없어요.</h3><p>오답, 힌트 사용, 막힘 기록이 생기면 1·3·7·14일 간격으로 이곳에 나타납니다.</p></div>}</div></div>;
}

function LearningPage({ type, languageId }) {
  const config=type==='AI'
    ? { topics:aiTopics, eyebrow:'FRONT-END × AI', title:'AI 학습', description:'도구 사용법보다 AI 기능을 안전하게 제품에 넣는 법을 연습합니다.' }
    : type==='Career'
      ? { topics:careerTopics, eyebrow:'INTERVIEW SUPPORT · 5%', title:'Git · AWS', description:`코테와 ${getLanguage(languageId).label} 학습을 해치지 않는 범위에서 자주 나오는 실무 면접 개념을 익힙니다.` }
      : languageId === 'java'
        ? { topics:javaTheoryTopics, eyebrow:'JAVA THEORY', title:'Java 이론 학습', description:'문법 암기를 넘어 타입·컬렉션·JVM과 코딩테스트 구현을 연결합니다.' }
        : { topics:theoryTopics, eyebrow:'DEVELOPER THEORY', title:'JavaScript 이론 학습', description:'경력에 맞는 깊이로 JavaScript·브라우저·React를 다시 연결합니다.' };
  const topics=config.topics; const [active,setActive]=useState(topics[0]); const [reveal,setReveal]=useState(0);
  useEffect(()=>{setActive(topics[0]);setReveal(0);},[type, languageId, topics]);
  const choose=(topic)=>{setActive(topic);setReveal(0);};
  return <div className="page"><PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} /><section className="learning-layout"><aside className="topic-list">{topics.map((topic,index)=><button className={active.id===topic.id?'active':''} onClick={()=>choose(topic)} key={topic.id}><span>{String(index+1).padStart(2,'0')}</span><div><small>{topic.area}</small><strong>{topic.title}</strong><p>{topic.minutes}분 · {type==='Career'?'면접형 질문':'사고 질문 포함'}</p></div></button>)}</aside><article className="lesson">{type==='Career'&&<div className="track-priority-note"><span>5%</span><p><strong>후순위 면접 보조 트랙</strong>2시간 미만인 날은 생략하고, 충분한 날에만 Git과 AWS를 번갈아 짧게 학습합니다.</p></div>}<GlossaryGuide /><div className="lesson-meta"><span>{active.area}</span><span>약 {active.minutes}분</span></div><h1>{active.title}</h1><p className="lesson-intro">설명을 읽기 전에 먼저 생각해보세요. 정답 여부보다 어떤 근거로 판단했는지가 중요합니다.</p><div className="thought-question"><span>QUESTION</span><h2><GlossaryText text={active.question} /></h2>{reveal===0&&<button className="secondary-button" onClick={()=>setReveal(1)}>힌트만 보기</button>}{reveal>=1&&<div className="thought-hint"><small>생각의 방향</small><p><GlossaryText text={active.hint} /></p></div>}{reveal===1&&<button className="primary-button" onClick={()=>setReveal(2)}>개념 확인하기 <span>→</span></button>}{reveal>=2&&<div className="thought-answer"><small>CONCEPT</small><p><GlossaryText text={active.answer} /></p><label>내 말로 한 줄 정리<textarea placeholder="내가 이해한 내용을 짧게 적어보세요." /></label></div>}</div></article></section></div>;
}

function NotesPage({ notes, problems }) {
  const entries=Object.entries(notes).filter(([,value])=>value);
  return <div className="page"><PageHeader eyebrow="MY OBSERVATIONS" title="Notes" description="풀이 중 적은 관찰과 해결 후 복기를 한곳에서 다시 봅니다." /><div className="notes-grid">{entries.map(([key,value])=>{const id=key.slice(0,6);const languageId=typeof value==='object'&&value.language?value.language:key.includes(':java')?'java':'javascript';const problem=problems.find((item)=>item.id===id);return <article key={key}><span>{getDisplayProblemId(id,languageId)} · {problem?.category||'복기'}</span>{typeof value==='string'?<p>{value}</p>:<><h3>{value.idea||'풀이 복기'}</h3><p>{value.signal||value.reason}</p><small>{value.type==='struggle'?'막힘 기억 카드':value.complexity}</small></>}</article>})}{!entries.length&&<div className="empty-state wide"><span>≡</span><h3>아직 남긴 메모가 없어요.</h3><p>문제 화면의 내 메모와 풀이 후 복기가 자동으로 모입니다.</p></div>}</div></div>;
}

function AnalyticsPage({ problems, progress, mastery }) {
  const records=Object.values(progress);const solved=records.filter((item)=>item.status?.startsWith('SOLVED')||item.status==='MASTERED');const attempts=records.reduce((sum,item)=>sum+(item.attempts||0),0);const hintRate=solved.length?Math.round(solved.filter((item)=>item.hintsUsed>0).length/solved.length*100):0;const avg=records.length?Math.round(records.reduce((sum,item)=>sum+(item.timeSpent||0),0)/records.length/60):0;const weak=Object.entries(mastery).sort(([,a],[,b])=>a-b).slice(0,3);
  return <div className="page"><PageHeader eyebrow="LEARNING SIGNALS" title="Analytics" description="점수가 아니라 다음 학습을 결정하는 신호만 보여드립니다." /><div className="analytics-stats">{[[attempts,'풀이 시도'],[solved.length,'정답 문제'],[records.filter((item)=>item.nextReview).length,'복습 문제'],[`${avg}분`,'평균 풀이 시간'],[`${hintRate}%`,'힌트 사용률'],[records.length?'1일':'0일','연속 학습']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><section className="analytics-grid"><div className="concept-chart"><span className="eyebrow">CONCEPTS</span><h2>개념별 숙련도</h2>{Object.entries(mastery).sort(([,a],[,b])=>b-a).slice(0,12).map(([concept,score])=><div key={concept}><span>{concept}</span><div><i style={{width:`${score}%`}} /></div><b>{score}</b></div>)}</div><aside className="weak-panel"><span className="eyebrow">NEXT FOCUS</span><h2>가장 약한 개념</h2>{weak.map(([concept,score],index)=><div key={concept}><span>0{index+1}</span><p><strong>{concept}</strong><small>mastery {score}</small></p></div>)}<p className="weak-advice">약한 개념의 쉬운 문제부터 다시 연결해볼게요. 난이도를 급하게 낮추지는 않습니다.</p></aside></section></div>;
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
  const exportData=async()=>{const data=await storage.exportAll();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`loopin-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(url);};
  const importData=async(event)=>{const file=event.target.files?.[0];if(!file)return;try{await storage.importAll(JSON.parse(await file.text()));window.alert('백업을 가져왔어요. 앱을 새로 불러옵니다.');onReload();}catch(error){window.alert(error.message);}};
  const reset=async(store,label)=>{if(!window.confirm(`${label}을(를) 초기화할까요? 이 작업은 되돌릴 수 없어요.`))return;await storage.clear(store);onReload();};
  return <div className="page settings-page"><PageHeader eyebrow="PREFERENCES & DATA" title="Settings" description="집중 환경과 로컬 학습 데이터를 관리합니다." /><section><h2>학습 언어</h2><div className="setting-row"><div><strong>기본 풀이 언어</strong><p>Today·Problems·Theory·복습 기록이 선택한 언어로 전환됩니다.</p></div><select value={settings.learningLanguage} onChange={(event)=>onSetting('learningLanguage',event.target.value)}>{getAvailableLanguages().map((language)=><option value={language.id} key={language.id}>{language.label}</option>)}</select></div>{settings.learningLanguage==='java'&&<JavaRuntimeStatus />}</section><section><h2>화면과 에디터</h2><div className="setting-row"><div><strong>화면 테마</strong><p>오래 봐도 편안한 화면을 선택하세요.</p></div><div className="toggle-group"><button className={settings.theme==='light'?'active':''} onClick={()=>onSetting('theme','light')}>Light</button><button className={settings.theme==='dark'?'active':''} onClick={()=>onSetting('theme','dark')}>Dark</button></div></div><div className="setting-row"><div><strong>에디터 글자 크기</strong><p>코드 에디터에만 적용됩니다.</p></div><select value={settings.editorFontSize} onChange={(event)=>onSetting('editorFontSize',Number(event.target.value))}>{[13,14,15,16,18].map((item)=><option key={item}>{item}px</option>)}</select></div><div className="setting-row"><div><strong>기본 집중 세션</strong><p>오늘의 학습 세션을 나누는 기준입니다.</p></div><select value={settings.focusMinutes} onChange={(event)=>onSetting('focusMinutes',Number(event.target.value))}>{[25,40,50,60,90].map((item)=><option key={item}>{item}분</option>)}</select></div></section><section><h2>Backup</h2><div className="setting-row"><div><strong>데이터 내보내기</strong><p>진도, 코드, 메모, 학습 기록을 JSON 파일로 저장합니다.</p></div><button className="secondary-button" onClick={exportData}>JSON 내보내기</button></div><div className="setting-row"><div><strong>데이터 가져오기</strong><p>다른 PC에서 저장한 loopin 백업을 복구합니다.</p></div><label className="secondary-button file-button">JSON 가져오기<input type="file" accept="application/json" onChange={importData} /></label></div></section><section className="danger-zone"><h2>Reset</h2><div className="reset-actions"><button onClick={()=>reset('progress','문제 진행 상황')}>문제 진행 초기화</button><button onClick={()=>reset('sessions','학습 기록')}>학습 기록 초기화</button><button onClick={()=>reset('code','작성 코드')}>문제 코드 초기화</button><button onClick={async()=>{if(window.confirm('프로필을 포함한 전체 데이터를 초기화할까요?')){for(const store of ['progress','code','notes','sessions','curriculum'])await storage.clear(store);localStorage.clear();onReload();}}}>전체 데이터 초기화</button></div></section></div>;
}

export default function App() {
  const [profile,setProfile]=useState(()=>getLocal('loopin-profile',null));
  const [settings,setSettings]=useState(()=>{
    const saved = getLocal('loopin-settings', {});
    return { theme:'light', editorFontSize:14, focusMinutes:50, ...saved, learningLanguage:saved.learningLanguage || profile?.learningLanguage || 'javascript' };
  });
  const [active,setActive]=useState('today'); const [collapsed,setCollapsed]=useState(false); const [problems,setProblems]=useState([]); const [browseLevel,setBrowseLevel]=useState(profile?.startLevel||0); const [browseProblems,setBrowseProblems]=useState([]); const [browseLoading,setBrowseLoading]=useState(false); const [dailyPlan,setDailyPlan]=useState([]); const [todayMinutes,setTodayMinutes]=useState(profile?.dailyMinutes||120); const [needsDailyTime,setNeedsDailyTime]=useState(false); const [progress,setProgress]=useState({}); const [notes,setNotes]=useState({}); const [selected,setSelected]=useState(null); const [loading,setLoading]=useState(Boolean(profile));

  const loadData=async(activeProfile=profile)=>{
    setLoading(true);
    const languageId = activeProfile?.learningLanguage || settings.learningLanguage || 'javascript';
    const [loaded,storedProgress,storedNotes,languageDaily,legacyDaily] = await Promise.all([
      loadProblemsByLevel(0), storage.getAll('progress'), storage.getAll('notes'), storage.get('curriculum',todayKey(languageId)),
      languageId === 'javascript' ? storage.get('curriculum',legacyTodayKey()) : null,
    ]);
    const storedDaily = languageDaily || legacyDaily;
    const activeProgress = progressForLanguage(loaded, storedProgress, languageId);
    const minutes=storedDaily?.minutes||activeProfile?.dailyMinutes||120;
    const loadedMastery=calculateConceptMastery(loaded,activeProgress);
    let daily=(storedDaily?.ids||[]).map((id)=>loaded.find((item)=>item.id===id)).filter(Boolean);
    if(!daily.length)daily=selectDailyProblems({problems:loaded,progress:activeProgress,mastery:loadedMastery,count:dailyProblemCount(minutes),difficulty:2});
    setProblems(loaded);setDailyPlan(daily);setTodayMinutes(minutes);setNeedsDailyTime(!storedDaily?.minutes);setProgress(storedProgress);setNotes(storedNotes);setLoading(false);
  };
  useEffect(()=>{if(profile)loadData();},[]);
  useEffect(()=>{if(!profile||active!=='problems')return;let current=true;setBrowseLoading(true);loadProblemsByLevel(browseLevel).then((items)=>{if(current)setBrowseProblems(items);}).finally(()=>{if(current)setBrowseLoading(false);});return()=>{current=false;};},[active,browseLevel,profile]);
  useEffect(()=>{document.documentElement.dataset.theme=settings.theme;setLocal('loopin-settings',settings);},[settings]);
  const languageProgress=useMemo(()=>progressForLanguage(problems,progress,settings.learningLanguage),[problems,progress,settings.learningLanguage]);
  const knownProblems=useMemo(()=>[...problems,...browseProblems].filter((problem,index,items)=>items.findIndex((candidate)=>candidate.id===problem.id)===index),[problems,browseProblems]);
  const knownLanguageProgress=useMemo(()=>progressForLanguage(knownProblems,progress,settings.learningLanguage),[knownProblems,progress,settings.learningLanguage]);
  const mastery=useMemo(()=>calculateConceptMastery(problems,languageProgress),[problems,languageProgress]);
  const completeOnboarding=async(nextProfile)=>{setProfile(nextProfile);setSettings((current)=>({...current,learningLanguage:nextProfile.learningLanguage||'javascript'}));setLocal('loopin-profile',nextProfile);await loadData(nextProfile);};
  const updateProgress=async(id,patch,languageId=settings.learningLanguage)=>{const key=getProgressStorageKey(id,languageId);setProgress((current)=>{const next={...current,[key]:{...current[key],...patch,language:languageId}};storage.set('progress',key,next[key]);return next;});};
  const changeTodayMinutes=async(minutes)=>{const nextMinutes=Math.min(720,Math.max(30,Math.round(minutes)));const desired=dailyProblemCount(nextMinutes);const recommendations=selectDailyProblems({problems,progress:languageProgress,mastery,count:Math.max(desired,dailyPlan.length),difficulty:2});const completed=dailyPlan.filter((item)=>['SOLVED','SOLVED_WITH_HINT','MASTERED'].includes(languageProgress[item.id]?.status));const pending=dailyPlan.filter((item)=>!completed.some((done)=>done.id===item.id));const combined=[...completed,...pending,...recommendations].filter((item,index,array)=>array.findIndex((candidate)=>candidate.id===item.id)===index);const nextPlan=combined.slice(0,Math.max(desired,completed.length));setTodayMinutes(nextMinutes);setDailyPlan(nextPlan);setNeedsDailyTime(false);await storage.set('curriculum',todayKey(settings.learningLanguage),{minutes:nextMinutes,ids:nextPlan.map((item)=>item.id),updatedAt:new Date().toISOString()});};
  const onSetting=(key,value)=>setSettings((current)=>({...current,[key]:value}));
  const nextProblem=()=>{if(!selected)return;const sequence=dailyPlan.some((item)=>item.id===selected.id)?dailyPlan:browseProblems.some((item)=>item.id===selected.id)?browseProblems:problems;const index=sequence.findIndex((item)=>item.id===selected.id);setSelected(sequence[(index+1)%sequence.length]);};
  const navigate=(view)=>{setSelected(null);setActive(view);};
  const closeSolver=async()=>{setSelected(null);setNotes(await storage.getAll('notes'));};

  if(!profile)return <Onboarding onComplete={completeOnboarding}/>;
  if(profile.onboardingResultSeen!==true)return <OnboardingResult profile={profile} onComplete={completeOnboarding}/>;
  if(loading)return <div className="app-loading"><span className="brand-mark">L</span><p>오늘의 학습을 준비하고 있어요.</p></div>;
  if(selected){const selectedProgress=progress[getProgressStorageKey(selected.id,settings.learningLanguage)]||(settings.learningLanguage==='javascript'?progress[selected.id]:undefined);return <Suspense fallback={<div className="app-loading"><span className="brand-mark">L</span><p>코드 에디터를 준비하고 있어요.</p></div>}><ProblemSolver key={`${selected.id}:${settings.learningLanguage}`} problem={selected} languageId={settings.learningLanguage} initialProgress={selectedProgress} settings={{...settings,onChange:onSetting}} onClose={closeSolver} onProgress={updateProgress} onNext={nextProblem}/></Suspense>;}

  let page;
  if(active==='today')page=<TodayPage profile={profile} daily={dailyPlan} todayMinutes={todayMinutes} onTimeChange={changeTodayMinutes} progress={languageProgress} mastery={mastery} onOpen={setSelected} settings={settings} languageId={settings.learningLanguage}/>;
  if(active==='problems')page=<ProblemsPage problems={browseProblems} storedProgress={progress} onOpen={setSelected} languageId={settings.learningLanguage} level={browseLevel} onLevelChange={setBrowseLevel} loading={browseLoading}/>;
  if(active==='roadmap')page=<RoadmapPage mastery={mastery}/>;
  if(active==='review')page=<ReviewPage problems={knownProblems} progress={knownLanguageProgress} onOpen={setSelected} languageId={settings.learningLanguage}/>;
  if(active==='theory')page=<LearningPage type="Theory" languageId={settings.learningLanguage}/>;
  if(active==='ai')page=<LearningPage type="AI" languageId={settings.learningLanguage}/>;
  if(active==='career')page=<LearningPage type="Career" languageId={settings.learningLanguage}/>;
  if(active==='notes')page=<NotesPage notes={notes} problems={knownProblems}/>;
  if(active==='analytics')page=<AnalyticsPage problems={knownProblems} progress={knownLanguageProgress} mastery={mastery}/>;
  if(active==='settings')page=<SettingsPage settings={settings} onSetting={onSetting} onReload={()=>window.location.reload()}/>;
  return <><div className="app-shell"><Sidebar active={active} collapsed={collapsed} onToggle={()=>setCollapsed((value)=>!value)} onNavigate={navigate} profile={profile} languageId={settings.learningLanguage}/><div className="app-content">{page}{active==='today'&&!needsDailyTime&&<div className="today-time-floating"><DailyTimeControl minutes={todayMinutes} onChange={changeTodayMinutes} compact/></div>}</div></div>{active==='today'&&needsDailyTime&&<DailyTimeSetup defaultMinutes={todayMinutes} onConfirm={changeTodayMinutes}/>}</>;
}
