const ratiosByStage = {
  beginner: { problems: 55, theory: 15, ai: 10, systems: 10, career: 5, review: 5 },
  intermediate: { problems: 65, theory: 10, ai: 5, systems: 10, career: 5, review: 5 },
  practical: { problems: 70, theory: 5, ai: 5, systems: 5, career: 5, review: 10 },
};

const allocationKeys = ['problems', 'theory', 'ai', 'systems', 'career', 'review'];
const remainderPriority = ['review', 'problems', 'systems', 'theory', 'ai', 'career'];

export function getCareerTrackForDate(date = new Date()) {
  const localDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  const rotationIndex = ((localDay % 2) + 2) % 2;
  return rotationIndex === 1
    ? { id: 'aws', label: 'AWS', sessionTitle: 'AWS · 클라우드 면접 기초' }
    : { id: 'git', label: 'Git', sessionTitle: 'Git · 협업과 버전 관리' };
}

export function getSystemsTrackForDate(date = new Date()) {
  const localDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  const rotationIndex = ((localDay % 2) + 2) % 2;
  return rotationIndex === 1
    ? { id: 'mail', label: 'SMTP · IMAP', sessionTitle: '메일 · SMTP/IMAP 전송 흐름' }
    : { id: 'security', label: 'Web Security', sessionTitle: '보안 · 웹 공격과 방어' };
}

export function calculateStudyAllocation(totalMinutes, stage = 'beginner', customRatios) {
  const inputMinutes = Number(totalMinutes);
  const minutes = Number.isFinite(inputMinutes) ? Math.min(1440, Math.max(0, Math.round(inputMinutes))) : 0;
  const requestedRatios = customRatios || ratiosByStage[stage] || ratiosByStage.beginner;
  const sanitizedRatios = Object.fromEntries(allocationKeys.map(key => [key, Number.isFinite(Number(requestedRatios[key])) ? Math.min(1_000_000, Math.max(0, Number(requestedRatios[key]))) : 0]));
  const baseRatios = allocationKeys.some(key => sanitizedRatios[key] > 0) ? sanitizedRatios : ratiosByStage[stage] || ratiosByStage.beginner;
  const ratios = minutes < 120 && (baseRatios.career || 0) > 0
    ? { ...baseRatios, systems: (baseRatios.systems || 0) + baseRatios.career, career: 0 }
    : baseRatios;
  const ratioTotal = allocationKeys.reduce((sum, key) => sum + Math.max(0, ratios[key] || 0), 0) || 100;
  const fiveMinuteUnits = Math.floor(minutes / 5);
  const shares = allocationKeys.map((key) => {
    const exact = (fiveMinuteUnits * Math.max(0, ratios[key] || 0)) / ratioTotal;
    return { key, units: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remainingUnits = fiveMinuteUnits - shares.reduce((sum, item) => sum + item.units, 0);
  const ranked = [...shares].sort((left, right) => right.remainder - left.remainder || remainderPriority.indexOf(left.key) - remainderPriority.indexOf(right.key));

  for (let index = 0; remainingUnits > 0; index += 1, remainingUnits -= 1) {
    ranked[index % ranked.length].units += 1;
  }

  const result = Object.fromEntries(shares.map(({ key, units }) => [key, units * 5]));
  result.problems += minutes % 5;
  return result;
}

export function buildStudySessions(allocation, focusMinutes = 50, date = new Date(), languageLabel = 'JavaScript') {
  const careerTrack = getCareerTrackForDate(date);
  const systemsTrack = getSystemsTrackForDate(date);
  const labels = { problems: '코딩테스트', theory: `알고리즘 · ${languageLabel}`, ai: 'AI · 프론트엔드', systems: systemsTrack.sessionTitle, career: careerTrack.sessionTitle, review: '오답 복습' };
  const sessions = [];
  const requestedFocus = Number(focusMinutes);
  const focus = Number.isFinite(requestedFocus) && requestedFocus > 0 ? Math.min(1440, Math.max(1, Math.round(requestedFocus))) : 50;
  for (const key of allocationKeys) {
    const requestedMinutes = Number(allocation?.[key]);
    let remaining = Number.isFinite(requestedMinutes) ? Math.min(1440, Math.max(0, Math.round(requestedMinutes))) : 0;
    let typeIndex = 0;
    while (remaining > 0) {
      const duration = Math.min(focus, remaining);
      const track = key === 'career' ? careerTrack.id : key === 'systems' ? systemsTrack.id : undefined;
      sessions.push({ id: `${key}-${typeIndex}-${duration}`, type: key, title: labels[key], duration, done: false, track });
      typeIndex += 1;
      remaining -= duration;
    }
  }
  return sessions;
}

/**
 * Resolve completed IDs against the saved plan, never the newly edited plan.
 * Version 1 used global indices, version 2 type-local indices, and version 3
 * includes duration so changing a 25-minute session cannot complete 50 minutes.
 */
export function migrateCompletedStudySessions(completedIds, allocation, focusMinutes = 50, date = new Date(), languageLabel = 'JavaScript', version = 1) {
  if (![1, 2, 3].includes(version)) return [];
  const oldToNew = new Map(buildStudySessions(allocation, focusMinutes, date, languageLabel).map((session, index) => {
    const oldId = version === 1 ? `${session.type}-${index}` : version === 2 ? session.id.slice(0, session.id.lastIndexOf('-')) : session.id;
    return [oldId, session.id];
  }));
  return [...new Set((Array.isArray(completedIds) ? completedIds : []).filter(id => oldToNew.has(id)).map(id => oldToNew.get(id)))];
}
