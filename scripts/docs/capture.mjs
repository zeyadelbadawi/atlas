#!/usr/bin/env node
// Captures the Help Center screenshots listed in content/docs/shots/*.yaml
// from the LOCAL demo stack (scripts/docs/README.md), in English and Arabic:
// PNG masters outside the repo, WebP derivatives + manifest.json in
// content/docs/media/<lang>/.
//
//   pnpm docs:capture                         # every shot, both languages
//   pnpm docs:capture -- --only selling/      # keys starting with a prefix (repeatable, or comma-separated)
//   pnpm docs:capture -- --lang ar            # one language
//   pnpm docs:capture -- --changed            # skip shots whose spec and app commit are unchanged
//   pnpm docs:capture -- --keep-data-locale   # do not switch the demo content edition per language
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createI18n, SpecError } from './lib/i18n.mjs';
import { loadSpecs, fillPlaceholders, VIEWPORTS } from './lib/specs.mjs';
import { launch, newContext, settle, cleanUp, runAction, highlight, clipRect, ensureDir, locate, PREVIEW_PARAM } from './lib/browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SHOTS = path.join(ROOT, 'content/docs/shots');
const MEDIA = path.join(ROOT, 'content/docs/media');
const STATE_FILE = path.join(HERE, 'seed/state.json');
const BASE = process.env.DOCS_APP_URL ?? `http://localhost:${process.env.DOCS_APP_PORT ?? '3111'}`;
const MASTERS = process.env.DOCS_MASTERS_DIR ?? '/tmp/atlas-docs-masters';

// ---- arguments ----
const argv = process.argv.slice(2).filter((a) => a !== '--');
const flag = (name) => argv.includes(name);
const values = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? argv[i + 1].split(',') : []));
const only = values('--only');
const langs = values('--lang').length ? values('--lang') : ['en', 'ar'];
const changedOnly = flag('--changed');
const keepLocale = flag('--keep-data-locale');
for (const l of langs) if (!['en', 'ar'].includes(l)) die(`--lang must be en or ar (got ${l})`);

function die(message) {
  console.error(`docs:capture: ${message}`);
  process.exit(2);
}

// ---- production guard ----
const host = new URL(BASE).hostname;
if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) die(`REFUSING: ${BASE} is not this machine. Captures run against the local demo stack only.`);
if (!existsSync(STATE_FILE)) die(`no seed state at ${STATE_FILE}: run the seed first (pnpm docs:seed).`);
const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));

let specs;
try {
  specs = loadSpecs(SHOTS);
} catch (e) {
  die(e.message);
}
const selected = specs.filter((s) => !only.length || only.some((p) => s.key.startsWith(p)));
if (!selected.length) die(`no shot matches ${only.join(', ') || '(all)'}`);

const commit = (() => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
})();

const i18n = createI18n(path.join(ROOT, 'src/localization/resources'));

// ---- accounts ----
const { OWNER, MANAGER, INSTRUCTOR, PASSWORD } = await import('./seed/data.mjs');
const USER_IDS = { owner: state.ownerId, manager: state.managerId, instructor: state.instructorId };
/** Staff open the main demo academy by default (the app's "last academy" preference). */
const storageFor = (role) =>
  USER_IDS[role] ? { [`atlas:last-academy:${USER_IDS[role]}:${state.organizationId}`]: state.academyId } : {};
const ACCOUNTS = {
  owner: OWNER.email,
  manager: MANAGER.email,
  instructor: INSTRUCTOR.email,
  learner: state.learnerEmail,
};

// ---- manifest ----
function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])]));
  return v;
}
const manifestPath = (lang) => path.join(MEDIA, lang, 'manifest.json');
const readManifest = (lang) => (existsSync(manifestPath(lang)) ? JSON.parse(readFileSync(manifestPath(lang), 'utf8')) : {});
function writeManifest(lang, manifest) {
  mkdirSync(path.join(MEDIA, lang), { recursive: true });
  writeFileSync(manifestPath(lang), JSON.stringify(sortDeep(manifest), null, 2) + '\n');
}

// ---- URLs ----
function urlFor(entry, lang) {
  const p = fillPlaceholders(entry.path, state);
  if (entry.surface !== 'academy') return BASE + p;
  const slug = state.academySlug;
  if (!slug) throw new SpecError('seed state has no academySlug');
  const [pathname, query = ''] = p.split('?');
  const localized = lang === 'ar' && !/^\/ar(\/|$)/.test(pathname) ? `/ar${pathname === '/' ? '' : pathname}` : pathname;
  const params = new URLSearchParams(query);
  params.set(PREVIEW_PARAM, slug);
  return `${BASE}${localized || '/'}?${params}`;
}

