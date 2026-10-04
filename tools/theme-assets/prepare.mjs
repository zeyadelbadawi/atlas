#!/usr/bin/env node
/**
 * Prepares one approved theme photograph for release (Theme 1 plan §E.3
 * steps 5–6). Run from this folder after `npm ci`:
 *
 *   npm run prepare-asset -- --theme modern-education --key home-hero \
 *     --master /path/to/home-hero.png [--version v1] [--out <dir>]
 *
 * What it does, from the manifest entry (the single source of sizes):
 *   - checks the master is at least the manifest's master size and ratio;
 *   - auto-orients, converts to sRGB and strips every metadata block
 *     (sharp writes none unless asked);
 *   - writes AVIF (q 50) and WebP (q 75) at each manifest width to
 *     `<out>/<theme>/<version>/<key>-<width>.<format>`;
 *   - makes the LQIP (24 px wide, blurred WebP, ≤ 300 bytes);
 *   - fails if the ≤ 1200 w AVIF is over the entry's byte budget;
 *   - prints the sha256 of the master and the manifest fields to fill in.
 *
 * It refuses to re-prepare an entry already released at that version and
 * never overwrites a file: released files are immutable (a changed image
 * is a new version).
 *
 * Masters are never committed to the app repo: record the sha256 printed
 * here in the entry's provenance, then store the master with
 * `npm run archive-master` (private bucket, §P.7).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const ASSETS_SRC = join(REPO, 'src/features/website/theme-assets');

const AVIF_QUALITY = 50;
const WEBP_QUALITY = 75;
const LQIP_WIDTH = 24;
const LQIP_MAX_BYTES = 300;

const { values: args } = parseArgs({
  options: {
    theme: { type: 'string' },
    key: { type: 'string' },
    master: { type: 'string' },
    version: { type: 'string', default: 'v1' },
    out: { type: 'string', default: join(REPO, 'public/theme-assets') },
  },
});

function fail(message) {
  console.error(`prepare-asset: ${message}`);
  process.exit(1);
}

if (!args.theme || !args.key || !args.master) {
  fail('--theme, --key and --master are required');
}
if (!/^v[1-9]\d*$/.test(args.version)) fail('--version must look like v1');

const manifestModule = await import(
  join(ASSETS_SRC, 'manifests', `${args.theme}.manifest.ts`)
).catch(() => fail(`no manifest for theme "${args.theme}"`));
const manifest = Object.values(manifestModule).find(
  (value) => value && Array.isArray(value.assets)
);
const entry = manifest?.assets.find((asset) => asset.key === args.key);
if (!entry) fail(`"${args.key}" is not in the ${args.theme} manifest`);

const folder = `${args.theme}/${args.version}`;
// Released files are immutable: an entry already released at this version
// is never re-prepared (a changed image is a new version), and no existing
// file is overwritten below. A new key may join a released folder.
if (entry.status === 'released' && entry.version === args.version) {
  fail(
    `${args.key} ${args.version} is released and immutable; prepare a new version`
  );
}

const masterBuffer = readFileSync(args.master);
const source = sharp(masterBuffer, { failOn: 'error' }).rotate();
const meta = await source.metadata();
// `rotate()` swaps the reported size for EXIF orientations 5–8.
const swapped = (meta.orientation ?? 1) >= 5;
const width = swapped ? meta.height : meta.width;
const height = swapped ? meta.width : meta.height;
const [rw, rh] = entry.ratio.split(':').map(Number);
// Relative, not absolute: the generator's fixed output sizes are close to,
// not exactly, the named ratio (Nano Banana Pro's 16:9 is 5504×3072, 0.8%
// wider; its 21:9 is 6336×2688, 1.0% wider). The cover resize below trims
// that difference evenly, and the master stays the untouched original.
if (Math.abs(width / height / (rw / rh) - 1) > 0.02) {
  fail(`master is ${width}×${height}; ${entry.key} needs ${entry.ratio}`);
}
if (width < entry.master.width) {
  fail(`master is ${width}px wide; ${entry.key} needs ≥ ${entry.master.width}`);
}

const outDir = join(args.out, folder);
mkdirSync(outDir, { recursive: true });

// One resize per pipeline: sharp applies only the LAST `.resize()`, so a
// cover crop to the master size followed by a width-only resize kept the
// source's ratio (v1/v2 derivatives are e.g. 1600×1986 for a 4:5 entry —
// harmless under `object-fit: cover`, and released files are immutable).
// Each derivative is now cropped to the entry's ratio at its own width.
const base = (width) =>
  sharp(masterBuffer, { failOn: 'error' })
    .rotate()
    .toColourspace('srgb')
    .resize({
      width,
      height: Math.round((width * entry.master.height) / entry.master.width),
      fit: 'cover',
    });

const written = [];
for (const targetWidth of entry.widths) {
  for (const format of manifest.formats) {
    const file = join(outDir, `${entry.key}-${targetWidth}.${format}`);
    if (existsSync(file)) fail(`${file} already exists`);
    const pipeline = base(targetWidth);
    const info = await (
      format === 'avif'
        ? pipeline.avif({ quality: AVIF_QUALITY })
        : pipeline.webp({ quality: WEBP_QUALITY })
    ).toFile(file);
    written.push({ file, width: targetWidth, format, bytes: info.size });
  }
}

const budgetWidth =
  [...entry.widths].reverse().find((w) => w <= 1200) ?? entry.widths[0];
const budgetFile = written.find(
  (f) => f.width === budgetWidth && f.format === 'avif'
);
if (budgetFile && budgetFile.bytes > entry.budgetBytes) {
  fail(
    `${budgetFile.file} is ${budgetFile.bytes} bytes; budget is ${entry.budgetBytes}`
  );
}

const lqipBuffer = await base(LQIP_WIDTH)
  .blur(1)
  .webp({ quality: 40 })
  .toBuffer();
if (lqipBuffer.length > LQIP_MAX_BYTES) {
  fail(`LQIP is ${lqipBuffer.length} bytes; limit is ${LQIP_MAX_BYTES}`);
}

const masterSha256 = createHash('sha256').update(masterBuffer).digest('hex');

for (const f of written) {
  console.log(
    `${f.format} ${String(f.width).padStart(4)}w  ${f.bytes} B  ${f.file}`
  );
}
console.log(
  '\nManifest fields for this entry (fill in the rest of provenance):'
);
console.log(
  JSON.stringify(
    {
      status: 'released',
      version: args.version,
      lqip: `data:image/webp;base64,${lqipBuffer.toString('base64')}`,
      provenance: { masterSha256 },
    },
    null,
    2
  )
);
console.log(
  `\nIf "${folder}" is not in released-versions.ts yet, add it in the same commit.`
);
