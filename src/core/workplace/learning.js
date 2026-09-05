/**
 * Language-independent, immutable vocabulary learning state.
 *
 * Persist the entire return value with the app's normal local storage helper.
 * Every date-dependent function accepts `now` explicitly: a Date, timestamp,
 * ISO date-time, or local YYYY-MM-DD. An empty category list means all categories.
 *
 * State: { version, preferences: { count, categories, termIds },
 *   session: { day, termIds, answers, seenTermIds }, terms: { [id]: progress } }
 * An answer's `correct` means today's unassisted quiz is complete. `firstCorrect`,
 * `hadError`, and `assisted` retain the original learning evidence after retries.
 * Reading never advances mastery; a first error or assisted attempt keeps the
 * next review tomorrow, even when a later same-day retry is correct.
 */

export const WORKPLACE_CATEGORIES = ['computer', 'business', 'product', 'sales', 'workplace'];
export const WORKPLACE_REVIEW_INTERVALS = [1, 3, 7, 14];
const MAX_COUNT = 20;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value);
const integer = (value, fallback = 0, min = 0, max = 1_000_000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
const ids = values => [...new Set((Array.isArray(values) ? values : []).filter(safeId))];
const categories = values => [...new Set((Array.isArray(values) ? values : []).filter(value => WORKPLACE_CATEGORIES.includes(value)))];
const same = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

import { localDayKey, addLocalDays, parseLocalDay as dateFromDay } from '../dates/localDay.js';
export { localDayKey, addLocalDays } from '../dates/localDay.js';
const validDay = day => dateFromDay(day) ? day : null;

function emptyProgress() {
  return {
    seenCount: 0, firstSeenDay: null, lastSeenDay: null, learned: false,
    reviewStage: 0, nextReviewDay: null, lastReviewedDay: null,
    totalAttempts: 0, correctAttempts: 0,
    firstCorrectOnLastDay: false, hadErrorOnLastDay: false, assistedOnLastDay: false,
  };
}

function normalizeProgress(value) {
  const raw = object(value);
  const reviewStage = integer(raw.reviewStage, 0, 0, WORKPLACE_REVIEW_INTERVALS.length);
  const totalAttempts = integer(raw.totalAttempts);
  return {
    seenCount: integer(raw.seenCount),
    firstSeenDay: validDay(raw.firstSeenDay), lastSeenDay: validDay(raw.lastSeenDay),
    learned: raw.learned === true && reviewStage > 0,
    reviewStage, nextReviewDay: validDay(raw.nextReviewDay), lastReviewedDay: validDay(raw.lastReviewedDay),
    totalAttempts, correctAttempts: integer(raw.correctAttempts, 0, 0, totalAttempts),
    firstCorrectOnLastDay: raw.firstCorrectOnLastDay === true,
    hadErrorOnLastDay: raw.hadErrorOnLastDay === true,
    assistedOnLastDay: raw.assistedOnLastDay === true,
  };
}

export function createWorkplaceState() {
  return {
    version: 1,
    preferences: { count: 5, categories: [], termIds: [] },
    session: { day: null, termIds: [], answers: {}, seenTermIds: [] },
    terms: {},
  };
}

function normalizeCatalog(terms) {
  const seen = new Set();
  return (Array.isArray(terms) ? terms : []).filter(term => {
    if (!term || !safeId(term.id) || !WORKPLACE_CATEGORIES.includes(term.category) || seen.has(term.id)) return false;
    seen.add(term.id);
    return true;
  });
}

/** Recover safe fields from old/corrupt backups. Pass the catalog to drop removed IDs. */
export function normalizeWorkplaceState(value, terms) {
  const raw = object(value);
  const preference = object(raw.preferences);
  const session = object(raw.session);
  const known = terms === undefined ? null : new Set(normalizeCatalog(terms).map(term => term.id));
  const allowed = id => !known || known.has(id);
  const termIds = ids(session.termIds).filter(allowed);
  const sessionIds = new Set(termIds);
  const answers = Object.fromEntries(Object.entries(object(session.answers)).flatMap(([id, answer]) => {
    if (!sessionIds.has(id)) return [];
    const item = object(answer);
    const attempts = integer(item.attempts);
    if (!attempts) return [];
    return [[id, {
      attempts, correct: item.correct === true, firstCorrect: item.firstCorrect === true,
      assisted: item.assisted === true, hadError: item.hadError === true || item.assisted === true || item.firstCorrect !== true,
    }]];
  }));
  const progress = Object.fromEntries(Object.entries(object(raw.terms)).filter(([id]) => safeId(id) && allowed(id)).map(([id, item]) => [id, normalizeProgress(item)]));
  const day = validDay(session.day);
  return {
    version: 1,
    preferences: { count: integer(preference.count, 5, 1, MAX_COUNT), categories: categories(preference.categories), termIds: ids(preference.termIds).filter(allowed) },
    session: day ? { day, termIds, answers, seenTermIds: ids(session.seenTermIds).filter(id => sessionIds.has(id)) } : { day: null, termIds: [], answers: {}, seenTermIds: [] },
    terms: progress,
  };
}

function priority(term, progress, day) {
  const item = progress[term.id];
  if (item?.nextReviewDay && item.nextReviewDay <= day) return item.hadErrorOnLastDay || !item.learned ? 0 : 1;
  if (!item || (!item.seenCount && !item.firstSeenDay && !item.totalAttempts)) return 2;
  return item.learned ? 4 : 3;
}

/**
 * Start/resume a stable daily queue. Explicit termIds are today's choices only.
 * Reconfiguration retains every already-seen/answered term and its answers;
 * Explicit choices are also retained, so adding choices or reducing the count
 * may keep more terms than the target to avoid erasing work or dropping a pick.
 * Untouched choices retain their order unless preferences change.
 */
export function createDailySession(value, terms, options = {}, now) {
  const catalog = normalizeCatalog(terms);
  const state = normalizeWorkplaceState(value, catalog);
  const day = localDayKey(now);
  const settings = object(options);
  const isCurrentDay = state.session.day === day;
  const count = own(settings, 'count') ? integer(settings.count, 5, 1, MAX_COUNT) : state.preferences.count;
  const selectedCategories = own(settings, 'categories') ? categories(settings.categories) : state.preferences.categories;
  const eligible = catalog.filter(term => !selectedCategories.length || selectedCategories.includes(term.category));
  const eligibleIds = new Set(eligible.map(term => term.id));
  const manual = (own(settings, 'termIds') ? ids(settings.termIds) : isCurrentDay ? state.preferences.termIds : []).filter(id => eligibleIds.has(id));
  const preferences = { count, categories: selectedCategories, termIds: manual };
  const unchanged = isCurrentDay && count === state.preferences.count && same(selectedCategories, state.preferences.categories) && same(manual, state.preferences.termIds);
  if (unchanged && manual.every(id => state.session.termIds.includes(id)) && state.session.termIds.length >= Math.min(count, eligible.length)) return { ...state, preferences };

  const retained = isCurrentDay ? state.session.termIds.filter(id => state.session.answers[id]?.attempts || state.session.seenTermIds.includes(id)) : [];
  const previous = isCurrentDay ? state.session.termIds.filter(id => eligibleIds.has(id)) : [];
  const categoryOrder = selectedCategories.length ? selectedCategories : WORKPLACE_CATEGORIES;
  const bucketCounts = new Map();
  const ranked = eligible.map((term, index) => {
    const rank = priority(term, state.terms, day);
    const due = state.terms[term.id]?.nextReviewDay || '9999-12-31';
    const bucket = `${rank}:${due}:${term.category}`;
    const categoryRound = bucketCounts.get(bucket) || 0;
    bucketCounts.set(bucket, categoryRound + 1);
    return { term, index, rank, due, categoryRound, categoryIndex: categoryOrder.indexOf(term.category) };
  }).sort((left, right) => {
    // Preserve error/due priority; ties cycle through fields rather than letting
    // the catalog's first category consume every place in a small daily plan.
    return left.rank - right.rank || left.due.localeCompare(right.due) || left.categoryRound - right.categoryRound || left.categoryIndex - right.categoryIndex || left.index - right.index;
  }).map(({ term }) => term.id);
  const mandatory = [...new Set([...retained, ...manual])];
  const termIds = [...new Set([...mandatory, ...previous, ...ranked])].slice(0, Math.max(count, mandatory.length));
  return {
    ...state, preferences,
    session: { day, termIds, answers: isCurrentDay ? state.session.answers : {}, seenTermIds: isCurrentDay ? state.session.seenTermIds : [] },
  };
}

/** Record a viewed explanation without awarding correctness or advancing reviews. */
export function markWorkplaceTermSeen(value, termId, now) {
  const state = normalizeWorkplaceState(value);
  const day = localDayKey(now);
  if (state.session.day !== day || !state.session.termIds.includes(termId)) return state;
  const previous = state.terms[termId] || emptyProgress();
  const progress = {
    ...previous,
    seenCount: previous.seenCount + (previous.lastSeenDay === day ? 0 : 1),
    firstSeenDay: previous.firstSeenDay || day, lastSeenDay: day,
  };
  return {
    ...state, terms: { ...state.terms, [termId]: progress },
    session: { ...state.session, seenTermIds: [...new Set([...state.session.seenTermIds, termId])] },
  };
}

/**
 * Grade one attempt. Revealing meaning/answer uses { correct: false, assisted: true }.
 * A completed term cannot be repeatedly submitted to farm mastery that day.
 * Stale (yesterday's) sessions cannot receive today's answers: start a session first.
 */
export function recordWorkplaceAnswer(value, termId, result, now) {
  const state = normalizeWorkplaceState(value);
  const day = localDayKey(now);
  if (state.session.day !== day || !state.session.termIds.includes(termId) || state.session.answers[termId]?.correct) return state;
  const previousAnswer = state.session.answers[termId];
  const seen = markWorkplaceTermSeen(state, termId, now);
  const previous = seen.terms[termId];
  const input = object(result);
  const assisted = input.assisted === true;
  const correct = input.correct === true && !assisted;
  const alreadyReviewedToday = previous.lastReviewedDay === day;
  const firstCorrect = previousAnswer ? previousAnswer.firstCorrect : alreadyReviewedToday ? previous.firstCorrectOnLastDay : correct;
  const hadError = Boolean(previousAnswer?.hadError || (alreadyReviewedToday && previous.hadErrorOnLastDay) || !correct);
  const usedAssistance = Boolean(previousAnswer?.assisted || (alreadyReviewedToday && previous.assistedOnLastDay) || assisted);
  let reviewStage = previous.reviewStage;
  let nextReviewDay = previous.nextReviewDay;
  let learned = previous.learned;
  if (hadError || usedAssistance) {
    reviewStage = 0;
    nextReviewDay = addLocalDays(day, 1);
    learned = false;
  } else if (!alreadyReviewedToday && correct) {
    reviewStage = Math.min(WORKPLACE_REVIEW_INTERVALS.length, previous.reviewStage + 1);
    nextReviewDay = addLocalDays(day, WORKPLACE_REVIEW_INTERVALS[reviewStage - 1]);
    learned = true;
  }
  return {
    ...seen,
    terms: {
      ...seen.terms,
      [termId]: {
        ...previous, learned, reviewStage, nextReviewDay, lastReviewedDay: day,
        totalAttempts: previous.totalAttempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        firstCorrectOnLastDay: firstCorrect, hadErrorOnLastDay: hadError, assistedOnLastDay: usedAssistance,
      },
    },
    session: {
      ...seen.session,
      answers: { ...seen.session.answers, [termId]: { attempts: (previousAnswer?.attempts || 0) + 1, correct, firstCorrect, assisted: usedAssistance, hadError } },
    },
  };
}

/** UI-ready daily counters plus all-time distinct seen/learned/due term counts. */
export function getWorkplaceSummary(value, terms, now) {
  const state = normalizeWorkplaceState(value, terms);
  const currentDay = localDayKey(now);
  const isCurrentDay = state.session.day === currentDay;
  const termIds = isCurrentDay ? state.session.termIds : [];
  const answers = termIds.map(id => state.session.answers[id]).filter(Boolean);
  const completedCount = answers.filter(answer => answer.correct).length;
  const progress = Object.values(state.terms);
  return {
    day: state.session.day, currentDay, isCurrentDay,
    selectedCount: termIds.length,
    answeredCount: answers.length,
    completedCount,
    remainingCount: termIds.length - completedCount,
    firstCorrectCount: answers.filter(answer => answer.firstCorrect).length,
    retryCount: answers.filter(answer => !answer.correct).length,
    missedCount: answers.filter(answer => answer.hadError).length,
    assistedCount: answers.filter(answer => answer.assisted).length,
    learnedCount: progress.filter(item => item.learned).length,
    seenCount: progress.filter(item => item.seenCount > 0 || item.firstSeenDay || item.totalAttempts > 0).length,
    dueCount: progress.filter(item => item.nextReviewDay && item.nextReviewDay <= currentDay).length,
    complete: termIds.length > 0 && completedCount === termIds.length,
  };
}
