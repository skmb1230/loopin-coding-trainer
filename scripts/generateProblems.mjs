import { mkdir, writeFile } from 'node:fs/promises';
import level0Problems from '../src/data/problems/level0/index.js';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

const seed = Number(process.argv[2] || 10482);
const random = seededRandom(seed);
const targets = { 0: 200, 1: 220, 2: 180, 3: 120, 4: 60, 5: 20 };
const generatedAt = new Date(0).toISOString();
const manifest = {
  schemaVersion: 1,
  seed,
  generatedAt,
  strategy: 'validated-template-and-parameter-variants',
  targetCount: Object.values(targets).reduce((sum, value) => sum + value, 0),
  levels: Object.entries(targets).map(([level, target]) => ({ level: Number(level), target, implemented: level === '0' ? level0Problems.length : 0 })),
  templateOrder: [...level0Problems].sort(() => random() - 0.5).map((problem) => ({ id: problem.id, category: problem.category, seed: problem.testGenerator.seed })),
};

const targetDirectory = new URL('../src/data/problems/generated/', import.meta.url);
await mkdir(targetDirectory, { recursive: true });
await writeFile(new URL('manifest.json', targetDirectory), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ seed ${seed}로 문제 생성 manifest를 만들었습니다.`);
console.log('✓ 같은 seed는 항상 같은 template order를 만듭니다.');
