import { spawn } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RESULT_MARKER = '__LOOPIN_JAVA_RESULT__';
const MAX_BODY_BYTES = 1_000_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const SUPPORTED_TYPES = new Set(['int', 'Integer', 'boolean', 'String', 'int[]', 'int[][]', 'String[]', 'Object[]']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function isLocalRequest(request) {
  try {
    const host = new URL(`http://${request.headers.host}`).hostname;
    if (!LOCAL_HOSTS.has(host)) return false;
    if (!request.headers.origin) return true;
    return LOCAL_HOSTS.has(new URL(request.headers.origin).hostname);
  } catch {
    return false;
  }
}

async function findJavaTool(tool) {
  const executable = process.platform === 'win32' ? `${tool}.exe` : tool;
  const candidates = [
    process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', executable) : null,
    `/opt/homebrew/opt/openjdk@21/bin/${tool}`,
    `/usr/local/opt/openjdk@21/bin/${tool}`,
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; }
    catch { /* 다음 설치 위치를 확인합니다. */ }
  }
  return executable;
}

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
};

function runProcess(command, args, { cwd, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const append = (current, chunk) => (current + chunk.toString('utf8')).slice(-MAX_OUTPUT_BYTES);
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, timedOut, ...result });
    };

    child.on('error', (error) => finish({ code: null, error }));
    child.on('close', (code, signal) => finish({ code, signal }));
  });
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('요청한 코드가 너무 큽니다.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const javaString = (value) => JSON.stringify(String(value))
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

function javaLiteral(value, type) {
  if (!SUPPORTED_TYPES.has(type) && type !== 'Object') throw new Error(`지원하지 않는 Java 타입: ${type}`);
  if (value === null) return 'null';
  if (type === 'int' || type === 'Integer') {
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new Error('int 범위를 벗어난 테스트 값입니다.');
    return String(value);
  }
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'String') return javaString(value);
  if (type === 'int[]') return `new int[]{${value.map((item) => javaLiteral(item, 'int')).join(', ')}}`;
  if (type === 'int[][]') return `new int[][]{${value.map((item) => javaLiteral(item, 'int[]')).join(', ')}}`;
  if (type === 'String[]') return `new String[]{${value.map((item) => javaLiteral(item, 'String')).join(', ')}}`;
  if (type === 'Object[]') return `new Object[]{${value.map((item) => javaLiteral(item, 'Object')).join(', ')}}`;
  if (type === 'Object') {
    if (typeof value === 'string') return javaString(value);
    if (typeof value === 'number') return `Integer.valueOf(${javaLiteral(value, 'int')})`;
    if (typeof value === 'boolean') return value ? 'Boolean.TRUE' : 'Boolean.FALSE';
  }
  throw new Error(`Java 리터럴로 바꿀 수 없는 값입니다: ${type}`);
}

