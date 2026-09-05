import { getProfileSummary } from './profileSummary.js';
import { useRef } from 'react';
import OnboardingHistory from './OnboardingHistory.jsx';
import './profile.css';

function InformationList({ rows }) {
  return <dl className="profile-information-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export default function ProfilePage({ profile, settings, progress, todayMinutes, onNavigate }) {
  const summary = getProfileSummary({ profile, settings, progress, todayMinutes });
  const onboardingHeading = useRef(null);
  const showInitialResult = () => { onboardingHeading.current?.scrollIntoView({ block: 'start' }); onboardingHeading.current?.focus({ preventScroll: true }); };
  const canNavigate = typeof onNavigate === 'function';
  const navigate = (page) => { if (canNavigate) onNavigate(page); };

  return <main className="page profile-page">
    <header className="page-header profile-page-header">
      <div><span className="eyebrow">나의 학습 정보</span><h1>내 정보</h1><p>처음 정한 출발점과 지금의 학습 현황을 함께 확인하세요.</p></div>
      <div className="profile-header-actions"><button className="primary-button" onClick={showInitialResult}>처음 테스트 결과 보기</button><button className="secondary-button" disabled={!canNavigate} onClick={() => navigate('settings')}>설정 열기 <span aria-hidden="true">↗</span></button></div>
    </header>

    {!summary.hasProfile && <p className="profile-empty-notice" role="status">저장된 시작 정보가 아직 없어요. 기록하지 않은 항목은 미설정으로 표시합니다.</p>}

    <section className="profile-current" aria-labelledby="profile-current-title">
      <div className="profile-section-heading"><div><span className="eyebrow">현재 적용 중</span><h2 id="profile-current-title">지금의 학습 설정</h2></div><span className="profile-badge">기본값과 구분해서 보기</span></div>
      <dl className="profile-current-values">
        <div><dt>현재 선택한 언어</dt><dd>{summary.current.language}</dd><span>설정에서 바꿀 수 있어요</span></div>
        <div><dt>오늘 가능한 학습 시간</dt><dd>{summary.current.todayTime}</dd><span>오늘 계획에 적용되는 시간</span></div>
        <div><dt>현재 집중 세션 길이</dt><dd>{summary.current.focusTime}</dd><span>현재 설정에 적용된 세션 길이</span></div>
      </dl>
      <p className="profile-section-note">오늘 가능한 시간은 매일 달라질 수 있어요. 처음 설정한 기본 학습 시간과 별도로 관리합니다.</p>
    </section>

    <div className="profile-info-grid">
      <section className="profile-card" aria-labelledby="profile-start-title">
        <div className="profile-section-heading"><div><span className="eyebrow">처음 입력한 정보</span><h2 id="profile-start-title">경력과 학습 목표</h2></div></div>
        <InformationList rows={[
          ['전체 개발 경력', summary.initial.careerYears], ['프론트엔드 경력', summary.initial.frontendYears],
          ['시작 당시 코딩테스트 경험', summary.initial.codingTestLevel], ['학습 목표', summary.initial.goal],
          ['목표 학습 기간', summary.initial.targetWeeks], ['주당 학습일', summary.initial.daysPerWeek],
          ['기본 하루 학습 시간', summary.initial.dailyTime], ['처음 설정한 집중 세션', summary.initial.focusTime],
        ]} />
        <p className="profile-section-note">시작할 때 저장한 정보예요. 개발 경력과 코딩테스트 실력은 별도로 봅니다.</p>
      </section>

      <section className="profile-card profile-diagnostic" aria-labelledby="profile-diagnostic-title">
        <div className="profile-section-heading"><div><span className="eyebrow">출발점 기록</span><h2 id="profile-diagnostic-title">처음 진단과 시작 레벨</h2></div></div>
        <div className="profile-diagnostic-score"><span>{summary.diagnostic.status}</span><strong>{summary.diagnostic.score}</strong></div>
        <InformationList rows={[
          ['시작 당시 선택 언어', summary.diagnostic.language], ['처음 시작한 레벨', summary.diagnostic.startLevel],
        ]} />
        <p className="profile-section-note">진단은 8문제로 확인한 당시의 출발점이에요. 현재 레벨은 아래 언어별 풀이 기록에 따라 달라집니다.</p>
        {summary.diagnostic.taken === false && <p className="profile-diagnostic-note">진단 없이 시작한 기록이에요. 미응시는 0점과 다르게 표시합니다.</p>}
        <button className="secondary-button" onClick={showInitialResult}>문항별 답변과 온보딩 결과 보기</button>
      </section>
    </div>

    <OnboardingHistory profile={profile} headingRef={onboardingHeading}/>

    <section className="profile-progress-section" aria-labelledby="profile-progress-title">
      <div className="profile-section-heading"><div><span className="eyebrow">풀이 기록 기준</span><h2 id="profile-progress-title">언어별 학습 현황</h2></div></div>
      <div className="profile-language-grid">{summary.tracks.map((track) => <article className={`profile-card profile-language-card${track.selected ? ' selected' : ''}`} key={track.id}>
        <div className="profile-language-heading"><h3><span className={`profile-language-mark ${track.id}`} aria-hidden="true">{track.id === 'javascript' ? 'JS' : 'J'}</span>{track.label}</h3>{track.selected && <span className="profile-badge">현재 선택</span>}</div>
        <dl className="profile-track-stats"><div><dt>현재 레벨</dt><dd>Level {track.currentLevel}</dd></div><div><dt>해결한 문제</dt><dd>{track.solved}<small> / {track.total}개</small></dd></div><div><dt>연속 학습</dt><dd>{track.streak}<small>일</small></dd></div></dl>
        <p className="profile-section-note">{track.attempted ? `진행 기록이 있는 문제 ${track.attempted}개 · 해당 언어의 제출 날짜로 연속 학습일을 계산합니다.` : '아직 이 언어로 진행한 문제 기록이 없어요.'}</p>
      </article>)}</div>
      <p className="profile-section-note">JavaScript와 Java의 코드·진도는 각각 저장합니다. 선택 학습인 회의 용어는 이 코테 진도와 연속 학습일에 포함하지 않습니다.</p>
    </section>

    <section className="profile-storage-note" aria-labelledby="profile-storage-title"><div><h2 id="profile-storage-title">내 기록은 이 브라우저에 저장돼요</h2><p>다른 브라우저나 PC로 옮기거나 브라우저 데이터를 삭제하기 전, 설정에서 JSON 백업을 내보내 주세요. 저장된 학습 정보와 풀이 기록을 다시 가져올 수 있어요.</p></div><button className="primary-button" disabled={!canNavigate} onClick={() => navigate('today')}>오늘 학습으로 <span aria-hidden="true">→</span></button></section>
  </main>;
}
