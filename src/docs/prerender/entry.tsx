/**
 * The help center prerender bundle (`vite build -c vite.docs.config.ts --ssr
 * src/docs/prerender/entry.tsx`). `scripts/docs/prerender.mjs` imports the
 * built file; everything that decides what a page contains stays here, in
 * TypeScript, next to its tests.
 */
export { buildDocsSite } from './site';
export { loadArticles, loadShots, loadShotSpecs, shotFiles } from '../content/load';
export { DOCS_THEME_SCRIPT, docsThemeScriptFileName } from './theme-script';
export {
  DEFAULT_PLANS_URL,
  DEFAULT_PLANS_TIMEOUT_MS,
  loadPlans,
  snapshotAllowed,
} from '@/marketing/prerender/plans';
