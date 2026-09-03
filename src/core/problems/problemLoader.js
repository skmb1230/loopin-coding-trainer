const loaders = {
  0: () => import('../../data/problems/level0/index.js').then((module) => module.default),
  1: () => import('../../data/problems/level1/index.js').then((module) => module.default),
  2: () => import('../../data/problems/level2/index.js').then((module) => module.default),
  3: () => import('../../data/problems/level3/index.js').then((module) => module.default),
  4: () => import('../../data/problems/level4/index.js').then((module) => module.default),
  5: () => import('../../data/problems/level5/index.js').then((module) => module.default),
};

const cache = new Map();

export async function loadProblemsByLevel(level) {
  const normalized = Number(level);
  if (!loaders[normalized]) throw new Error(`지원하지 않는 레벨입니다: ${level}`);
  if (!cache.has(normalized)) cache.set(normalized, loaders[normalized]());
  return cache.get(normalized);
}

export async function loadProblem(id) {
  const level = Number(id.slice(2, 3)) || 0;
  const problems = await loadProblemsByLevel(level);
  return problems.find((problem) => problem.id === id) || null;
}

export async function loadProblemsByLevels(levels) {
  const normalized = [...new Set(levels.map(Number))].filter((level) => loaders[level]);
  return (await Promise.all(normalized.map(loadProblemsByLevel))).flat();
}

export function clearProblemCache() {
  cache.clear();
}
