/**
 * The prerender's server bundle entry (`vite build --ssr`, see
 * `vite.marketing.config.ts`). `scripts/marketing/prerender.mjs` imports the
 * built file and calls these; everything that decides what a page looks
 * like stays in TypeScript, next to its tests.
 */
import type { Plan } from '@/types/plan.types';
import { ar } from '../content/ar';
import { en } from '../content/en';
import { catalogTokens } from '../lib/copy';
import { fill } from '../lib/site';
import { MARKETING_PAGES } from '../registry';
import type { MarketingLang } from '../types';
import type { LlmsCopy } from './seo-files';

export { MARKETING_PAGES };
export { buildMarketingSite, validatePages } from './site';
export {
  DEFAULT_PLANS_URL,
  DEFAULT_PLANS_TIMEOUT_MS,
  loadPlans,
  snapshotAllowed,
} from './plans';
export { MARKETING_THEME_SCRIPT, themeScriptFileName } from './theme-script';
// B3 — the blog, rendered at request time by the `ssr` container
// (server/ssr/blog.mjs imports this same bundle).
export {
  blogRoute,
  buildBlogSitemap,
  isBlogPath,
  renderBlogIndex,
  renderBlogNotFound,
  renderBlogPost,
  renderBlogUnavailable,
  BLOG_PAGE_SIZE,
} from '../blog/site';

/**
 * The llms.txt copy of each language (`content/<lang>.ts` → `llms`), with
 * its catalog tokens (`{brand}`, `{trialDays}`, …) filled from the plans the
 * pages were rendered with — the same `catalogTokens` the pages use.
 */
export function marketingLlmsCopy(
  plans: readonly Plan[]
): Partial<Record<MarketingLang, LlmsCopy>> {
  const result: Partial<Record<MarketingLang, LlmsCopy>> = {};
  for (const content of [en, ar] as const) {
    const tokens = catalogTokens(content, plans);
    const llms = content.llms;
    result[content.lang] = {
      heading: fill(llms.heading, tokens),
      summary: fill(llms.summary, tokens),
      details: fill(llms.details, tokens),
      pagesTitle: fill(llms.pagesTitle, tokens),
      pageNotes: Object.fromEntries(
        Object.entries(llms.pageNotes).map(([id, note]) => [
          id,
          fill(note, tokens),
        ])
      ),
      pricingFileNote: fill(llms.pricingFileNote, tokens),
      crawlerPolicy: fill(llms.crawlerPolicy, tokens),
    };
  }
  return result;
}
