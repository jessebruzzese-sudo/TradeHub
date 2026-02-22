#!/usr/bin/env node
/**
 * Generates public/tradehub-watermark.png (1200x1200) from the TradeHub mark SVG.
 * Run: node scripts/generate-watermark.mjs
 */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'tradehub-mark.svg');
const outputPath = join(root, 'public', 'tradehub-watermark.png');

const SIZE = 1200;

async function main() {
  await sharp(svgPath)
    .resize(SIZE, SIZE)
    .png()
    .toFile(outputPath);
  console.log(`Generated ${outputPath} (${SIZE}x${SIZE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
