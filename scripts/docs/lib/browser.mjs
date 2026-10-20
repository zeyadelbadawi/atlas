// Playwright helpers for the Help Center captures: contexts with the stored
// language/theme/consent, sign-in per role, settle, locators, actions,
// highlight overlays and clipping.
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { SpecError } from './i18n.mjs';
import { VIEWPORTS } from './specs.mjs';

export const BRAND = '#1B3A8C';
export const PREVIEW_PARAM = '__atlas_academy_preview';
const CHROME = process.env.DOCS_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function launch() {
  return chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined });
}

/** A browser context in `lang` (light theme, Cairo time, cookies decided). */
export async function newContext(browser, { lang, viewport, storageState, storage = {} }) {
  const vp = VIEWPORTS[viewport];
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    locale: lang === 'ar' ? 'ar-EG' : 'en-US',
    extraHTTPHeaders: { 'Accept-Language': lang === 'ar' ? 'ar-EG,ar;q=0.9' : 'en-US,en;q=0.9' },
    timezoneId: 'Africa/Cairo',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    ...(storageState && existsSync(storageState) ? { storageState } : {}),
  });
  await ctx.addInitScript(
    ({ lang, storage }) => {
      try {
        for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
        localStorage.setItem(
          'atlas:cookie-consent',
          JSON.stringify({ version: 1, necessary: true, preferences: true, decidedAt: '2026-10-01T09:00:00.000Z' })
        );
        localStorage.setItem('atlas:language', JSON.stringify(lang));
        localStorage.setItem('atlas:theme', JSON.stringify('light'));
        document.cookie = 'atlas_consent=1; path=/; max-age=31536000; samesite=lax';
      } catch {
        /* storage blocked: the page still renders */
      }
    },
    { lang, storage }
  );
  return ctx;
}

/** Waits for network idle, web fonts, images and no skeletons/spinners/aria-busy in view. */
export async function settle(page, extra = 400) {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  for (let i = 0; i < 40; i++) {
    const busy = await page
      .evaluate(() => {
        const inView = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
        };
        const loading = Array.from(
          document.querySelectorAll('[aria-busy="true"], .animate-pulse, .animate-spin, [data-loading="true"], [data-skeleton]')
        ).filter(inView).length;
        const images = Array.from(document.images).filter((img) => inView(img) && !img.complete).length;
        return loading + images;
      })
      .catch(() => 0);
    if (!busy) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(extra);
}

/** Hides dev-only overlays, toasts and consent banners; no caret, no transitions. */
export async function cleanUp(page) {
  await page.addStyleTag({
    content: `
      vite-error-overlay, #vite-error-overlay, [data-source-locator], .source-locator-overlay,
      [data-sonner-toaster], [data-testid="cookie-consent-banner"], [data-testid="cookie-banner"],
      [aria-label="Cookie consent"], #atoms-dev-toolbar, [data-atoms-devtools], .tsqd-parent-container,
      [data-docs-hide] { display: none !important; }
      *, *::before, *::after { caret-color: transparent !important; transition: none !important; animation-duration: 0s !important; }
    `,
  });
}

/**
 * A Playwright locator from a spec locator. `t` resolves text values.
 * While a dialog is open, a target inside it wins over one behind it.
 */
export async function locate(page, spec, t) {
  const dialog = page.locator('[role="dialog"], [role="alertdialog"]').filter({ visible: true }).last();
  if (await dialog.count()) {
    const inDialog = locateIn(dialog, spec, t);
    if (await inDialog.count()) return inDialog;
  }
  return locateIn(page, spec, t);
}

function locateIn(root, spec, t) {
  const { nth, exact } = spec;
  let loc;
  if ('role' in spec) {
    loc = root.getByRole(spec.role, spec.name !== undefined ? { name: t(spec.name, { exact, anchorKeys: true }) } : {});
  } else if ('text' in spec) {
    loc = root.getByText(t(spec.text, { exact }));
  } else if ('label' in spec) {
    loc = root.getByLabel(t(spec.label, { exact, anchorKeys: true }));
  } else if ('testId' in spec) {
    loc = root.getByTestId(spec.testId);
  } else {
    loc = root.locator(spec.selector);
  }
  loc = loc.filter({ visible: true });
  return nth === undefined ? loc.first() : nth < 0 ? loc.last() : loc.nth(nth);
}

