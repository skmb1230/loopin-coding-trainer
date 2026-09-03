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
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const baseRatios = customRatios || ratiosByStage[stage] || ratiosByStage.beginner;
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
  for (const key of allocationKeys) {
    let remaining = allocation[key] || 0;
    while (remaining > 0) {
      const duration = Math.min(focusMinutes, remaining);
      const track = key === 'career' ? careerTrack.id : key === 'systems' ? systemsTrack.id : undefined;
      sessions.push({ id: `${key}-${sessions.length}`, type: key, title: labels[key], duration, done: false, track });
      remaining -= duration;
    }
  }
  return sessions;
}
