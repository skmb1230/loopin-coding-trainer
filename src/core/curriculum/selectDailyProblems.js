import { isReviewDue } from '../review/calculateNextReview.js';

function byWeakness(problem, mastery) {
  if (!problem.concepts?.length) return 100;
  return problem.concepts.reduce((sum, concept) => sum + (Number.isFinite(mastery?.[concept]) ? mastery[concept] : 0), 0) / problem.concepts.length;
}

export function selectDailyProblems({ problems, progress = {}, mastery = {}, count = 7, difficulty = 1, targetLevel, now = new Date() }) {
  const desired = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 7;
  if (!desired) return [];
  const available = [...new Map((Array.isArray(problems) ? problems : []).filter(problem => problem?.id).map(problem => [problem.id, problem])).values()];
  const due = available
    .filter((problem) => isReviewDue(progress[problem.id]?.nextReview, now))
    .sort((a, b) => new Date(progress[a.id].nextReview) - new Date(progress[b.id].nextReview));
  const targetPool = targetLevel === undefined ? available : available.filter((problem) => problem.level === targetLevel);
  const solvedStatuses = new Set(['SOLVED', 'SOLVED_WITH_HINT', 'MASTERED']);
  const unsolved = targetPool.filter(problem => !solvedStatuses.has(progress[problem.id]?.status));
  const inProgress = unsolved.filter(problem => ['TRYING', 'FAILED', 'REVIEW'].includes(progress[problem.id]?.status));
  const selected = [];
  const takeUnique = (source, amount) => {
    for (const problem of source) {
      if (selected.length >= desired || amount <= 0) break;
      if (!selected.some((item) => item.id === problem.id)) {
        selected.push(problem);
        amount -= 1;
      }
    }
  };

  const reviewCount = Math.max(1, Math.round(desired * 0.25));
  const challengeCount = Math.max(1, Math.round(desired * 0.15));
  takeUnique(due, reviewCount);
  takeUnique(inProgress, Math.max(1, desired - reviewCount - challengeCount));
  takeUnique(unsolved.sort((a, b) => byWeakness(a, mastery) - byWeakness(b, mastery) || a.id.localeCompare(b.id)), Math.max(0, desired - selected.length - challengeCount));
  takeUnique(unsolved.filter((problem) => problem.difficulty > difficulty).sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id)), challengeCount);
  takeUnique(unsolved, desired);
  takeUnique(targetPool.filter((problem) => !due.includes(problem)), desired);
  // A short target pool may use additional actual reviews, but must never unlock
  // unrelated new levels merely to fill a requested daily count.
  takeUnique(due, desired);
  return selected.slice(0, desired);
}
