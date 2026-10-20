import type { Config } from 'tailwindcss';
import base from './tailwind.config';

/**
 * The help center's own Tailwind pass (`vite.docs.config.ts`, DL-57): the
 * product theme and tokens (`tailwind.config.ts` stays the single source),
 * with content globs limited to the help center so `docs.css` carries only
 * the utilities its pages use. The marketing chrome is listed for the
 * shared logo mark.
 */
export default {
  ...base,
  content: {
    relative: true,
    files: ['./src/docs/**/*.{ts,tsx}', './src/marketing/components/chrome.tsx'],
  },
} satisfies Config;
