const ratiosByStage = {
  beginner: { problems: 55, theory: 20, ai: 20, review: 5 },
  intermediate: { problems: 65, theory: 15, ai: 15, review: 5 },
  practical: { problems: 70, theory: 10, ai: 10, review: 10 },
};

export function calculateStudyAllocation(totalMinutes, stage = 'beginner', customRatios) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const ratios = customRatios || ratiosByStage[stage] || ratiosByStage.beginner;
  const keys = ['problems', 'theory', 'ai', 'review'];
  const ratioTotal = keys.reduce((sum, key) => sum + Math.max(0, ratios[key] || 0), 0) || 100;
  const result = {};
  let assigned = 0;
  keys.forEach((key, index) => {
    const value = index === keys.length - 1
      ? minutes - assigned
      : Math.round((minutes * Math.max(0, ratios[key] || 0)) / ratioTotal / 5) * 5;
    result[key] = Math.max(0, value);
    assigned += result[key];
  });
  return result;
}

export function buildStudySessions(allocation, focusMinutes = 50) {
  const labels = { problems: '코딩테스트', theory: '알고리즘 · JavaScript', ai: 'AI · 프론트엔드', review: '오답 복습' };
  const sessions = [];
  for (const key of ['problems', 'theory', 'ai', 'review']) {
    let remaining = allocation[key] || 0;
    while (remaining > 0) {
      const duration = Math.min(focusMinutes, remaining);
      sessions.push({ id: `${key}-${sessions.length}`, type: key, title: labels[key], duration, done: false });
      remaining -= duration;
    }
  }
  return sessions;
}
