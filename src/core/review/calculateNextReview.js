const intervals = [1, 3, 7, 14];

export function calculateNextReview(from = new Date(), reviewCount = 0, quality = 'retry') {
  const base = new Date(from);
  const safeCount = Math.max(0, Number(reviewCount) || 0);
  const index = quality === 'easy' ? Math.min(safeCount + 1, intervals.length - 1) : Math.min(safeCount, intervals.length - 1);
  base.setDate(base.getDate() + intervals[index]);
  return base.toISOString();
}

export function isReviewDue(date, now = new Date()) {
  return Boolean(date) && new Date(date).getTime() <= new Date(now).getTime();
}
