#!/usr/bin/env node
/**
 * Writes the Atlas Help Center into `dist/docs/` (DL-57). Runs last in
 * `pnpm build:docs`, after the docs client build and the prerender bundle
 * build (vite.docs.config.ts):
 *
 *   1. the plans catalog (for `{trialDays}`), like the marketing prerender:
 *      GET $MARKETING_PLANS_URL; a failed fetch FAILS the build unless
 *      MARKETING_PLANS_ALLOW_SNAPSHOT=1 (local work / tests only);
 *   2. the client manifest → hashed CSS/JS and above-the-fold fonts;
 *   3. every page, the search indexes, sitemaps, robots.txt and llms.txt;
 *      the content rules (src/docs/content/validate.ts) fail the build;
 *   4. the screenshots (content/docs/media) and favicons are copied in.
 *
 * Env: VITE_SITE_URL (marketing origin, default https://atlass.dpdns.org),
 * VITE_APP_URL (app origin: sign-in, registration, dashboards — DL-63;
 * default https://dashboard.<host of VITE_SITE_URL>), VITE_DOCS_URL
 * (default https://docs.<host of VITE_SITE_URL>),
 * DOCS_REQUIRE_COMPLETE=1 (every inventory page written),
 * DOCS_ALLOW_MISSING_SHOTS=1 (local drafts only), MARKETING_BUILD_DATE.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'dist', 'docs');
const SSR_DIR = join(ROOT, 'dist-docs-ssr');
const MANIFEST = join(OUT, '.vite', 'docs-manifest.json');
const CLIENT_ENTRY = 'src/docs/client/main.ts';
const SNAPSHOT = join(ROOT, 'src/marketing/data/plans.snapshot.json');
const FONT_PRELOADS = { en: ['readex-pro-latin', 'rubik-latin'], ar: ['readex-pro-arabic', 'rubik-arabic'] };

const log = (m) => console.log(`[docs] ${m}`);
const warn = (m) => console.warn(`[docs] WARNING: ${m}`);
function fail(m) {
  console.error(`[docs] ERROR: ${m}`);
  process.exit(1);
}

function readClientAssets() {
  if (!existsSync(MANIFEST)) fail(`${MANIFEST} is missing — run the docs client build first`);
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
  const cssText = [...stylesheets].map((f) => readFileSync(join(OUT, f), 'utf8')).join('\n');
  const fontUrls = [...cssText.matchAll(/url\((?:["']?)(\/assets\/[^)"']+\.woff2)(?:["']?)\)/g)].map((m) => m[1]);
  const fontPreloads = {};
  for (const [lang, names] of Object.entries(FONT_PRELOADS)) {
    fontPreloads[lang] = names
      .map((name) => fontUrls.find((url) => new RegExp(`/${name}-[\\w-]{8}\\.woff2$`).test(url)))
      .filter(Boolean);
  }
  return {
    stylesheets: [...stylesheets].map((f) => `/${f}`),
    moduleScripts: [`/${entry.file}`],
    modulePreloads: [...preloads].map((f) => `/${f}`),
    fontPreloads,
  };
}

function today() {
  const fixed = process.env.MARKETING_BUILD_DATE;
  if (fixed) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fixed)) fail(`MARKETING_BUILD_DATE must be YYYY-MM-DD, got ${fixed}`);
    return fixed;
  }
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const entryFile = join(SSR_DIR, 'entry.js');
  if (!existsSync(entryFile)) fail(`${entryFile} is missing — run the docs prerender bundle build first`);
  const site = await import(pathToFileURL(entryFile).href);

  const siteUrl = (process.env.VITE_SITE_URL || 'https://atlass.dpdns.org').replace(/\/+$/, '');
  const appUrl = (process.env.VITE_APP_URL || site.defaultAppUrl(siteUrl)).replace(/\/+$/, '');
  const docsUrl = (process.env.VITE_DOCS_URL || `https://docs.${new URL(siteUrl).host}`).replace(/\/+$/, '');
  const buildDate = today();

  let loaded;
  try {
    loaded = await site.loadPlans({
      url: process.env.MARKETING_PLANS_URL || site.DEFAULT_PLANS_URL,
      timeoutMs: Number(process.env.MARKETING_PLANS_TIMEOUT_MS) || site.DEFAULT_PLANS_TIMEOUT_MS,
      allowSnapshot: site.snapshotAllowed(process.env.MARKETING_PLANS_ALLOW_SNAPSHOT),
      readSnapshot: () => JSON.parse(readFileSync(SNAPSHOT, 'utf8')),
      fetch: globalThis.fetch,
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (loaded.source !== 'live') warn(`plans from the committed snapshot (${loaded.fetchError}) — never ship this build`);

  const client = readClientAssets();
  const themeFile = site.docsThemeScriptFileName();
  mkdirSync(join(OUT, 'assets'), { recursive: true });
  writeFileSync(join(OUT, themeFile), site.DOCS_THEME_SCRIPT);

  const articles = site.loadArticles();
  // Screenshots are published under content-hashed names
  // (`…-960.1a2b3c4d.webp`) so the edge may cache them as immutable; a
  // re-capture is a new URL.
  const shots = site.loadShots();
  const copies = [];
  for (const map of Object.values(shots)) {
    for (const [key, shot] of map) {
      const files = shot.files.map((f) => {
        const from = join(ROOT, 'content/docs', f.src);
        if (!existsSync(from)) fail(`screenshot file ${f.src} is in a manifest but missing on disk`);
        const hash = createHash('sha256').update(readFileSync(from)).digest('hex').slice(0, 10);
        const src = f.src.replace(/\.webp$/, `.${hash}.webp`);
        copies.push({ from, to: join(OUT, src) });
        return { src, width: f.width };
      });
      map.set(key, { ...shot, files });
    }
  }
  const built = site.buildDocsSite({
    articles,
    shots,
    specFiles: site.loadShotSpecs(),
    plans: loaded.plans,
    docsUrl,
    siteUrl,
    appUrl,
    buildDate,
    assets: { ...client, themeScript: `/${themeFile}` },
    requireComplete: process.env.DOCS_REQUIRE_COMPLETE === '1',
    requireShots: process.env.DOCS_ALLOW_MISSING_SHOTS !== '1',
  });
  if (built.errors.length > 0) {
    for (const e of built.errors) console.error(`[docs]   ${e}`);
    fail(`${built.errors.length} content error(s); fix them or see content/docs/README.md`);
  }
  if (built.missing.length > 0) warn(`${built.missing.length} inventory page(s) not written yet`);

  for (const file of built.files) {
    const target = join(OUT, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.contents);
  }
  // Screenshots (hashed names), favicons, social images.
  for (const { from, to } of copies) {
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
  }
  for (const icon of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']) cpSync(join(ROOT, 'public', icon), join(OUT, icon));
  cpSync(join(ROOT, 'public/marketing-assets/og/og-en.jpg'), join(OUT, 'og-docs-en.jpg'));
  cpSync(join(ROOT, 'public/marketing-assets/og/og-ar.jpg'), join(OUT, 'og-docs-ar.jpg'));
  rmSync(join(OUT, '.vite'), { recursive: true, force: true });

  log(`wrote ${built.pages} pages, ${articles.length} articles, ${built.files.length} files to dist/docs/ (${docsUrl}, app ${appUrl}, ${buildDate})`);
}

main().catch((error) => fail(error?.stack ?? String(error)));
