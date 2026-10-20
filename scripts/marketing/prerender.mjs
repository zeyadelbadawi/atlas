#!/usr/bin/env node
/**
 * Writes the static marketing site into `dist/marketing/` (B1 / M1a, DL-50).
 * Runs last in `pnpm build`, after the app build, the marketing client build
 * and the prerender bundle build (vite.marketing.config.ts).
 *
 *   1. the plans catalog: GET $MARKETING_PLANS_URL (default the production
 *      API). A failed fetch FAILS the build, unless
 *      MARKETING_PLANS_ALLOW_SNAPSHOT=1 (local work / tests only), which
 *      uses src/marketing/data/plans.snapshot.json with a loud warning;
 *   2. the client build's manifest → the hashed CSS/JS and the two
 *      above-the-fold font files per language;
 *   3. the theme script, written as a hashed file under dist/assets/;
 *   4. every page of MARKETING_PAGES + sitemap index and locale sitemaps,
 *      robots.txt, llms.txt, llms-full.txt and pricing.md.
 *
 * Env: VITE_SITE_URL (origin, default https://atlass.dpdns.org),
 * MARKETING_PLANS_URL, MARKETING_PLANS_TIMEOUT_MS,
 * MARKETING_PLANS_ALLOW_SNAPSHOT, MARKETING_BUILD_DATE (YYYY-MM-DD).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dist');
const OUT = join(DIST, 'marketing');
const SSR_DIR = join(ROOT, 'dist-marketing-ssr');
const MANIFEST = join(DIST, '.vite', 'marketing-manifest.json');
const CLIENT_ENTRY = 'src/marketing/client/main.ts';
const SNAPSHOT = join(ROOT, 'src/marketing/data/plans.snapshot.json');

/** Above-the-fold faces (Readex Pro headings, Rubik body), per language: at most 2 (SPEC §F.1). */
const FONT_PRELOADS = {
  en: ['readex-pro-latin', 'rubik-latin'],
  ar: ['readex-pro-arabic', 'rubik-arabic'],
};

const log = (message) => console.log(`[marketing] ${message}`);
const warn = (message) => console.warn(`[marketing] WARNING: ${message}`);
function fail(message) {
  console.error(`[marketing] ERROR: ${message}`);
  process.exit(1);
}

function readClientAssets() {
  if (!existsSync(MANIFEST))
    fail(`${MANIFEST} is missing — run the marketing client build first`);
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const entry = manifest[CLIENT_ENTRY];
  if (!entry?.isEntry) fail(`${CLIENT_ENTRY} is not an entry of ${MANIFEST}`);

  const stylesheets = new Set(entry.css ?? []);
  const preloads = new Set();
  const seen = new Set();
  const walk = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    for (const css of chunk.css ?? []) stylesheets.add(css);
    for (const imported of chunk.imports ?? []) {
      if (manifest[imported]?.file) preloads.add(manifest[imported].file);
      walk(imported);
    }
  };
  walk(CLIENT_ENTRY);
  if (stylesheets.size === 0) warn(`${CLIENT_ENTRY} imports no stylesheet`);

  // Fonts: the hashed URLs the stylesheet itself references.
  const cssText = [...stylesheets]
    .map((file) => readFileSync(join(DIST, file), 'utf8'))
    .join('\n');
  const fontUrls = [
    ...cssText.matchAll(/url\((?:["']?)(\/assets\/[^)"']+\.woff2)(?:["']?)\)/g),
  ].map((m) => m[1]);
  const fontPreloads = {};
  for (const [lang, names] of Object.entries(FONT_PRELOADS)) {
    fontPreloads[lang] = names
      .map((name) =>
        fontUrls.find((url) =>
          new RegExp(`/${name}-[\\w-]{8}\\.woff2$`).test(url)
        )
      )
      .filter(Boolean);
    if (fontPreloads[lang].length !== names.length) {
      warn(
        `${lang}: not every above-the-fold font is in the stylesheet (${names.join(', ')})`
      );
    }
  }
  return {
    stylesheets: [...stylesheets].map((file) => `/${file}`),
    moduleScripts: [`/${entry.file}`],
    modulePreloads: [...preloads].map((file) => `/${file}`),
    fontPreloads,
  };
}

