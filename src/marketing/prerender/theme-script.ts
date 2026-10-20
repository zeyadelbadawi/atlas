/**
 * The render-blocking theme script (an external file, so `script-src 'self'`
 * allows it). Runs in <head> before the stylesheet applies and sets
 * `class="dark"` (and `color-scheme`) on <html> from the visitor's choice
 * under `atlas:marketing-theme` — `light`, `dark`, or `system`/absent (the
 * OS preference). `client/main.ts` owns the toggle and keeps the same key.
 *
 * ES5 on purpose: it is not bundled, and it must never throw (storage can
 * be blocked, `matchMedia` missing).
 */
export const MARKETING_THEME_STORAGE_KEY = 'atlas:marketing-theme';

export const MARKETING_THEME_SCRIPT = `(function(){var d=document.documentElement,k=${JSON.stringify(
  MARKETING_THEME_STORAGE_KEY
)},v=null;try{v=window.localStorage.getItem(k)}catch(e){}var s=false;try{s=!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}var dark=v==="dark"||(v!=="light"&&s);if(dark){d.classList.add("dark")}else{d.classList.remove("dark")}d.style.colorScheme=dark?"dark":"light"})();
`;

/** Short content hash for the file name (FNV-1a, hex), so `/assets/*` caching stays immutable. */
export function contentHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** `assets/marketing-theme-<hash>.js` (relative to `dist/`). */
export function themeScriptFileName(script = MARKETING_THEME_SCRIPT): string {
  return `assets/marketing-theme-${contentHash(script)}.js`;
}
