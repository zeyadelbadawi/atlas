/*
 * Local-first — the app shell, available without a connection.
 *
 * Registered on the platform (dashboard) host AND on every Academy website
 * (academy offline work, `src/services/offline/app-shell.ts`). A worker is
 * per origin and every Academy website is its own origin, so each academy
 * gets its own worker and its own caches; nothing here is shared between
 * academies or with the dashboard. It caches exactly three things, all
 * identical for every person:
 *
 *   1. the HTML shell — the build's own `/index.html`, fetched directly
 *      (never a navigation response: on an Academy website that can be a
 *      server-rendered page, and on the platform a prerendered blog page).
 *      `/index.html` is the static single-page app on every host and
 *      carries no user or tenant data — the app renders the academy from
 *      its own (per-academy) offline store;
 *   2. the build's hashed files under `/assets/` (immutable by name);
 *   3. theme photographs under `/theme-assets/<theme>/v<n>/` (immutable:
 *      a changed image ships as a new version folder).
 *
 * It NEVER touches `/api/*`, cross-origin requests or anything but GET:
 * people's data — and on an Academy website the learner's lessons, drafts
 * and progress — is kept by the app itself (allowlisted, per user, per
 * academy, wiped at sign-out — `query-persistence.ts`,
 * `learner-persistence.ts`), never by this worker. In particular no lesson
 * grant, no signed media URL and no video segment is ever cached here.
 *
 * Navigations are network-first: online, every load comes from the server
 * (a deploy is picked up at once) and the saved shell is refreshed in the
 * background at most once a minute; only when the network fails is the
 * saved shell served. `/assets/*` is cache-first (a hashed name never changes
 * content), and only a real JavaScript/CSS/font/image response is stored —
 * never the HTML fallback a server answers for a missing chunk.
 *
 * Kill switch: shipping a build with `VITE_OFFLINE_SHELL=off` unregisters
 * this worker and deletes its caches on the next visit.
 */
const VERSION = 'v2';
const SHELL_CACHE = `atlas-shell-${VERSION}`;
const ASSET_CACHE = `atlas-assets-${VERSION}`;
const THEME_CACHE = `atlas-theme-${VERSION}`;
const SHELL_KEY = '/__atlas_shell__';
const MAX_ASSETS = 400;
const MAX_THEME_ASSETS = 200;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Cache the current shell and the files it references, so the very
      // next load works offline even though this page loaded before the
      // worker existed.
      try {
        const html = await refreshShell();
        if (html) {
          const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
            (match) => match[1]
          );
          await cacheAssets(urls);
        }
      } catch {
        // Offline at install: the shell is saved on the next online load.
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE, THEME_CACHE]);
      for (const name of await caches.keys()) {
        if (name.startsWith('atlas-') && !keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })()
  );
});

// The page reports the files it loaded before this worker controlled it
// (lazily loaded route chunks), so those work offline too.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'atlas:cache-assets' && Array.isArray(data.urls)) {
    event.waitUntil(cacheAssets(data.urls));
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request, event));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(asset(request, ASSET_CACHE, MAX_ASSETS));
    return;
  }
  if (url.pathname.startsWith('/theme-assets/')) {
    event.respondWith(asset(request, THEME_CACHE, MAX_THEME_ASSETS));
  }
});

async function navigate(request, event) {
  try {
    const response = await fetch(request);
    // Keep the saved shell current with the deployed build. Not this
    // response: a navigation can be a prerendered static page (the blog),
    // which is not the app.
    if (Date.now() - lastShellRefresh > SHELL_REFRESH_MS) {
      event.waitUntil(refreshShell().catch(() => undefined));
    }
    return response;
  } catch (error) {
    const cached = await (await caches.open(SHELL_CACHE)).match(SHELL_KEY);
    if (cached) return cached;
    throw error;
  }
}

let lastShellRefresh = 0;
const SHELL_REFRESH_MS = 60_000;

/** Saves the app's own `index.html` as the offline shell; returns its HTML. */
async function refreshShell() {
  lastShellRefresh = Date.now();
  const response = await fetch('/index.html', { cache: 'no-store' });
  if (!isHtml(response)) return null;
  const html = await response.text();
  // A fresh, non-redirected copy: a server may answer `/index.html` with a
  // redirect to `/`, and a redirected response cannot answer a navigation.
  await (
    await caches.open(SHELL_CACHE)
  ).put(
    SHELL_KEY,
    new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  );
  return html;
}

function isCacheablePath(pathname) {
  return pathname.startsWith('/assets/') || pathname.startsWith('/theme-assets/');
}

function cacheFor(pathname) {
  return pathname.startsWith('/theme-assets/')
    ? { name: THEME_CACHE, max: MAX_THEME_ASSETS }
    : { name: ASSET_CACHE, max: MAX_ASSETS };
}

async function asset(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  // `ignoreVary`: a hashed file is the same bytes whatever the request's
  // Origin/Accept-Encoding (module scripts send Origin; the copy saved at
  // install time was fetched without it).
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (isStorableAsset(response)) {
    await cache.put(request, response.clone());
    void trim(cache, max);
  }
  return response;
}

async function cacheAssets(urls) {
  const touched = new Map();
  for (const raw of urls) {
    try {
      const url = new URL(raw, self.location.origin);
      if (url.origin !== self.location.origin || !isCacheablePath(url.pathname)) {
        continue;
      }
      const target = cacheFor(url.pathname);
      const cache = await caches.open(target.name);
      touched.set(target.name, target.max);
      if (await cache.match(url.pathname, { ignoreVary: true })) continue;
      const response = await fetch(url.pathname);
      if (isStorableAsset(response)) await cache.put(url.pathname, response);
    } catch {
      // One file failing never stops the others.
    }
  }
  if (!touched.has(ASSET_CACHE)) touched.set(ASSET_CACHE, MAX_ASSETS);
  for (const [name, max] of touched) await trim(await caches.open(name), max);
}

/** Oldest first out once the cache holds more than `max` files. */
async function trim(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) {
    await cache.delete(key);
  }
}

function isHtml(response) {
  return (
    response.status === 200 &&
    (response.headers.get('content-type') || '').includes('text/html')
  );
}

function isStorableAsset(response) {
  if (response.status !== 200 || response.type !== 'basic') return false;
  const type = response.headers.get('content-type') || '';
  return !type.includes('text/html');
}
