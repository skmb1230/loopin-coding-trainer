import { calculateMastery } from '../mastery/calculateMastery.js';
import { calculateNextReview, isReviewDue } from './calculateNextReview.js';

export function getResumedHintLevel(progress = {}) {
  return ['TRYING', 'FAILED', 'REVIEW'].includes(progress.status) ? (progress.lastHintsUsed ?? progress.hintsUsed ?? 0) : 0;
}

export function createAttemptProgress(current = {}, { status, attempts, hintsUsed = 0, seconds = 0, elapsedSinceLastSubmit = seconds, now = new Date() }) {
  const solved = status === 'passed';
  const reviewDue = isReviewDue(current.nextReview, now);
  const completedReview = solved && hintsUsed === 0 && reviewDue;
  const reviewCount = (current.reviewCount || 0) + (completedReview ? 1 : 0);
  const mastery = calculateMastery(current.mastery || 0, {
    solved, firstTry: attempts === 1, hintsUsed, timedOut: status === 'timeout', reviewSuccess: completedReview,
  });
  const mastered = solved && hintsUsed === 0 && (current.status === 'MASTERED' || (completedReview && reviewCount >= 3));
  return {
    status: solved ? (mastered ? 'MASTERED' : hintsUsed ? 'SOLVED_WITH_HINT' : 'SOLVED') : 'FAILED',
    attempts,
    hintsUsed: Math.max(current.hintsUsed || 0, hintsUsed),
    lastHintsUsed: hintsUsed,
    timeSpent: seconds,
    totalTimeSpent: (current.totalTimeSpent ?? current.timeSpent ?? 0) + Math.max(0, elapsedSinceLastSubmit),
    mastery,
    lastAttempt: new Date(now).toISOString(),
    reviewCount,
    nextReview: mastered ? null : current.nextReview && !reviewDue
      ? current.nextReview
      : solved && hintsUsed === 0 && !current.nextReview ? null : calculateNextReview(now, solved && hintsUsed === 0 ? reviewCount : 0),
    failureType: solved ? null : status,
  };
}
