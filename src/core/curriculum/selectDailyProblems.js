import { isReviewDue } from '../review/calculateNextReview.js';

function byWeakness(problem, mastery) {
  if (!problem.concepts.length) return 100;
  return problem.concepts.reduce((sum, concept) => sum + (mastery[concept] ?? 0), 0) / problem.concepts.length;
}

export function selectDailyProblems({ problems, progress = {}, mastery = {}, count = 7, difficulty = 1, targetLevel, now = new Date() }) {
  const available = [...problems];
  const due = available
    .filter((problem) => isReviewDue(progress[problem.id]?.nextReview, now))
    .sort((a, b) => new Date(progress[a.id].nextReview) - new Date(progress[b.id].nextReview));
  const targetPool = targetLevel === undefined ? available : available.filter((problem) => problem.level === targetLevel);
  const unsolved = targetPool.filter((problem) => !progress[problem.id]?.status || progress[problem.id].status === 'NOT_STARTED');
  const selected = [];
  const takeUnique = (source, amount) => {
    for (const problem of source) {
      if (selected.length >= count || amount <= 0) break;
      if (!selected.some((item) => item.id === problem.id)) {
        selected.push(problem);
        amount -= 1;
      }
    }
  };

  const reviewCount = Math.max(1, Math.round(count * 0.25));
  const challengeCount = Math.max(1, Math.round(count * 0.15));
  takeUnique(due, reviewCount);
  takeUnique(unsolved.sort((a, b) => byWeakness(a, mastery) - byWeakness(b, mastery) || a.id.localeCompare(b.id)), count - reviewCount - challengeCount);
  takeUnique(unsolved.filter((problem) => problem.difficulty > difficulty).sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id)), challengeCount);
  takeUnique(unsolved, count);
  takeUnique(targetPool.filter((problem) => !due.includes(problem)), count);
  takeUnique(available, count);
  return selected.slice(0, count);
}
