#!/usr/bin/env node
/**
 * Generates public/og-image.png (1200x630) from the TradeHub horizontal logo SVG.
 * Run: node scripts/generate-og-image.mjs
 */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'tradehub-logo-horizontal.svg');
const outputPath = join(root, 'public', 'og-image.png');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LOGO_MAX_WIDTH = 1000; // Logo width on canvas

async function main() {
  const logoPng = await sharp(svgPath)
    .resize(LOGO_MAX_WIDTH)
    .png()
    .toBuffer();

  const meta = await sharp(logoPng).metadata();
  const logoW = meta.width;
  const logoH = meta.height;
  const left = Math.round((OG_WIDTH - logoW) / 2);
  const top = Math.round((OG_HEIGHT - logoH) / 2);

  await sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: logoPng, left, top }])
    .png()
    .toFile(outputPath);

  console.log(`Generated ${outputPath} (${OG_WIDTH}x${OG_HEIGHT})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
