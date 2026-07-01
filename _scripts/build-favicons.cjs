// assets/logo.svg → 다양한 사이즈 favicon/icon PNG 일괄 생성
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, 'assets', 'logo.svg');

const targets = [
  { name: 'favicon-16x16.png',         size: 16 },
  { name: 'favicon-32x32.png',         size: 32 },
  { name: 'favicon-48x48.png',         size: 48 },
  { name: 'apple-touch-icon.png',      size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error('logo.svg 없음:', SRC);
    process.exit(1);
  }
  const svg = fs.readFileSync(SRC);
  for (const t of targets) {
    const out = path.resolve(ROOT, t.name);
    await sharp(svg, { density: 384 })
      .resize(t.size, t.size, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
      .png()
      .toFile(out);
    console.log(`✓ ${t.name} (${t.size}x${t.size})`);
  }

  // favicon.ico (32x32 PNG로 대체 — 모던 브라우저 모두 PNG 인식)
  // sharp가 .ico 출력 미지원이라 32x32 PNG를 favicon.ico로 복사
  const ico = path.resolve(ROOT, 'favicon.ico');
  await sharp(svg, { density: 384 })
    .resize(32, 32, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .png()
    .toFile(ico);
  console.log(`✓ favicon.ico (PNG, 32x32)`);

  console.log('\n━━━ 완료 ━━━');
})();
