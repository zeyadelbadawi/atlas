/**
 * Render-blocking theme script for the help center (an external file, so the
 * CSP `script-src 'self'` allows it): sets `.dark` on <html> before the
 * first paint from `atlas:docs-theme` (`light` | `dark` | system).
 * ES5, never throws.
 */
import { contentHash } from '@/marketing/prerender/theme-script';

export const DOCS_THEME_STORAGE_KEY = 'atlas:docs-theme';

export const DOCS_THEME_SCRIPT = `(function(){var d=document.documentElement,k=${JSON.stringify(
  DOCS_THEME_STORAGE_KEY
)},v=null;try{v=window.localStorage.getItem(k)}catch(e){}var s=false;try{s=!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}var dark=v==="dark"||(v!=="light"&&s);if(dark){d.classList.add("dark")}else{d.classList.remove("dark")}d.style.colorScheme=dark?"dark":"light"})();
`;

/** `assets/docs-theme-<hash>.js` (relative to `dist/docs/`). */
export function docsThemeScriptFileName(script = DOCS_THEME_SCRIPT): string {
  return `assets/docs-theme-${contentHash(script)}.js`;
}
