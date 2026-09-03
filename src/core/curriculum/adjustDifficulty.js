export function adjustDifficulty(recentAttempts = [], current = 1) {
  if (recentAttempts.length < 3) return current;
  const sample = recentAttempts.slice(-10);
  const solved = sample.filter((item) => item.solved);
  const accuracy = solved.length / sample.length;
  const averageHints = solved.length ? solved.reduce((sum, item) => sum + (item.hintsUsed || 0), 0) / solved.length : 5;
  if (accuracy >= 0.7 && averageHints <= 1) return Math.min(5, current + 1);
  if (accuracy < 0.35) return Math.max(1, current - 1);
  return current;
}
