export function runCode({ code, tests, timeout = 2000, language = 'javascript' }) {
  return new Promise((resolve) => {
    if (language !== 'javascript') {
      resolve({ status: 'error', error: `${language} 실행기는 아직 설치되지 않았어요.`, results: [] });
      return;
    }
    const worker = new Worker(new URL('../../workers/runner.worker.js', import.meta.url), { type: 'module' });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ status: 'timeout', results: [] }), timeout);
    worker.onmessage = ({ data }) => {
      if (data.type === 'error') finish({ status: 'error', error: data.error, results: [] });
      else finish({ status: data.results.every((result) => result.passed) ? 'passed' : 'failed', results: data.results });
    };
    worker.onerror = (event) => finish({ status: 'error', error: event.message || '코드를 실행하지 못했어요.', results: [] });
    worker.postMessage({ code, tests });
  });
}
