import { mkdir, writeFile } from 'node:fs/promises';
import level0Problems from '../src/data/problems/level0/index.js';
import level1Problems from '../src/data/problems/level1/index.js';
import level2Problems from '../src/data/problems/level2/index.js';
import level3Problems from '../src/data/problems/level3/index.js';
import level4Problems from '../src/data/problems/level4/index.js';
import level5Problems from '../src/data/problems/level5/index.js';
import { generatedTemplateCounts, problemTargets } from '../src/data/problems/generated/problemTemplates.js';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const seed = Number(process.argv[2] || 10482);
const random = seededRandom(seed);
const targets = problemTargets;
const problemLevels = [level0Problems, level1Problems, level2Problems, level3Problems, level4Problems, level5Problems];
const generatedAt = new Date(0).toISOString();
const manifest = {
  schemaVersion: 1,
  seed,
  generatedAt,
  strategy: 'validated-template-and-parameter-variants',
  targetCount: Object.values(targets).reduce((sum, value) => sum + value, 0),
  levels: Object.entries(targets).map(([level, target]) => ({
    level: Number(level),
    target,
    implemented: problemLevels[Number(level)].length,
    generatedTemplates: generatedTemplateCounts[level],
  })),
  templateOrder: shuffled(problemLevels.flat().map((problem) => ({ id: problem.id, category: problem.category, seed: problem.testGenerator.seed })), random),
};

const targetDirectory = new URL('../src/data/problems/generated/', import.meta.url);
await mkdir(targetDirectory, { recursive: true });
await writeFile(new URL('manifest.json', targetDirectory), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ seed ${seed}로 문제 생성 manifest를 만들었습니다.`);
console.log(`✓ Level 0~5에 총 ${problemLevels.flat().length}개 문제가 등록되었습니다.`);
console.log('✓ 같은 seed는 항상 같은 template order를 만듭니다.');
