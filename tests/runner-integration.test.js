import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker as ThreadWorker } from 'node:worker_threads';
import { runCode } from '../src/core/runner/runner.js';
import { normalizeValue, valuesEqual } from '../src/core/runner/value.js';
import { checkJdk, executeJava } from '../scripts/javaRunnerPlugin.mjs';

class BrowserWorkerAdapter {
  constructor(url) {
    this.thread = new ThreadWorker(`
      const { parentPort } = require('node:worker_threads');
      globalThis.self = { postMessage: (message) => parentPort.postMessage(message) };
      import(${JSON.stringify(url.href)}).then(() => {
        parentPort.on('message', (data) => self.onmessage({ data }));
      });
    `, { eval: true });
    this.thread.on('message', (data) => this.onmessage?.({ data }));
    this.thread.on('error', (error) => this.onerror?.({ message: error.message }));
  }
  postMessage(value) { this.thread.postMessage(value); }
  terminate() { return this.thread.terminate(); }
}

test('JS grading preserves types instead of comparing display strings', () => {
  for (const [actual, expected] of [
    [undefined, '__undefined__'], [1n, '1n'], [NaN, null], [Infinity, null],
    [new Map(), {}], [[], {}], [{ value: undefined }, { value: '__undefined__' }],
  ]) assert.equal(valuesEqual(actual, expected), false);
  assert.equal(valuesEqual({ rows: [[1, null], []], name: '가나다' }, { name: '가나다', rows: [[1, null], []] }), true);
  assert.equal(valuesEqual([1, 2], [2, 1]), false);
  assert.equal(valuesEqual(0, -0), true);
  assert.equal(valuesEqual(1n, 1n), true);
  assert.deepEqual(normalizeValue([NaN, Infinity, -Infinity]), ['NaN', 'Infinity', '-Infinity']);
});

test('actual JS worker handles values, test isolation, errors and timeout', async () => {
  const originalWorker = globalThis.Worker;
  globalThis.Worker = BrowserWorkerAdapter;
  try {
    const args = [{ name: 'quote"slash\\\n😀', values: [1, 2] }];
    const result = await runCode({ code: 'async function solution(value) { value.values.push(3); return value; }', tests: [
      { args, expected: { values: [1, 2, 3], name: args[0].name } },
      { args, expected: { name: args[0].name, values: [1, 2, 3] } },
    ] });
    assert.equal(result.status, 'passed');
    assert.deepEqual(args[0].values, [1, 2]);
    const wrongType = await runCode({ code: 'function solution() { return NaN; }', tests: [{ args: [], expected: null }] });
    assert.equal(wrongType.status, 'failed');
    const syntax = await runCode({ code: 'function solution( {', tests: [{ args: [], expected: 1 }] });
    assert.equal(syntax.status, 'error');
    const runtime = await runCode({ code: 'function solution(n) { if (!n) throw new Error("확인 실패"); return n; }', tests: [
      { args: [0], expected: 0 }, { args: [2], expected: 2 },
    ] });
    assert.equal(runtime.status, 'failed');
    assert.match(runtime.results[0].error, /확인 실패/);
    assert.equal(runtime.results[1].passed, true);
    const timeout = await runCode({ code: 'function solution() { while (true) {} }', tests: [{ args: [], expected: 0 }], timeout: 250 });
    assert.equal(timeout.status, 'timeout');
    globalThis.Worker = class { constructor() { throw new Error('Worker unavailable'); } };
    assert.equal((await runCode({ code: '', tests: [] })).status, 'error');
  } finally {
    if (originalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = originalWorker;
  }
});

const jdk = await checkJdk();
test('Java runner preserves string escapes, metadata and supported argument shapes', { skip: !jdk.available }, async () => {
  const text = 'quote" slash\\ tab\t line\n\r nul\u0000 back\b form\f 한글😀';
  const code = `class Solution {
    public static Object[] solution(int number, int[] list, int[][] rows, String text, String[] names, boolean enabled, Integer boxed, Object[] mixed) {
      return new Object[]{number, list.length, rows[1][0], text, names[0], enabled, boxed, mixed[2]};
    }
  }`;
  const expected = [42, 2, 9, text, '한글', true, null, false];
  const result = await executeJava({ code, javaSpec: { argTypes: ['int', 'int[]', 'int[][]', 'String', 'String[]', 'boolean', 'Integer', 'Object[]'], returnType: 'Object[]' },
    tests: [{ args: [42, [1, 2], [[], [9]], text, ['한글', null], true, null, [1, '둘', false]], expected, label: text, guidance: text, visibility: 'hidden' }], timeout: 1000 });
  assert.equal(result.status, 'passed', result.error);
  assert.deepEqual(result.results[0].actual, expected);
  assert.deepEqual(result.results[0].expected, expected);
  assert.equal(result.results[0].label, text);
  assert.equal(result.results[0].guidance, text);
  assert.equal(result.results[0].visibility, 'hidden');
  const arrays = await executeJava({ code: 'class Solution { public static int[][] solution(int[][] rows) { return rows; } }', javaSpec: { argTypes: ['int[][]'], returnType: 'int[][]' }, tests: [{ args: [[[1, 2], [], null]], expected: [[1, 2], [], null] }], timeout: 1000 });
  assert.equal(arrays.status, 'passed', arrays.error);
  assert.deepEqual(arrays.results[0].actual, [[1, 2], [], null]);
});

test('Java runner distinguishes compile, runtime, wrong answer, exit and timeout', { skip: !jdk.available }, async () => {
  const javaSpec = { argTypes: ['int'], returnType: 'int' };
  const run = (code, tests = [{ args: [1], expected: 1 }], timeout = 1000) => executeJava({ code, tests, timeout, javaSpec });
  const compile = await run('class Solution { public static int solution(int n) { return ; } }');
  assert.equal(compile.status, 'error');
  assert.match(compile.error, /컴파일 오류/);
  const runtime = await run('class Solution { public static int solution(int n) { if (n == 0) throw new IllegalArgumentException("quote\\\"slash\\\\"); return n; } }', [{ args: [0], expected: 0 }, { args: [2], expected: 2 }]);
  assert.equal(runtime.status, 'failed');
  assert.equal(runtime.results[0].error, 'IllegalArgumentException: quote"slash\\');
  assert.equal(runtime.results[1].passed, true);
  assert.equal((await run('class Solution { public static int solution(int n) { return 99; } }')).status, 'failed');
  assert.equal((await run('class Solution { public static int solution(int n) { System.exit(0); return n; } }')).status, 'error');
  assert.equal((await run('class Solution { public static int solution(int n) { while (true) {} } }', undefined, 500)).status, 'timeout');
});
