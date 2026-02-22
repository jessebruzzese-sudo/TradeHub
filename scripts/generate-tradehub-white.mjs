#!/usr/bin/env node
/**
 * Generates public/tradehub-white.png from the TradeHub horizontal white logo SVG.
 * Run: node scripts/generate-tradehub-white.mjs
 */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'tradehub-logo-white.svg');
const outputPath = join(root, 'public', 'tradehub-white.png');

const WIDTH = 480;

async function main() {
  const meta = await sharp(svgPath).metadata();
  const height = Math.round((meta.height / meta.width) * WIDTH);
  await sharp(svgPath)
    .resize(WIDTH, height)
    .png()
    .toFile(outputPath);
  console.log(`Generated ${outputPath} (${WIDTH}x${height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
