import { calculateStudyAllocation } from '../../core/curriculum/calculateStudyAllocation.js';

const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max ? value : null;

export function getOnboardingSummary(profile, report) {
  const saved = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  const level = integer(saved.startLevel, 0, 5);
  const minutes = integer(saved.dailyMinutes, 1, 1440);
  const days = integer(saved.daysPerWeek, 1, 7);
  const years = typeof saved.frontendYears === 'string' ? Number.parseInt(saved.frontendYears, 10) : NaN;
  const knownRows = report.rows.filter(row => row.isCorrect !== null);
  const strengths = knownRows.filter(row => row.isCorrect).map(row => row.area);
  const reviewAreas = knownRows.filter(row => !row.isCorrect).map(row => row.area);
  const allAnswered = report.rows.length === report.total && knownRows.length === report.total;
  let algorithmTrack = level === null ? '시작 레벨 미기록' : `레벨 ${level} · 저장된 출발점`;
  if (level !== null && report.taken === false) algorithmTrack = `레벨 ${level} · 차근차근`;
  else if (level !== null && report.taken === true && report.score !== null) {
    algorithmTrack = level >= 1 ? `레벨 ${level} · 기초 확인 병행` : report.score >= 4 ? '레벨 0 · 핵심 트랙' : '레벨 0 · 기초 강화';
  }
  return {
    algorithmTrack,
    theoryDepth: !Number.isFinite(years) || years < 0 ? '경력 정보 미기록' : years >= 8 ? '시니어 심화' : years >= 4 ? '실무 심화' : years >= 2 ? '실무 기초' : '기초 연결',
    strengths, reviewAreas,
    firstFocus: report.taken === false ? ['배열', '문자열', '반복문'] : reviewAreas.length ? reviewAreas.slice(0, 3) : allAnswered ? ['Map/Set', '구현 심화'] : [],
    allAnswered,
    weeklyMinutes: minutes !== null && days !== null ? minutes * days : null,
    dailyMinutes: minutes,
    allocation: minutes === null ? null : calculateStudyAllocation(minutes, 'beginner'),
  };
}
