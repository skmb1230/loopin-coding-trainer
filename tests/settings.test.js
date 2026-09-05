import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../src/core/storage/settings.js';

test('이전 설정의 null·NaN·지원하지 않는 언어는 안전한 값으로 복원한다', () => {
  const settings = normalizeSettings({ theme: 'other', editorFontSize: null, focusMinutes: -5, learningLanguage: 'python' }, { learningLanguage: 'java', focusMinutes: 25 });
  assert.deepEqual(settings, { theme: 'light', editorFontSize: 14, focusMinutes: 25, learningLanguage: 'java' });
  assert.equal(normalizeSettings({ focusMinutes: NaN }).focusMinutes, 50);
  assert.equal(normalizeSettings({ focusMinutes: Infinity }).focusMinutes, 50);
  assert.equal(normalizeSettings(null, null).learningLanguage, 'javascript');
});

test('유효한 사용자 설정은 진단 당시 기본값보다 우선한다', () => {
  const saved = { theme: 'dark', editorFontSize: 18, focusMinutes: 90, learningLanguage: 'java' };
  assert.deepEqual(normalizeSettings(saved, { focusMinutes: 25, learningLanguage: 'javascript' }), saved);
});
