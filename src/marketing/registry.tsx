/**
 * The marketing site's page list. Each entry is one page in one language;
 * `prerender/` renders every entry to `dist/marketing/<file>`, and the
 * sitemap, llms.txt and tests all read this same array.
 */
import type { MarketingPageDef } from './types';
import { HOME_PAGES } from './pages/home';
import { FEATURES_PAGES } from './pages/features';
import { PRODUCT_PAGES } from './pages/product';
import { PRICING_PAGES } from './pages/pricing';
import { COMPANY_PAGES } from './pages/company';
import { LEGAL_PAGES, NOT_FOUND_PAGES } from './pages/legal';
import { FOUNDING_PAGES } from './pages/founding';
import { RESOURCES_PAGES } from './pages/resources';
import { SOLUTION_PAGES } from './pages/solutions';

export const MARKETING_PAGES: readonly MarketingPageDef[] = [
  ...HOME_PAGES,
  ...FEATURES_PAGES,
  ...PRODUCT_PAGES,
  ...PRICING_PAGES,
  ...COMPANY_PAGES,
  // B3 — the resources hub and the multi-academy solution page.
  ...RESOURCES_PAGES,
  ...SOLUTION_PAGES,
  // B2 — noindex and out of the sitemap/llms (inSitemap: false); link-only.
  ...FOUNDING_PAGES,
  ...LEGAL_PAGES,
  ...NOT_FOUND_PAGES,
];