// ---- sign-in (one storage state per role + language, reused for every shot) ----
const authDir = path.join(MASTERS, '.auth');
mkdirSync(authDir, { recursive: true });
const signedIn = new Map();

async function psqlLocal(sql) {
  const { psql } = await import('./seed/lib.mjs');
  return psql(sql);
}

async function signIn(browser, role, lang) {
  const key = `${role}-${lang}`;
  if (role === 'visitor') return undefined;
  if (signedIn.has(key)) return signedIn.get(key);
  const email = ACCOUNTS[role];
  if (!email) throw new SpecError(`no demo account for role "${role}" in the seed state`);
  const file = path.join(authDir, `${key}.json`);
  const ctx = await newContext(browser, { lang, viewport: 'desktop', storage: storageFor(role) });
  const page = await ctx.newPage();
  const { clearLimits } = await import('./seed/lib.mjs');
  clearLimits();
  if (role === 'learner') {
    // Every capture browser is a "new device"; free the demo learner's device slots first (local DB).
    await psqlLocal(`update student_devices set revoked_at = now() where revoked_at is null and user_id = (select id from users where lower(email) = lower('${email}'))`);
    await page.goto(`${BASE}/sign-in?${PREVIEW_PARAM}=${state.academySlug}`);
  } else {
    await page.goto(`${BASE}/auth/sign-in`);
  }
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  try {
    await page.waitForURL((u) => !/\/(auth\/)?sign-in/.test(u.pathname), { timeout: 45_000 });
  } catch {
    const text = (await page.locator('body').innerText()).slice(0, 200).replace(/\s+/g, ' ');
    await ctx.close();
    throw new Error(`sign-in as ${role} did not complete (page says: ${text})`);
  }
  await settle(page, 300);
  await ctx.storageState({ path: file });
  await ctx.close();
  signedIn.set(key, file);
  return file;
}

// ---- one shot ----
async function capture(browser, entry, lang) {
  const t = (value, opts) => i18n.matcher(value, lang, opts);
  const viewport = entry.viewport ?? 'desktop';
  const storageState = await signIn(browser, entry.as, lang);
  const ctx = await newContext(browser, { lang, viewport, storageState, storage: storageFor(entry.as) });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  try {
    const url = urlFor(entry, lang);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    if (entry.surface === 'dashboard' && /\/auth\/sign-in/.test(new URL(page.url()).pathname)) {
      throw new Error(`redirected to sign-in: the ${entry.as} session is not valid`);
    }
    if (entry.waitFor?.text !== undefined) {
      const loc = page.getByText(t(entry.waitFor.text)).filter({ visible: true }).first();
      await loc.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {
        throw new SpecError(`waitFor: text ${JSON.stringify(entry.waitFor.text)} (${t(entry.waitFor.text)}) never appeared on ${page.url()}`);
      });
    } else if (entry.waitFor?.selector) {
      await page.locator(entry.waitFor.selector).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {
        throw new SpecError(`waitFor: selector ${entry.waitFor.selector} never appeared on ${page.url()}`);
      });
    }
    await settle(page);
    await cleanUp(page);
    await dismissTakeover(page, lang);
    for (const action of entry.actions ?? []) {
      await runAction(page, action, t);
      await settle(page, 250);
    }
    // Language check: the UI must really be in `lang`.
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction);
    if (lang === 'ar' && dir !== 'rtl') throw new Error(`<html dir> is "${dir}", not rtl: the page did not render in Arabic`);
    if (lang === 'en' && dir === 'rtl') throw new Error('<html dir> is rtl: the page did not render in English');
    if (await page.locator('vite-error-overlay').count()) throw new Error('the Vite error overlay is showing');
    await page.mouse.move(1, 1);
    await page.evaluate(() => document.activeElement?.blur?.());
    const highlights = entry.highlight === undefined ? [] : Array.isArray(entry.highlight) ? entry.highlight : [entry.highlight];
    await highlight(page, highlights, t, { fullPage: !!entry.fullPage });
    await page.waitForTimeout(150);
    const clip = entry.clip ? await clipRect(page, entry.clip, t) : undefined;
    const master = path.join(MASTERS, lang, `${entry.key}.png`);
    ensureDir(master);
    const maskSpecs = entry.mask === undefined ? [] : Array.isArray(entry.mask) ? entry.mask : [entry.mask];
    const mask = [];
    for (const spec of maskSpecs) {
      const loc = (await locate(page, spec, t)).first();
      // A mask that matches nothing would publish the very thing it hides.
      if (!(await loc.isVisible())) throw new Error(`mask: no visible element for ${JSON.stringify(spec)}`);
      mask.push(loc);
    }
    await page.screenshot({ path: master, clip, mask, maskColor: '#CBD5E1', fullPage: !!entry.fullPage && !clip, animations: 'disabled', caret: 'hide', timeout: 60_000 });
    return { master, pageErrors };
  } finally {
    // Sessions rotate their refresh token: hand the newest one to the next shot.
    if (storageState) await ctx.storageState({ path: storageState }).catch(() => {});
    await ctx.close();
  }
}

