// assets/og-image.svg → assets/og-image.png 변환 (1200x630)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG = path.resolve(__dirname, '..', 'assets', 'og-image.svg');
const PNG = path.resolve(__dirname, '..', 'assets', 'og-image.png');

(async () => {
  if (!fs.existsSync(SVG)) {
    console.error('SVG 없음:', SVG);
    process.exit(1);
  }
  const svgBuffer = fs.readFileSync(SVG);
  await sharp(svgBuffer, { density: 200 })
    .resize(1200, 630, { fit: 'fill' })
    .png({ quality: 92 })
    .toFile(PNG);
  const stat = fs.statSync(PNG);
  console.log(`✓ ${PNG} 생성 (${(stat.size/1024).toFixed(1)} KB)`);
})();
