import { normalizeValue, valuesEqual } from '../core/runner/value.js';

self.onmessage = async ({ data }) => {
  const { code, tests } = data;
  try {
    const factory = new Function(`"use strict";\n${code}\nif (typeof solution !== "function") throw new Error("solution 함수를 찾을 수 없어요.");\nreturn solution;`);
    const solution = factory();
    const results = [];
    for (let index = 0; index < tests.length; index += 1) {
      const test = tests[index];
      const startedAt = performance.now();
      try {
        const args = structuredClone(test.args);
        const actual = await solution(...args);
        results.push({ index, passed: valuesEqual(actual, test.expected), actual: normalizeValue(actual), expected: normalizeValue(test.expected), duration: performance.now() - startedAt, visibility: test.visibility, label: test.label, guidance: test.guidance });
      } catch (error) {
        results.push({ index, passed: false, error: error instanceof Error ? error.message : String(error), duration: performance.now() - startedAt, visibility: test.visibility, label: test.label, guidance: test.guidance });
      }
    }
    self.postMessage({ type: 'complete', results });
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};
