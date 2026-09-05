import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { startLocalServer } from '../scripts/startLocalServer.mjs';
import { shellQuote } from '../scripts/installMacApp.mjs';

test('macOS shell assignments preserve special path characters literally', { skip: process.platform === 'win32' }, () => {
  const path = "/tmp/한글 project 'double\" $HOME $(printf changed) `printf changed`\\folder\nline";
  const result = execFileSync('/bin/sh', ['-c', `LOOPIN_TEST_PATH=${shellQuote(path)}\nprintf '%s' "$LOOPIN_TEST_PATH"`], { encoding: 'utf8' });
  assert.equal(result, path);
});

test('local launcher serves the project independently of cwd and binds loopback', async () => {
  const previousCwd = process.cwd();
  let server;
  try {
    process.chdir(tmpdir());
    server = await startLocalServer({ port: 0 });
    const address = server.httpServer.address();
    assert.ok(['127.0.0.1', '::1'].includes(address.address));
    const origin = server.resolvedUrls.local[0];
    const page = await fetch(origin);
    assert.match(await page.text(), /Loopin — 코딩테스트 트레이너/);
    const identity = await fetch(new URL('api/loopin/status', origin));
    assert.deepEqual(await identity.json(), { app: 'loopin-coding-trainer' });
    const status = await fetch(new URL('api/java/status', origin));
    assert.equal(typeof (await status.json()).available, 'boolean');
    const denied = await fetch(new URL('api/java/run', origin), { method: 'POST', headers: { Origin: 'https://unrelated.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(denied.status, 403);
    const malformed = await fetch(new URL('api/java/run', origin), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).status, 'error');
  } finally {
    process.chdir(previousCwd);
    if (server) await server.close();
  }
});

test('preview also installs the local Java runner endpoints', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const previewDir = await mkdtemp(join(tmpdir(), 'loopin-preview-test-'));
  let server;
  try {
    await writeFile(join(previewDir, 'index.html'), '<!doctype html><title>Loopin preview fixture</title>');
    server = await preview({ root, build: { outDir: previewDir }, preview: { host: 'localhost', port: 0, strictPort: true }, logLevel: 'silent' });
    assert.ok(['127.0.0.1', '::1'].includes(server.httpServer.address().address));
    const origin = server.resolvedUrls.local[0];
    assert.match(await (await fetch(origin)).text(), /Loopin preview fixture/);
    assert.deepEqual(await (await fetch(new URL('api/loopin/status', origin))).json(), { app: 'loopin-coding-trainer' });
    assert.equal(typeof (await (await fetch(new URL('api/java/status', origin))).json()).available, 'boolean');
  } finally {
    if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
    await rm(previewDir, { recursive: true, force: true });
  }
});
