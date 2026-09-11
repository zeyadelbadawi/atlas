/**
 * Vitest configuration.
 *
 * Atlas's frontend had no test runner before Phase 10.6 — `@playwright/test`
 * was a dependency with no config and no specs. Cookie consent is the wrong
 * thing to ship untested: it is privacy-facing, it silently gates real
 * storage writes, and a regression in it is invisible in the UI (the banner
 * still looks correct while consent quietly stops being honoured).
 *
 * WHY THE ALIASES ARE READ FROM `tsconfig.app.json` RATHER THAN RESTATED.
 * `vite.config.ts` exports a callback, so `mergeConfig` cannot consume it,
 * and a hand-copied third alias list would be a third thing to keep in sync.
 * The tsconfig `paths` are already the single declaration the editor, the
 * compiler and Vite all agree on, so they are parsed and reused here.
 *
 * `jsdom` is required because the module under test talks to
 * `window.localStorage` and `document.cookie` directly, which is the whole
 * point: testing it against a hand-written fake would prove nothing about
 * the browser behaviour it exists to control.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Turns tsconfig `paths` (`"@utils": ["./src/shared/utils"]`) into Vite
 * aliases. Trailing `/*` on both sides is stripped — Vite matches by
 * prefix, so the wildcard form would produce a literal `/*` in the path.
 */
function aliasesFromTsconfig(): Record<string, string> {
  const raw = readFileSync(resolve(__dirname, 'tsconfig.app.json'), 'utf8');
  // The tsconfig carries comments, which `JSON.parse` rejects.
  const json = JSON.parse(
    raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1'),
  ) as { compilerOptions?: { paths?: Record<string, string[]> } };

  const paths = json.compilerOptions?.paths ?? {};
  const aliases: Record<string, string> = {};
  for (const [key, [target]] of Object.entries(paths)) {
    if (!target) continue;
    aliases[key.replace(/\/\*$/, '')] = resolve(__dirname, target.replace(/\/\*$/, ''));
  }
  return aliases;
}

export default defineConfig({
  resolve: { alias: aliasesFromTsconfig() },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    restoreMocks: true,
  },
});
