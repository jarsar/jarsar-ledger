// Generates the app icons from the 7c pace mark (design option 1a).
// Run: npm run icons   — outputs are committed, so CI never needs sharp.
//
// Ratios are taken from the 110px master in the design document:
//   tile           110      side padding 20     → 18.2% each side
//   bar height      10                          → 9.1%
//   gap between     17                          → 15.5%
//   fills           68% / 34% of the track
//   amber tick     4.5 wide at x 38%, overshooting each bar by 8 → 7.3%

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const S = 1024; // master raster size

const pad = 0.182 * S;
const barH = 0.091 * S;
const gap = 0.155 * S;
const trackW = S - pad * 2;
const totalH = barH * 2 + gap;
const top = (S - totalH) / 2;
const tickW = 0.041 * S;
const tickOver = 0.073 * S;
const r = barH / 2;

const bar = (y, fill) => `
    <rect x="${pad}" y="${y}" width="${trackW}" height="${barH}" rx="${r}" fill="#FFFFFF" fill-opacity="0.25"/>
    <rect x="${pad}" y="${y}" width="${trackW * fill}" height="${barH}" rx="${r}" fill="#FFFFFF"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="room" x1="0" y1="0" x2="0.62" y2="1">
      <stop offset="0" stop-color="#1D3B42"/>
      <stop offset="1" stop-color="#2E5A63"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#room)"/>
  ${bar(top, 0.68)}
  ${bar(top + barH + gap, 0.34)}
  <rect x="${pad + trackW * 0.38 - tickW / 2}" y="${top - tickOver}" width="${tickW}"
        height="${totalH + tickOver * 2}" rx="${tickW / 2}" fill="#E8B84B"/>
</svg>`;

await mkdir(OUT, { recursive: true });

const targets = [
  ['icon-512.png', 512],
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT, name));
  console.log(`wrote ${name} (${size}px)`);
}
