import test from 'node:test';
import assert from 'node:assert/strict';
import { navItems, navSections } from '../src/app/navigation.js';

test('모든 메뉴에 고유한 한글 이름이 있고 내 정보와 선택 학습을 구분한다', () => {
  const ids = navItems.map(([id]) => id);
  const labels = navItems.map(([, , label]) => label);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(labels.every(label => /^[가-힣· ]+$/.test(label)));
  assert.ok(labels.includes('내 정보'));
  assert.deepEqual(navSections.find(section => section.label === '선택 학습').ids, ['words']);
  const groupedIds = navSections.flatMap(section => section.ids);
  assert.deepEqual([...groupedIds].sort(), [...ids].sort());
});
