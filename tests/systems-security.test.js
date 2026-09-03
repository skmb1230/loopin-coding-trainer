import test from 'node:test';
import assert from 'node:assert/strict';
import { systemsSecurityTopics } from '../src/data/systemsSecurityContent.js';
import { glossaryEntries } from '../src/data/glossary.js';
import { findGlossaryParts } from '../src/core/glossary/findGlossaryParts.js';

test('메일·네트워크·보안 커리큘럼은 24개 주제와 고유 ID를 가진다', () => {
  assert.equal(systemsSecurityTopics.length, 24);
  assert.equal(new Set(systemsSecurityTopics.map((topic) => topic.id)).size, 24);
  for (const topic of systemsSecurityTopics) {
    for (const field of ['area', 'level', 'title', 'question', 'hint', 'answer']) assert.ok(topic[field], `${topic.id}.${field}`);
    assert.ok(topic.minutes >= 15);
  }
});

test('메일 전송부터 주요 웹 보안과 사고 대응까지 학습 범위를 포함한다', () => {
  const ids = new Set(systemsSecurityTopics.map((topic) => topic.id));
  for (const id of ['mail-delivery-flow', 'smtp-ports-tls', 'imap-pop-sync', 'spf-dkim-dmarc', 'same-origin-cors', 'xss-defense', 'csrf-cookies', 'authn-authz-idor', 'oauth-oidc-pkce', 'sql-injection', 'secrets-supply-chain', 'security-incident-response']) {
    assert.ok(ids.has(id), id);
  }
});

test('SMTP·IMAP과 보안 핵심 용어는 돋보기 설명으로 분리된다', () => {
  const text = 'SMTP와 IMAP, SPF, DKIM, DMARC, CORS, XSS, CSRF, OAuth 2.0, OIDC, PKCE를 점검한다.';
  const terms = findGlossaryParts(text, glossaryEntries).filter((part) => part.type === 'term').map((part) => part.entry.label);

  for (const label of ['SMTP', 'IMAP', 'SPF', 'DKIM', 'DMARC', 'CORS', 'XSS', 'CSRF', 'OAuth 2.0', 'OpenID Connect', 'PKCE']) assert.ok(terms.includes(label), label);
});