function buildHarness(tests, javaSpec) {
  const blocks = tests.map((test, index) => {
    if (!Array.isArray(test.args) || test.args.length !== javaSpec.argTypes.length) throw new Error('테스트 인자 수와 Java 메서드 시그니처가 다릅니다.');
    const args = test.args.map((value, argIndex) => javaLiteral(value, javaSpec.argTypes[argIndex])).join(', ');
    const expected = javaLiteral(test.expected, javaSpec.returnType);
    return `
    {
      long started = System.nanoTime();
      Object actual = null;
      Object expected = ${expected};
      String error = null;
      boolean passed = false;
      try {
        actual = Solution.solution(${args});
        passed = deepEquals(actual, expected);
      } catch (Throwable throwable) {
        error = throwable.getClass().getSimpleName() + (throwable.getMessage() == null ? "" : ": " + throwable.getMessage());
      } finally {
        System.setOut(silentOut);
      }
      if (${index} > 0) results.append(',');
      appendResult(results, ${index}, ${javaString(test.visibility || 'public')}, ${javaString(test.label || '')}, ${javaString(test.guidance || '')}, passed, expected, actual, error, (System.nanoTime() - started) / 1_000_000.0);
    }`;
  }).join('\n');

  return String.raw`import java.io.*;
import java.lang.reflect.Array;
import java.util.*;

class LoopinRunner {
  private static boolean deepEquals(Object left, Object right) {
    if (left == right) return true;
    if (left == null || right == null) return false;
    if (left.getClass().isArray() && right.getClass().isArray()) {
      int length = Array.getLength(left);
      if (length != Array.getLength(right)) return false;
      for (int i = 0; i < length; i++) {
        if (!deepEquals(Array.get(left, i), Array.get(right, i))) return false;
      }
      return true;
    }
    return Objects.equals(left, right);
  }

  private static String quote(String value) {
    if (value == null) return "null";
    StringBuilder output = new StringBuilder("\"");
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      switch (ch) {
        case '\\' -> output.append("\\\\");
        case '"' -> output.append("\\\"");
        case '\n' -> output.append("\\n");
        case '\r' -> output.append("\\r");
        case '\t' -> output.append("\\t");
        default -> {
          if (ch < 32) output.append(String.format("\\u%04x", (int) ch));
          else output.append(ch);
        }
      }
    }
    return output.append('"').toString();
  }

  private static String toJson(Object value) {
    if (value == null) return "null";
    if (value instanceof String || value instanceof Character) return quote(String.valueOf(value));
    if (value instanceof Number || value instanceof Boolean) return String.valueOf(value);
    if (value.getClass().isArray()) {
      StringBuilder output = new StringBuilder("[");
      for (int i = 0; i < Array.getLength(value); i++) {
        if (i > 0) output.append(',');
        output.append(toJson(Array.get(value, i)));
      }
      return output.append(']').toString();
    }
    if (value instanceof Iterable<?> iterable) {
      StringBuilder output = new StringBuilder("[");
      int index = 0;
      for (Object item : iterable) {
        if (index++ > 0) output.append(',');
        output.append(toJson(item));
      }
      return output.append(']').toString();
    }
    return quote(String.valueOf(value));
  }

  private static void appendResult(StringBuilder output, int index, String visibility, String label, String guidance, boolean passed, Object expected, Object actual, String error, double duration) {
    output.append('{')
      .append("\"index\":").append(index).append(',')
      .append("\"visibility\":").append(quote(visibility)).append(',')
      .append("\"label\":").append(quote(label)).append(',')
      .append("\"guidance\":").append(quote(guidance)).append(',')
      .append("\"passed\":").append(passed).append(',')
      .append("\"expected\":").append(toJson(expected)).append(',')
      .append("\"actual\":").append(toJson(actual)).append(',')
      .append("\"error\":").append(error == null ? "null" : quote(error)).append(',')
      .append("\"duration\":").append(String.format(Locale.US, "%.3f", duration))
      .append('}');
  }

  public static void main(String[] args) {
    PrintStream originalOut = System.out;
    PrintStream silentOut = new PrintStream(OutputStream.nullOutputStream());
    System.setOut(silentOut);
    StringBuilder results = new StringBuilder("[");
${blocks}
    results.append(']');
    System.setOut(originalOut);
    originalOut.println("${RESULT_MARKER}" + results);
  }
}
`;
}

const cleanCompilerOutput = (output, workingDirectory) => output
  .split(workingDirectory).join('[임시 폴더]')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const jdkMissing = (result) => Boolean(result.error?.code === 'ENOENT' || /unable to locate a java runtime|no java runtime present|command not found|release version 21 not supported/i.test(result.stderr));

export async function checkJdk() {
  const result = await runProcess(await findJavaTool('javac'), ['-version'], { timeoutMs: 5000 });
  if (jdkMissing(result) || result.code !== 0) return { available: false, requirement: 'JDK 21+' };
  const versionText = `${result.stdout} ${result.stderr}`.trim();
  const major = Number(versionText.match(/javac\s+(\d+)/)?.[1] || 0);
  return { available: major >= 21, version: versionText, major, requirement: 'JDK 21+' };
}

