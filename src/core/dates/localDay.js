export function parseLocalDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const result = new Date(0);
  result.setHours(12, 0, 0, 0);
  result.setFullYear(year, month - 1, date);
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === date ? result : null;
}

/** Calendar date in the user's timezone; never truncate a UTC ISO timestamp. */
export function localDayKey(now) {
  const date = typeof now === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(now) ? parseLocalDay(now) : now instanceof Date ? new Date(now.getTime()) : typeof now === 'number' || typeof now === 'string' ? new Date(now) : null;
  if (!date || !Number.isFinite(date.getTime())) throw new TypeError('A valid explicit date is required.');
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addLocalDays(day, amount) {
  const date = parseLocalDay(day);
  if (!date || !Number.isInteger(amount)) throw new TypeError('A valid local day and integer day count are required.');
  date.setDate(date.getDate() + amount);
  return localDayKey(date);
}