const describe = (spec) => JSON.stringify(spec);

async function found(loc, spec, what, timeout = 15_000) {
  try {
    await loc.waitFor({ state: 'visible', timeout });
  } catch {
    throw new SpecError(`${what}: no visible element for ${describe(spec)}`);
  }
  return loc;
}

export async function runAction(page, action, t) {
  const [name] = Object.keys(action);
  const arg = action[name];
  if (name === 'wait') return page.waitForTimeout(arg);
  if (name === 'press') {
    if (typeof arg === 'string') return page.keyboard.press(arg);
    const { key, ...loc } = arg;
    if (Object.keys(loc).length) return (await found(await locate(page, loc, t), loc, 'press')).press(key);
    return page.keyboard.press(key);
  }
  if (name === 'scroll') {
    if (typeof arg.y === 'number') {
      await page.evaluate((y) => window.scrollTo(0, y), arg.y);
      return page.waitForTimeout(200);
    }
    const el = await found(await locate(page, arg, t), arg, 'scroll');
    await el.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    return page.waitForTimeout(200);
  }
  const { value, ...loc } = arg;
  const el = await found(await locate(page, loc, t), loc, name);
  if (name === 'click') await el.click();
  else if (name === 'hover') await el.hover();
  else if (name === 'fill') await el.fill(typeof value === 'string' ? value : t(value));
  await page.waitForTimeout(250);
}

/** Draws the brand-coloured outline box around each target (an overlay; pixels are never edited). */
export async function highlight(page, specs, t, { fullPage }) {
  for (const spec of specs) {
    const el = await found(await locate(page, spec, t), spec, 'highlight');
    const inView = await el.evaluate((node) => {
      const r = node.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
    });
    if (!inView && !fullPage) await el.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await el.evaluate(
      (node, { color, fixed }) => {
        const r = node.getBoundingClientRect();
        const offset = 4;
        const box = document.createElement('div');
        box.setAttribute('data-docs-highlight', '');
        Object.assign(box.style, {
          position: fixed ? 'fixed' : 'absolute',
          left: `${r.left + (fixed ? 0 : window.scrollX) - offset}px`,
          top: `${r.top + (fixed ? 0 : window.scrollY) - offset}px`,
          width: `${r.width + offset * 2}px`,
          height: `${r.height + offset * 2}px`,
          border: `3px solid ${color}`,
          borderRadius: '10px',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 6px rgba(27,58,140,0.18)',
          boxSizing: 'border-box',
          pointerEvents: 'none',
          zIndex: '2147483647',
        });
        document.body.appendChild(box);
      },
      { color: BRAND, fixed: !fullPage }
    );
  }
}

/** The clip rectangle: the open dialog (24px padding) or a selector/locator's box. */
export async function clipRect(page, clip, t) {
  const pad = 24;
  let el;
  if (clip === 'dialog') {
    el = page.locator('[role="dialog"], [role="alertdialog"]').filter({ visible: true }).last();
    await found(el, { clip }, 'clip');
  } else if (typeof clip === 'string') {
    el = await found(page.locator(clip).filter({ visible: true }).first(), { clip }, 'clip');
  } else {
    el = await found(await locate(page, clip, t), clip, 'clip');
  }
  const box = await el.boundingBox();
  const vp = page.viewportSize();
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  return {
    x,
    y,
    width: Math.min(vp.width - x, Math.ceil(box.width + pad * 2)),
    height: Math.min(vp.height - y, Math.ceil(box.height + pad * 2)),
  };
}

export function ensureDir(file) {
  mkdirSync(path.dirname(file), { recursive: true });
}
