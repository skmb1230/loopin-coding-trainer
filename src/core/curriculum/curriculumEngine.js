import { adjustDifficulty } from './adjustDifficulty.js';

export const problemCountsByLevel = Object.freeze([200, 220, 180, 120, 60, 20]);

export const levelRequirements = Object.freeze([
  { minSolved: 12, minMastery: 45, minIndependentRate: 0.4 },
  { minSolved: 15, minMastery: 48, minIndependentRate: 0.4 },
  { minSolved: 15, minMastery: 50, minIndependentRate: 0.45 },
  { minSolved: 12, minMastery: 52, minIndependentRate: 0.45 },
  { minSolved: 8, minMastery: 55, minIndependentRate: 0.5 },
  null,
]);

const solvedStatuses = new Set(['SOLVED', 'SOLVED_WITH_HINT', 'MASTERED']);

export function getProblemIdFromStorageKey(key = '') {
  return String(key).match(/JS\d{4}/)?.[0] || null;
}

export function getProblemLevel(problemId = '') {
  const match = String(problemId).match(/^JS([0-5])\d{3}$/);
  return match ? Number(match[1]) : null;
}

export function getLanguageProgress(progress = {}, languageId = 'javascript') {
  const records = {};

  if (languageId === 'javascript') {
    for (const [key, record] of Object.entries(progress)) {
      if (/^JS\d{4}$/.test(key)) records[key] = { ...record, problemId: key, language: 'javascript' };
    }
  }

  for (const [key, record] of Object.entries(progress)) {
    const suffix = key.match(/^((?:JS)\d{4}):([^:]+)$/);
    if (suffix?.[2] === languageId) records[suffix[1]] = { ...record, problemId: suffix[1], language: languageId };
  }

  return records;
}

function recordMastery(record) {
  const statusFloor = record?.status === 'MASTERED' ? 85 : record?.status === 'SOLVED' ? 58 : record?.status === 'SOLVED_WITH_HINT' ? 44 : 0;
  if (Number.isFinite(record?.mastery)) return Math.max(statusFloor, record.mastery);
  if (statusFloor) return statusFloor;
  return 0;
}

export function calculateLevelStats(progress = {}, languageId = 'javascript') {
  const records = getLanguageProgress(progress, languageId);
  return problemCountsByLevel.map((total, level) => {
    const attemptedRecords = Object.values(records).filter((record) => getProblemLevel(record.problemId) === level && record.status && record.status !== 'NOT_STARTED');
    const solved = attemptedRecords.filter((record) => solvedStatuses.has(record.status));
    const independent = solved.filter((record) => (record.lastHintsUsed ?? record.hintsUsed ?? 0) === 0);
    const mastery = attemptedRecords.length
      ? Math.round(attemptedRecords.reduce((sum, record) => sum + recordMastery(record), 0) / attemptedRecords.length)
      : 0;
    const requirement = levelRequirements[level];
    const independentRate = solved.length ? independent.length / solved.length : 0;
    const readyForNext = !requirement || (
      solved.length >= requirement.minSolved
      && mastery >= requirement.minMastery
      && independentRate >= requirement.minIndependentRate
    );
    return {
      level,
      total,
      attempted: attemptedRecords.length,
      solved: solved.length,
      independent: independent.length,
      independentRate,
      mastery,
      requirement,
      readyForNext,
    };
  });
}

export function deriveCurriculumState({ profile = {}, progress = {}, languageId = 'javascript' } = {}) {
  const startLevel = Math.min(5, Math.max(0, Number(profile.startLevel) || 0));
  const levels = calculateLevelStats(progress, languageId);
  let currentLevel = startLevel;
  while (currentLevel < 5 && levels[currentLevel].readyForNext) currentLevel += 1;

  const recentAttempts = Object.values(getLanguageProgress(progress, languageId))
    .filter((record) => record.lastAttempt)
    .sort((left, right) => new Date(left.lastAttempt) - new Date(right.lastAttempt))
    .slice(-10)
    .map((record) => ({
      solved: solvedStatuses.has(record.status),
      hintsUsed: record.lastHintsUsed ?? record.hintsUsed ?? 0,
      timedOut: record.failureType === 'timeout',
    }));
  const baseDifficulty = [1, 2, 3, 4, 5, 5][currentLevel];

  return {
    currentLevel,
    unlockedLevel: currentLevel,
    targetDifficulty: adjustDifficulty(recentAttempts, baseDifficulty),
    stage: currentLevel >= 4 ? 'practical' : currentLevel >= 2 ? 'intermediate' : 'beginner',
    levels,
  };
}

export function getLevelsReferencedByProgress(progress = {}, languageId = 'javascript') {
  return [...new Set(Object.keys(getLanguageProgress(progress, languageId))
    .map(getProblemLevel)
    .filter((level) => level !== null))].sort((a, b) => a - b);
}

export function getLevelsReferencedByIds(ids = []) {
  return [...new Set(ids.map(getProblemLevel).filter((level) => level !== null))].sort((a, b) => a - b);
}

export function calculateStudyStreak(progress = {}, languageId = 'javascript', now = new Date()) {
  const days = new Set(Object.values(getLanguageProgress(progress, languageId))
    .map((record) => record.lastAttempt)
    .filter(Boolean)
    .map((value) => new Date(value).toLocaleDateString('en-CA')));
  if (!days.size) return 0;

  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = cursor.toLocaleDateString('en-CA');
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toLocaleDateString('en-CA'))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
