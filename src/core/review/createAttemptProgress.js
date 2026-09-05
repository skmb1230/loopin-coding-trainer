import { calculateMastery } from '../mastery/calculateMastery.js';
import { calculateNextReview, isReviewDue } from './calculateNextReview.js';
import { localDayKey, parseLocalDay } from '../dates/localDay.js';

const solvedStatuses = new Set(['SOLVED', 'SOLVED_WITH_HINT', 'MASTERED']);
const nonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const count = value => Math.floor(nonnegative(value));
function dayOf(value) {
  try { return localDayKey(value); } catch { return null; }
}

export function getResumedHintLevel(progress = {}, now = new Date()) {
  const sameDay = progress.lastAttempt && dayOf(progress.lastAttempt) === localDayKey(now);
  return ['TRYING', 'FAILED', 'REVIEW'].includes(progress.status) || sameDay
    ? Math.min(5, count(progress.lastHintsUsed ?? progress.hintsUsed)) : 0;
}

export function createAttemptProgress(current = {}, { status, attempts, hintsUsed = 0, seconds = 0, elapsedSinceLastSubmit = seconds, now = new Date() }) {
  current = current && typeof current === 'object' ? current : {};
  const day = localDayKey(now);
  const date = (typeof now === 'string' && parseLocalDay(now)) || new Date(now);
  const previousDay = dayOf(current.lastAttempt);
  const sameDay = previousDay === day;
  // Reopening the same solved problem must not turn a hinted answer into an
  // independent answer while the learner still remembers today's solution.
  hintsUsed = Math.min(5, Math.max(count(hintsUsed), sameDay ? count(current.lastHintsUsed ?? current.hintsUsed) : 0));
  const solved = status === 'passed';
  const reviewDue = isReviewDue(current.nextReview, date);
  const completedReview = solved && hintsUsed === 0 && reviewDue && current.lastReviewCompletedDay !== day;
  const reviewCount = count(current.reviewCount) + (completedReview ? 1 : 0);
  const creditedToday = current.lastMasteryGainDay === day || (sameDay && solvedStatuses.has(current.status));
  const awardMastery = solved && !creditedToday && (!solvedStatuses.has(current.status) || completedReview);
  const mastery = calculateMastery(current.mastery || 0, {
    solved: awardMastery, firstTry: attempts === 1, hintsUsed, timedOut: status === 'timeout', reviewSuccess: completedReview,
  });
  const mastered = solved && hintsUsed === 0 && (current.status === 'MASTERED' || (completedReview && reviewCount >= 3));
  const validUpcomingReview = current.nextReview && Number.isFinite(new Date(current.nextReview).getTime()) && !reviewDue;
  const nextReview = !solved || hintsUsed > 0 ? calculateNextReview(date, 0)
    : mastered ? null
      : validUpcomingReview ? current.nextReview : calculateNextReview(date, reviewCount);
  const studyDays = [...new Set([...(Array.isArray(current.studyDays) ? current.studyDays.filter(value => parseLocalDay(value)) : []), previousDay, day].filter(Boolean))].sort();
  return {
    status: solved ? (mastered ? 'MASTERED' : hintsUsed ? 'SOLVED_WITH_HINT' : 'SOLVED') : 'FAILED',
    attempts: Math.max(1, count(attempts ?? count(current.attempts) + 1)),
    hintsUsed: Math.max(count(current.hintsUsed), hintsUsed),
    lastHintsUsed: hintsUsed,
    timeSpent: nonnegative(seconds),
    totalTimeSpent: nonnegative(current.totalTimeSpent ?? current.timeSpent) + nonnegative(elapsedSinceLastSubmit),
    mastery,
    lastAttempt: date.toISOString(),
    lastMasteryGainDay: awardMastery || creditedToday ? day : current.lastMasteryGainDay || null,
    lastReviewCompletedDay: completedReview ? day : current.lastReviewCompletedDay || null,
    studyDays,
    reviewCount,
    nextReview,
    failureType: solved ? null : status,
  };
}