/** The learner player's "already learning on another device" prompt: continue on this one. */
async function dismissTakeover(page, lang) {
  const confirm = page.getByRole('button', { name: i18n.matcher('learning:player.takeover.confirm', lang) }).filter({ visible: true });
  if (await confirm.count()) {
    await confirm.first().click();
    await settle(page, 600);
  }
}

function derive(entry, lang, master) {
  const vp = VIEWPORTS[entry.viewport ?? 'desktop'];
  const prefix = path.join(MEDIA, lang, entry.key);
  // Old derivatives of this key (a width may have changed).
  const dir = path.dirname(prefix);
  if (existsSync(dir)) {
    const base = path.basename(prefix);
    for (const f of readdirSync(dir)) if (new RegExp(`^${base}-\\d+\\.webp$`).test(f)) rmSync(path.join(dir, f));
  }
  const out = JSON.parse(execFileSync('python3', [path.join(HERE, 'lib/webp.py'), master, prefix, ...vp.widths.map(String)]).toString());
  const [mw, mh] = out.master;
  const cssWidth = Math.round(mw / 2);
  return {
    out,
    entry: {
      width: cssWidth,
      height: Math.round((mh / mw) * cssWidth),
      files: out.files.map((f) => ({ src: path.relative(path.join(ROOT, 'content/docs'), f.path).split(path.sep).join('/'), width: f.width })),
      capturedAt: new Date().toISOString(),
      commit,
      spec: entry.hash,
    },
  };
}

// ---- run ----
const failures = [];
const results = [];
const browser = await launch();
try {
  for (const lang of langs) {
    const manifest = readManifest(lang);
    const todo = selected.filter((s) => {
      if (!changedOnly) return true;
      const m = manifest[s.key];
      return !(m && m.spec === s.hash && m.commit === commit && m.files?.every((f) => existsSync(path.join(ROOT, 'content/docs', f.src))));
    });
    if (!todo.length) {
      console.log(`[${lang}] nothing changed`);
      continue;
    }
    if (!keepLocale) {
      const { switchLocale } = await import('./seed/locale.mjs');
      await switchLocale(lang);
    }
    console.log(`[${lang}] ${todo.length} shot(s)`);
    for (const entry of todo) {
      const started = Date.now();
      try {
        const { master, pageErrors } = await capture(browser, entry, lang);
        const { out, entry: m } = derive(entry, lang, master);
        manifest[entry.key] = m;
        writeManifest(lang, manifest);
        const sizes = out.files.map((f) => `${f.width}px ${(f.bytes / 1024).toFixed(0)}KB`).join(', ');
        results.push({ key: entry.key, lang, files: out.files, quality: out.quality });
        console.log(`  ✓ ${entry.key} (${((Date.now() - started) / 1000).toFixed(1)}s; q${out.quality}; ${sizes})${pageErrors.length ? `  [page errors: ${pageErrors.join(' | ')}]` : ''}`);
      } catch (e) {
        const reason = e instanceof SpecError ? e.message : String(e.message ?? e).split('\n')[0];
        failures.push({ key: entry.key, lang, reason });
        console.log(`  ✗ ${entry.key} [${lang}]: ${reason}`);
      }
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${results.length} captured, ${failures.length} failed. Masters: ${MASTERS}`);
for (const f of failures) console.log(`FAILED ${f.key} [${f.lang}]: ${f.reason}`);
process.exit(failures.length ? 1 : 0);
