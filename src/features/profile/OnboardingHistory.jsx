import { getDiagnosticReport } from '../../core/onboarding/diagnosticReport.js';
import { getOnboardingSummary } from './onboardingSummary.js';

const duration = (minutes) => minutes === null ? '미기록' : `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}시간` : ''}${minutes % 60 ? ` ${minutes % 60}분` : ''}`.trim();

export default function OnboardingHistory({ profile, headingRef }) {
  const report = getDiagnosticReport(profile);
  const initial = getOnboardingSummary(profile, report);
  const answered = report.rows.filter(row => row.isCorrect !== null);
  const correctCount = answered.filter(row => row.isCorrect).length;
  return <section className="onboarding-history" aria-labelledby="profile-onboarding-title">
    <div className="profile-section-heading"><div><span className="eyebrow">처음 시작할 때의 기록</span><h2 id="profile-onboarding-title" ref={headingRef} tabIndex={-1}>처음 온보딩 결과</h2></div><span className="profile-badge">읽기 전용 · 현재 진도 유지</span></div>
    <p className="profile-section-note">처음 선택한 언어와 저장된 진단 답변을 기준으로 보여드려요. 지금 다른 언어로 공부해도 최초 결과는 바뀌지 않습니다.</p>
    <div className="onboarding-summary-grid">
      <article><h3>코딩테스트 출발점</h3><strong>{initial.algorithmTrack}</strong><p>시작 레벨과 처음 진단 점수 기준</p></article>
      <article><h3>이론 추천 깊이</h3><strong>{initial.theoryDepth}</strong><p>처음 입력한 프론트엔드 경력 참고 · 이론 주제는 직접 선택</p></article>
      <article><h3>처음 집중할 영역</h3><strong>{initial.firstFocus.join(' · ') || '답변 기록 부족'}</strong><p>{report.taken === false ? '진단 없이 시작할 때의 기본 추천' : initial.allAnswered && !initial.reviewAreas.length ? '모든 문항을 맞힌 경우의 다음 추천 영역' : '저장된 오답에서 최대 세 영역을 추천'}</p></article>
      <article><h3>기본 주간 학습 시간</h3><strong>{initial.weeklyMinutes === null ? '미기록' : `주 ${duration(initial.weeklyMinutes)}`}</strong><p>처음 설정한 하루 시간 × 주당 학습일</p></article>
    </div>
    {initial.allocation && <details className="onboarding-allocation"><summary>시작 정보 기준 학습 배분 보기 · 하루 {duration(initial.dailyMinutes)}</summary><p>저장된 기본 시간을 현재 배분 기준으로 다시 계산한 참고표예요. 오늘 확정한 공부 시간과는 별개입니다.</p><dl>{[
      ['problems', '코딩테스트'], ['theory', `${report.languageLabel} · 알고리즘 이론`], ['ai', '인공지능 학습'],
      ['systems', '네트워크·메일·보안'], ['career', '깃·클라우드 면접'], ['review', '오답 복습'],
    ].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{initial.allocation[key] === 0 ? '배정 없음' : duration(initial.allocation[key])}</dd></div>)}</dl></details>}
    <div className="diagnostic-history-heading"><div><h3>처음 테스트 결과</h3><p>{report.languageLabel} · {report.total}문제 진단</p></div><strong>{report.taken === false ? '미응시' : report.score === null ? '점수 미기록' : `${report.score} / ${report.total}`}</strong></div>
    {report.notice && <p className="profile-diagnostic-note" role="status">{report.notice}</p>}
    {report.scoreSource === 'answers' && <p className="profile-section-note">총점이 따로 저장되지 않아 남아 있는 전체 답변으로 계산한 점수예요.</p>}
    {report.rows.length > 0 && <>
      <div className="diagnostic-history-counts"><span>답변 기록 {report.answeredCount} / {report.total}</span><span>기록된 정답 {correctCount}개</span><span>기록된 오답 {answered.length - correctCount}개</span><span>답변 미기록 {report.total - report.answeredCount}개</span></div>
      {answered.length > 0 && <div className="diagnostic-area-summary"><p><b>맞힌 영역</b> {initial.strengths.join(' · ') || '기록된 정답 없음'}</p><p><b>다시 볼 영역</b> {initial.reviewAreas.join(' · ') || (initial.allAnswered ? '모두 맞혔어요' : '기록된 오답 없음 · 미기록 문항은 판단하지 않아요')}</p></div>}
      <div className="diagnostic-history-questions">{report.rows.map(row => <article className={`diagnostic-history-question ${row.isCorrect === null ? 'missing' : row.isCorrect ? 'correct' : 'incorrect'}`} key={row.number}>
        <div className="diagnostic-question-meta"><span>문항 {row.number} · {row.area}</span><strong>{row.isCorrect === null ? '답변 미기록' : row.isCorrect ? '✓ 정답' : '오답'}</strong></div>
        <h4>{row.question}</h4>
        <dl><div><dt>내가 고른 답</dt><dd>{row.selectedAnswer === null ? '저장된 답변이 없어요' : row.selectedAnswer}</dd></div><div><dt>정답</dt><dd>{row.correctAnswer}</dd></div></dl>
        <details><summary>보기 전체와 해설</summary><ol>{row.options.map((option, index) => <li key={index}>{option}{row.selectedIndex === index && <span> · 내 선택</span>}{option === row.correctAnswer && <strong> · 정답</strong>}</li>)}</ol><p>{row.explanation}</p></details>
      </article>)}</div>
    </>}
  </section>;
}
