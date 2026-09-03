const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function calculateMastery(currentScore = 0, attempt = {}) {
  const {
    solved = false,
    firstTry = false,
    hintsUsed = 0,
    timedOut = false,
    reviewSuccess = false,
  } = attempt;

  if (!solved) return clamp(currentScore - (timedOut ? 1 : 0));

  let gain = 7;
  if (firstTry) gain += 5;
  if (hintsUsed === 0) gain += 3;
  gain -= Math.min(hintsUsed, 5);
  if (reviewSuccess) gain += 4;
  return clamp(Math.round(currentScore + Math.max(2, gain)));
}

export function calculateConceptMastery(problems, progress) {
  const totals = new Map();
  for (const problem of problems) {
    const record = progress[problem.id];
    for (const concept of problem.concepts) {
      const current = totals.get(concept) || { score: 0, count: 0 };
      const score = record?.mastery ?? (record?.status === 'SOLVED' ? 55 : record?.status === 'SOLVED_WITH_HINT' ? 42 : 0);
      totals.set(concept, { score: current.score + score, count: current.count + 1 });
    }
  }
  return Object.fromEntries([...totals].map(([concept, value]) => [concept, Math.round(value.score / value.count)]));
}
