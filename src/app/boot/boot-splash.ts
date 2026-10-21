/**
 * DL-63 — removes the dashboard's boot screen (`public/boot-splash.js`,
 * shown on the dashboard host only) once the app knows where it is going:
 * the session check has finished. A short fade; safe to call any number of
 * times and on hosts where the screen never showed.
 */
export const BOOT_SPLASH_ID = 'atlas-boot-splash';

export function dismissBootSplash(doc: Document = document): void {
  const el = doc.getElementById(BOOT_SPLASH_ID);
  if (!el) return;
  if (el.hidden) {
    el.remove();
    return;
  }
  el.setAttribute('data-leaving', '');
  window.setTimeout(() => el.remove(), 220);
}
