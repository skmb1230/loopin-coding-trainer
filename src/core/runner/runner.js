async function runJava({ code, tests, timeout, javaSpec }) {
  const controller = new AbortController();
  const clientTimeout = setTimeout(() => controller.abort(), Math.max(15_000, timeout + 13_000));
  try {
    const response = await fetch('/api/java/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, tests, timeout, javaSpec }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Java 실행 요청에 실패했어요. (${response.status})`);
    return await response.json();
  } catch (error) {
    return { status: error.name === 'AbortError' ? 'timeout' : 'error', error: error.message, results: [] };
  } finally {
    clearTimeout(clientTimeout);
  }
}

export function runCode({ code, tests, timeout = 2000, language = 'javascript', javaSpec }) {
  if (language === 'java') return runJava({ code, tests, timeout, javaSpec });
  return new Promise((resolve) => {
    if (language !== 'javascript') {
      resolve({ status: 'error', error: `${language} 실행기는 아직 설치되지 않았어요.`, results: [] });
      return;
    }
    let worker;
    try {
      worker = new Worker(new URL('../../workers/runner.worker.js', import.meta.url), { type: 'module' });
    } catch (error) {
      resolve({ status: 'error', error: error.message || '코드 실행 환경을 시작하지 못했어요.', results: [] });
      return;
    }
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
    try {
      worker.postMessage({ code, tests });
    } catch (error) {
      finish({ status: 'error', error: error.message || '테스트를 실행기에 전달하지 못했어요.', results: [] });
    }
  });
}