function today() {
  const fixed = process.env.MARKETING_BUILD_DATE;
  if (fixed) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fixed))
      fail(`MARKETING_BUILD_DATE must be YYYY-MM-DD, got ${fixed}`);
    return fixed;
  }
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const entryFile = join(SSR_DIR, 'entry.js');
  if (!existsSync(entryFile))
    fail(`${entryFile} is missing — run the prerender bundle build first`);
  const site = await import(pathToFileURL(entryFile).href);

  const siteUrl = (
    process.env.VITE_SITE_URL || 'https://atlass.dpdns.org'
  ).replace(/\/+$/, '');
  const buildDate = today();

  // 1. Catalog.
  const allowSnapshot = site.snapshotAllowed(
    process.env.MARKETING_PLANS_ALLOW_SNAPSHOT
  );
  let loaded;
  try {
    loaded = await site.loadPlans({
      url: process.env.MARKETING_PLANS_URL || site.DEFAULT_PLANS_URL,
      timeoutMs:
        Number(process.env.MARKETING_PLANS_TIMEOUT_MS) ||
        site.DEFAULT_PLANS_TIMEOUT_MS,
      allowSnapshot,
      readSnapshot: () => JSON.parse(readFileSync(SNAPSHOT, 'utf8')),
      fetch: globalThis.fetch,
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (loaded.source === 'live') {
    log(
      `plans: LIVE catalog from ${loaded.url} (${loaded.plans.length} plans)`
    );
  } else {
    const bar = '!'.repeat(72);
    console.warn(
      `\n${bar}\n[marketing] PLANS FROM THE COMMITTED SNAPSHOT, NOT THE LIVE CATALOG\n` +
        `[marketing]   fetch of ${loaded.url} failed: ${loaded.fetchError}\n` +
        `[marketing]   MARKETING_PLANS_ALLOW_SNAPSHOT is set — never ship this build.\n${bar}\n`
    );
  }

  // 2–3. Assets.
  const client = readClientAssets();
  const themeFile = site.themeScriptFileName();
  mkdirSync(join(DIST, 'assets'), { recursive: true });
  writeFileSync(join(DIST, themeFile), site.MARKETING_THEME_SCRIPT);
  const ssrAssets = join(SSR_DIR, 'assets');
  if (existsSync(ssrAssets)) {
    // Files a page imports (images) — same hashed names as a client build would give them.
    for (const file of readdirSync(ssrAssets)) {
      if (!file.endsWith('.css'))
        cpSync(join(ssrAssets, file), join(DIST, 'assets', file));
    }
  }
  const assets = { ...client, themeScript: `/${themeFile}` };

  // 4. Pages and root files.
  if (site.MARKETING_PAGES.length === 0)
    warn('MARKETING_PAGES is empty — no marketing page will be written');
  const built = site.buildMarketingSite({
    pages: site.MARKETING_PAGES,
    ctx: { plans: loaded.plans, siteUrl, buildDate },
    assets,
    llms: site.marketingLlmsCopy(loaded.plans),
  });
  for (const message of built.warnings) warn(message);

  rmSync(OUT, { recursive: true, force: true });
  for (const file of built.files) {
    const target = join(OUT, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.contents);
  }
  const pages = built.files.filter((file) =>
    file.path.endsWith('.html')
  ).length;
  log(
    `wrote ${pages} pages and ${built.files.length - pages} root files to dist/marketing/ (site ${siteUrl}, ${buildDate})`
  );
}

main().catch((error) => fail(error?.stack ?? String(error)));