export async function executeJava({ code, tests, javaSpec, timeout }) {
  if (typeof code !== 'string' || !Array.isArray(tests) || !javaSpec) throw new Error('Java 실행 요청 형식이 올바르지 않습니다.');
  if (!Array.isArray(javaSpec.argTypes) || !javaSpec.argTypes.every((type) => SUPPORTED_TYPES.has(type)) || !SUPPORTED_TYPES.has(javaSpec.returnType)) {
    throw new Error('지원하지 않는 Java 메서드 시그니처입니다.');
  }

  const workingDirectory = await mkdtemp(join(tmpdir(), 'loopin-java-'));
  try {
    const harness = buildHarness(tests, javaSpec);
    await Promise.all([
      writeFile(join(workingDirectory, 'Solution.java'), code, 'utf8'),
      writeFile(join(workingDirectory, 'LoopinRunner.java'), harness, 'utf8'),
    ]);

    const compile = await runProcess(await findJavaTool('javac'), ['--release', '21', '-encoding', 'UTF-8', '-d', workingDirectory, 'Solution.java', 'LoopinRunner.java'], {
      cwd: workingDirectory,
      timeoutMs: 12_000,
    });
    if (jdkMissing(compile)) return { status: 'error', error: 'Java 실행에 JDK 21 이상이 필요해요. Settings의 설치 안내를 확인해주세요.', results: [], runtimeMissing: true };
    if (compile.timedOut) return { status: 'error', error: 'Java 컴파일 시간이 너무 오래 걸렸어요.', results: [] };
    if (compile.code !== 0) return { status: 'error', error: `컴파일 오류\n${cleanCompilerOutput(compile.stderr || compile.stdout, workingDirectory)}`, results: [] };

    const execution = await runProcess(await findJavaTool('java'), ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', '-Xms16m', '-Xmx128m', '-XX:MaxMetaspaceSize=64m', '-cp', workingDirectory, 'LoopinRunner'], {
      cwd: workingDirectory,
      timeoutMs: Math.min(10_000, Math.max(500, Number(timeout) || 2000)),
    });
    if (execution.timedOut) return { status: 'timeout', results: [] };
    if (jdkMissing(execution)) return { status: 'error', error: 'Java 실행에 JDK 21 이상이 필요해요. Settings의 설치 안내를 확인해주세요.', results: [], runtimeMissing: true };

    const markerIndex = execution.stdout.lastIndexOf(RESULT_MARKER);
    if (markerIndex < 0) {
      const detail = cleanCompilerOutput(execution.stderr || execution.stdout, workingDirectory);
      return { status: 'error', error: detail || 'Java 프로그램이 테스트 결과를 반환하기 전에 종료됐어요.', results: [] };
    }
    const resultText = execution.stdout.slice(markerIndex + RESULT_MARKER.length).trim().split('\n')[0];
    const results = JSON.parse(resultText);
    return { status: results.every((result) => result.passed) ? 'passed' : 'failed', results };
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

function javaRunnerMiddleware() {
  return async (request, response, next) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/api/loopin/status' && request.method === 'GET') {
      json(response, 200, { app: 'loopin-coding-trainer' });
      return;
    }
    if (pathname === '/api/java/status' && request.method === 'GET') {
      try { json(response, 200, await checkJdk()); }
      catch { json(response, 200, { available: false, requirement: 'JDK 21+' }); }
      return;
    }
    if (pathname !== '/api/java/run') { next(); return; }
    if (request.method !== 'POST') { json(response, 405, { error: 'POST 요청만 지원합니다.' }); return; }
    if (!isLocalRequest(request)) { json(response, 403, { status: 'error', error: '로컬 Loopin 화면에서만 Java 코드를 실행할 수 있습니다.', results: [] }); return; }
    try {
      json(response, 200, await executeJava(await readBody(request)));
    } catch (error) {
      json(response, 400, { status: 'error', error: error.message || 'Java 코드를 실행하지 못했어요.', results: [] });
    }
  };
}

export function javaRunnerPlugin() {
  const install = (server) => { server.middlewares.use(javaRunnerMiddleware()); };
  return { name: 'loopin-java-runner', configureServer: install, configurePreviewServer: install };
}
