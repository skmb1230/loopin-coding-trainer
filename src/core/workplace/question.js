import { localDayKey } from '../dates/localDay.js';

function hash(text) {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 0x01000193);
  }
  // Mix high and low bits before using a seed: similar dates should not expose
  // a predictable relationship between the situation and the answer position.
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

function randomFromSeed(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

/**
 * Select a situation and shuffle its four term-name choices, without mutating
 * the catalog or depending on ambient time/randomness. Persisted day + attempt
 * reproduce the same question after reload. Consecutive attempts cycle through
 * situations; a separately seeded Fisher–Yates shuffle varies answer placement
 * independently, including when the same situation returns on a later retry.
 */
export function createWorkplaceQuestion(term, day, attempts = 0) {
  if (!term || typeof term.id !== 'string' || !term.id || typeof term.term !== 'string' || !term.term.trim() || !Array.isArray(term.questions) || !term.questions.length) {
    throw new TypeError('A workplace term with at least one situation question is required.');
  }
  const localDay = localDayKey(day);
  const attempt = Number.isFinite(Number(attempts)) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(Number(attempts)))) : 0;
  const context = JSON.stringify([term.id, localDay]);
  const variant = (hash(`situation:${context}`) % term.questions.length + attempt % term.questions.length) % term.questions.length;
  const question = term.questions[variant];
  const options = question?.options;
  if (!Array.isArray(options) || options.length !== 4 || options.some(label => typeof label !== 'string' || !label.trim()) || new Set(options.map(label => label.trim())).size !== 4) {
    throw new TypeError('A workplace question must contain exactly four distinct term-name choices.');
  }
  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= options.length || options[question.answerIndex].trim() !== term.term.trim()) {
    throw new TypeError('The correct workplace choice must name the term being learned.');
  }
  if (typeof question.prompt !== 'string' || !question.prompt.trim() || typeof question.explanation !== 'string' || !question.explanation.trim()) {
    throw new TypeError('A workplace situation requires a prompt and an explanation.');
  }
  const choices = options.map((label, index) => ({ label, correct: index === question.answerIndex }));
  const random = randomFromSeed(hash(`choices:${context}:${attempt}`));
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [choices[index], choices[other]] = [choices[other], choices[index]];
  }
  return { prompt: question.prompt, explanation: question.explanation, choices };
}
