export function normalizeValue(value) {
  if (typeof value === 'bigint') return `${value}n`;
  if (value === undefined) return '__undefined__';
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeValue(item)]),
    );
  }
  return value;
}

export function valuesEqual(actual, expected) {
  return JSON.stringify(normalizeValue(actual)) === JSON.stringify(normalizeValue(expected));
}
