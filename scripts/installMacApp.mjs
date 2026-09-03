import { chmod, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const userHomeDir = homedir();
const appDir = join(userHomeDir, 'Desktop', 'Loopin.app');
const logDir = join(userHomeDir, 'Library', 'Logs');
const logFile = join(logDir, 'Loopin.log');
const contentsDir = join(appDir, 'Contents');
const macosDir = join(contentsDir, 'MacOS');
const resourcesDir = join(contentsDir, 'Resources');
const sourceIcon = join(projectDir, 'public', 'loopin-icon.png');
const tempDir = await mkdtemp(join(tmpdir(), 'loopin-icon-'));
const iconsetDir = join(tempDir, 'Loopin.iconset');

await rm(appDir, { recursive: true, force: true });
await mkdir(macosDir, { recursive: true });
await mkdir(resourcesDir, { recursive: true });
await mkdir(iconsetDir, { recursive: true });
await mkdir(logDir, { recursive: true });

const sizes = [16, 32, 128, 256, 512];
for (const size of sizes) {
  execFileSync('sips', ['-z', String(size), String(size), sourceIcon, '--out', join(iconsetDir, `icon_${size}x${size}.png`)], { stdio: 'ignore' });
  execFileSync('sips', ['-z', String(size * 2), String(size * 2), sourceIcon, '--out', join(iconsetDir, `icon_${size}x${size}@2x.png`)], { stdio: 'ignore' });
}
execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', join(resourcesDir, 'Loopin.icns')]);
await cp(sourceIcon, join(resourcesDir, 'Loopin.png'));

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Loopin</string>
  <key>CFBundleDisplayName</key><string>Loopin</string>
  <key>CFBundleIdentifier</key><string>com.skmb1230.loopin</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Loopin</string>
  <key>CFBundleIconFile</key><string>Loopin</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSUIElement</key><true/>
</dict></plist>`;

const launcher = `#!/bin/zsh
PROJECT_DIR=${JSON.stringify(projectDir)}
LOOPIN_URL="http://localhost:5173"
LOOPIN_LOG=${JSON.stringify(logFile)}
export PATH=${JSON.stringify(process.env.PATH)}

if /usr/bin/curl -fsS "$LOOPIN_URL" >/dev/null 2>&1; then
  /usr/bin/open "$LOOPIN_URL"
  exit 0
fi

cd "$PROJECT_DIR" || exit 1
if [[ ! -d node_modules ]]; then
  /usr/bin/osascript -e 'display notification "처음 실행 준비를 시작합니다." with title "Loopin"'
  /usr/bin/env npm install >>"$LOOPIN_LOG" 2>&1 || exit 1
fi

/usr/bin/nohup /usr/bin/env npm run dev -- --host localhost --port 5173 --strictPort >>"$LOOPIN_LOG" 2>&1 </dev/null &
for attempt in {1..60}; do
  if /usr/bin/curl -fsS "$LOOPIN_URL" >/dev/null 2>&1; then
    /usr/bin/open "$LOOPIN_URL"
    exit 0
  fi
  /bin/sleep 0.25
done

/usr/bin/osascript -e 'display alert "Loopin을 시작하지 못했어요" message "~/Library/Logs/Loopin.log를 확인해주세요."'
exit 1
`;

await writeFile(join(contentsDir, 'Info.plist'), plist);
await writeFile(join(macosDir, 'Loopin'), launcher);
await chmod(join(macosDir, 'Loopin'), 0o755);
await rm(tempDir, { recursive: true, force: true });
console.log(`✓ ${appDir} 설치 완료`);
