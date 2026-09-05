import { calculateStudyStreak, deriveCurriculumState, problemCountsByLevel } from '../../core/curriculum/curriculumEngine.js';

const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const languageLabels = { javascript: 'JavaScript', java: 'Java' };
const text = (value, fallback = '미설정') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const integer = (value, min, max) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;

export function formatProfileMinutes(value) {
  const minutes = integer(value, 1, 1440);
  if (minutes === null) return '미설정';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}시간${rest ? ` ${rest}분` : ''}` : `${rest}분`;
}

export function getProfileSummary({ profile, settings, progress, todayMinutes, now = new Date() } = {}) {
  const initial = record(profile);
  const current = record(settings);
  const history = Object.fromEntries(Object.entries(record(progress)).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value)));
  const score = integer(initial.diagnosticScore, 0, 8);
  const tookDiagnostic = typeof initial.diagnosticTaken === 'boolean' ? initial.diagnosticTaken : score !== null && score > 0 ? true : null;
  const startLevel = integer(initial.startLevel, 0, 5);
  const daysPerWeek = integer(initial.daysPerWeek, 1, 7);
  const targetWeeks = integer(initial.targetWeeks, 1, 520);
  const safeProfile = { ...initial, startLevel: startLevel ?? 0 };
  const language = (id) => Object.hasOwn(languageLabels, id) ? languageLabels[id] : '미설정';

  return {
    hasProfile: Object.keys(initial).length > 0,
    initial: {
      careerYears: text(initial.careerYears),
      frontendYears: text(initial.frontendYears),
      codingTestLevel: text(initial.codingTestLevel),
      goal: text(initial.goal),
      targetWeeks: targetWeeks === null ? '미설정' : `${targetWeeks}주`,
      daysPerWeek: daysPerWeek === null ? '미설정' : `주 ${daysPerWeek}일`,
      dailyTime: formatProfileMinutes(initial.dailyMinutes),
      focusTime: formatProfileMinutes(initial.focusMinutes),
    },
    current: {
      language: language(current.learningLanguage),
      todayTime: formatProfileMinutes(todayMinutes),
      focusTime: formatProfileMinutes(current.focusMinutes),
    },
    diagnostic: {
      language: language(initial.learningLanguage),
      taken: tookDiagnostic,
      status: tookDiagnostic === true ? '응시함' : tookDiagnostic === false ? '미응시' : '응시 여부 미기록',
      score: tookDiagnostic === false ? '미응시' : score === null ? '점수 미기록' : `${score} / 8${tookDiagnostic === null ? ' · 응시 여부 미기록' : ''}`,
      startLevel: startLevel === null ? '미기록' : `Level ${startLevel}`,
    },
    tracks: Object.entries(languageLabels).map(([id, label]) => {
      const curriculum = deriveCurriculumState({ profile: safeProfile, progress: history, languageId: id });
      return {
        id, label,
        selected: current.learningLanguage === id,
        currentLevel: curriculum.currentLevel,
        solved: curriculum.levels.reduce((total, level) => total + level.solved, 0),
        attempted: curriculum.levels.reduce((total, level) => total + level.attempted, 0),
        total: problemCountsByLevel.reduce((total, count) => total + count, 0),
        streak: calculateStudyStreak(history, id, now),
      };
    }),
  };
}
