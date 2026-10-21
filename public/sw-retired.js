/*
 * DL-63 — served as `/sw.js` on the APEX once the platform app has moved to
 * dashboard.<base> (Caddyfile, `@apex_retired_worker`). A browser that
 * installed the dashboard's worker on the apex fetches this on its next
 * update check: it deletes every cache the old worker made, unregisters
 * itself, and reloads open apex tabs so they get the marketing site from
 * the network instead of a saved app shell. Never registered anywhere.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('atlas-')).map((key) => caches.delete(key))
      );
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) {
        if ('navigate' in client) client.navigate(client.url);
      }
    })()
  );
});
