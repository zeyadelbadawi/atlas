import type { Config } from 'tailwindcss';
import base from './tailwind.config';

/**
 * The static marketing site's own Tailwind pass (`vite.marketing.config.ts`).
 *
 * Same theme, tokens and plugins as the product (`tailwind.config.ts` stays
 * the single source), but the content globs cover the marketing pages only,
 * so `marketing.css` carries just the utilities those pages use (SPEC §F.1:
 * critical CSS ≤ 30 KB gzip) instead of the whole dashboard's.
 *
 * A marketing page that renders a shared component from outside
 * `src/marketing/` must add that component's folder here, or its classes
 * will be missing from the static pages.
 */
export default {
  ...base,
  content: {
    relative: true,
    files: ['./src/marketing/**/*.{ts,tsx}'],
  },
} satisfies Config;
