/**
 * Local-first dashboard — registers the app-shell service worker
 * (`public/sw.js`) so the dashboard loads without a connection.
 *
 * Only on the platform (dashboard) host and only in a production build: an
 * Academy website never gets a worker (it is server-rendered per tenant and
 * must always come from the network), and the Vite dev server serves
 * unbundled modules a shell cache would only get in the way of.
 *
 * `VITE_OFFLINE_SHELL=off` is the kill switch: such a build unregisters any
 * worker an earlier build installed and deletes its caches.
 */
const WORKER_URL = '/sw.js';

function loadedAssetUrls(): string[] {
  if (typeof performance === 'undefined') return [];
  return performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        const url = new URL(name);
        return (
          url.origin === window.location.origin &&
          url.pathname.startsWith('/assets/')
        );
      } catch {
        return false;
      }
    });
}

async function removeWorker(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) =>
        registration.active?.scriptURL.endsWith(WORKER_URL)
      )
      .map((registration) => registration.unregister())
  );
  if (typeof caches !== 'undefined') {
    for (const name of await caches.keys()) {
      if (name.startsWith('atlas-')) await caches.delete(name);
    }
  }
}

export function setUpAppShell(options: {
  readonly isPlatformHost: boolean;
  readonly isProductionBuild: boolean;
  readonly enabled: boolean;
}): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  if (!options.isPlatformHost || !options.isProductionBuild) return;
  const start = () => {
    if (!options.enabled) {
      void removeWorker().catch(() => undefined);
      return;
    }
    navigator.serviceWorker
      .register(WORKER_URL, { scope: '/' })
      .then(async () => {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: 'atlas:cache-assets',
          urls: loadedAssetUrls(),
        });
      })
      .catch(() => undefined);
  };
  // After the page has loaded: the worker never competes with first paint.
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
