export function normalizeValue(value) {
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
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
  // Formatting is only for display. JSON serialization collapses NaN to null
  // and our display labels intentionally resemble ordinary strings.
  if (actual === expected) return true;
  if (typeof actual !== typeof expected || actual === null || expected === null) return false;
  if (typeof actual !== 'object') return false;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
    for (let index = 0; index < actual.length; index += 1) {
      if (!valuesEqual(actual[index], expected[index])) return false;
    }
    return true;
  }
  const isRecord = (value) => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
  if (!isRecord(actual) || !isRecord(expected)) return false;
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  return actualKeys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.hasOwn(actual, key) && valuesEqual(actual[key], expected[key]));
}
