import { calculateNextReview } from './calculateNextReview.js';

const solvedStatuses = new Set(['SOLVED', 'SOLVED_WITH_HINT', 'MASTERED']);

export function createStruggleRecord({ problemId, blockage, prompt, recall, nextAttempt, createdAt = new Date().toISOString() }) {
  return {
    type: 'struggle',
    problemId,
    blockage,
    prompt,
    recall: recall.trim(),
    nextAttempt: nextAttempt.trim(),
    idea: `막힌 지점 · ${blockage}`,
    signal: nextAttempt.trim(),
    reason: recall.trim(),
    createdAt,
  };
}

export function createStruggleProgress(current = {}, record, hintLevel = 0) {
  return {
    status: solvedStatuses.has(current.status) ? 'REVIEW' : 'TRYING',
    hintsUsed: Math.max(1, current.hintsUsed || 0, hintLevel),
    lastHintsUsed: Math.max(1, ['TRYING', 'FAILED', 'REVIEW'].includes(current.status) ? current.lastHintsUsed || 0 : 0, hintLevel),
    stuckCount: (current.stuckCount || 0) + 1,
    lastStuckAt: record.createdAt,
    nextReview: calculateNextReview(new Date(record.createdAt), 0, 'retry'),
    recallCard: {
      blockage: record.blockage,
      prompt: record.prompt,
      recall: record.recall,
      nextAttempt: record.nextAttempt,
      createdAt: record.createdAt,
    },
  };
}
