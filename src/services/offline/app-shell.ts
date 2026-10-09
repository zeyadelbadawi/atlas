/**
 * Local-first — registers the app-shell service worker (`public/sw.js`) so
 * the dashboard AND every Academy website load without a connection.
 *
 * SCOPE PER ORIGIN. The worker is registered at `/` on the page's own
 * origin. Every Academy website (subdomain or custom domain) is its own
 * origin, so each academy gets its own worker and caches, separate from
 * the dashboard's and from every other academy's. Online, an Academy page
 * still comes from the network (server-rendered when the renderer is on);
 * only when the network fails does the worker answer with the static app
 * shell, which then renders that academy from its own offline store. The
 * worker never caches `/api/*` (see `sw.js`).
 *
 * Production builds only: the Vite dev server serves unbundled modules a
 * shell cache would only get in the way of — which also means the shared
 * `localhost` dev-override host never runs a worker.
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
          (url.pathname.startsWith('/assets/') ||
            url.pathname.startsWith('/theme-assets/'))
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
  /** Which surface this page is; both get the shell (own origin, own worker). */
  readonly surface: 'platform' | 'academy';
  readonly isProductionBuild: boolean;
  readonly enabled: boolean;
}): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  if (!options.isProductionBuild) return;
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
