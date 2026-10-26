/**
 * Turns the page registry into every file of the static marketing site —
 * pure: pages, catalog and asset URLs in, `{ path, contents }` out. The Node
 * script (`scripts/marketing/prerender.mjs`) only fetches the catalog, reads
 * the client build manifest and writes what this returns to `dist/marketing/`.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MarketingHead,
  MarketingLang,
  MarketingPageDef,
  MarketingRenderContext,
} from '../types';
import { isNoindex, renderDocument, type MarketingAssets } from './document';
import { buildLlmsFullTxt } from './llms-full';
import { buildPricingMarkdown } from './pricing-md';
import {
  MARKETING_404_FILE,
  MARKETING_BLOG_UNAVAILABLE_FILE,
  marketingFileForPath,
} from './routing';
import { renderBlogUnavailable } from '../blog/site';
import {
  LLMS_FULL_FILE,
  PRICING_MD_FILE,
  SITEMAP_INDEX_FILE,
  buildLlmsTxt,
  buildLocaleSitemap,
  buildRobotsTxt,
  buildSitemapIndex,
  localeSitemapFile,
  sitemapLanguages,
  sitemapPages,
  type LlmsCopy,
  type ResolvedPage,
} from './seo-files';

export interface MarketingOutputFile {
  /** Relative to `dist/marketing/`. */
  readonly path: string;
  readonly contents: string;
}

export interface BuildMarketingSiteInput {
  readonly pages: readonly MarketingPageDef[];
  readonly ctx: MarketingRenderContext;
  readonly assets: MarketingAssets;
  readonly llms?: Partial<Record<MarketingLang, LlmsCopy>>;
}

export interface BuiltMarketingSite {
  readonly files: readonly MarketingOutputFile[];
  readonly warnings: readonly string[];
}

/** Pages whose `id` is the pricing page get a Markdown alternate link. */
export const PRICING_PAGE_ID = 'pricing';

/**
 * Registry checks that the edge relies on. Caddy serves `/x` from
 * `marketing/x/index.html`, so a page's `file` must follow that rule; the
 * only other files are the two 404 pages.
 */
export function validatePages(pages: readonly MarketingPageDef[]): string[] {
  const errors: string[] = [];
  const paths = new Set<string>();
  const files = new Set<string>();
  const allowed404 = new Set<string>(Object.values(MARKETING_404_FILE));
  for (const page of pages) {
    const label = `${page.id}/${page.lang}`;
    if (files.has(page.file))
      errors.push(`${label}: duplicate file ${page.file}`);
    files.add(page.file);
    if (allowed404.has(page.file)) {
      if (page.inSitemap)
        errors.push(`${label}: a 404 page cannot be in the sitemap`);
      continue;
    }
    if (paths.has(page.path))
      errors.push(`${label}: duplicate path ${page.path}`);
    paths.add(page.path);
    if (page.path !== '/' && page.path.endsWith('/')) {
      errors.push(`${label}: path ${page.path} has a trailing slash`);
    }
    if (page.file !== marketingFileForPath(page.path)) {
      errors.push(
        `${label}: file ${page.file} must be ${marketingFileForPath(page.path)} for path ${page.path}`
      );
    }
    const arPath = page.path === '/ar' || page.path.startsWith('/ar/');
    if (arPath !== (page.lang === 'ar')) {
      errors.push(
        `${label}: path ${page.path} does not match lang ${page.lang}`
      );
    }
  }
  return errors;
}

export function buildMarketingSite(
  input: BuildMarketingSiteInput
): BuiltMarketingSite {
  const { pages, ctx, assets } = input;
  const warnings: string[] = [];
  const errors = validatePages(pages);
  if (errors.length > 0) {
    throw new Error(`marketing registry is invalid:\n  ${errors.join('\n  ')}`);
  }
  if (pages.length === 0) {
    warnings.push(
      'MARKETING_PAGES is empty: no pages rendered (root files are still written)'
    );
  }
  for (const [lang, file] of Object.entries(MARKETING_404_FILE)) {
    if (pages.length > 0 && !pages.some((page) => page.file === file)) {
      warnings.push(
        `no ${lang} 404 page (${file}): the edge falls back to the app for gone URLs`
      );
    }
  }

  const files: MarketingOutputFile[] = [];
  const resolved: ResolvedPage[] = [];
  const rendered: { entry: ResolvedPage; html: string }[] = [];
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const page of pages) {
    const head: MarketingHead = page.head(ctx);
    const bodyHtml = renderToStaticMarkup(page.render(ctx));
    const html = renderDocument({
      page,
      head,
      ctx,
      assets,
      bodyHtml,
      markdownAlternate:
        page.id === PRICING_PAGE_ID ? `/${PRICING_MD_FILE}` : undefined,
    });
    files.push({ path: page.file, contents: html });
    const entry: ResolvedPage = {
      page,
      title: head.title,
      description: head.description,
      canonicalPath: head.canonicalPath,
      alternates: head.alternates,
      robots: head.robots,
    };
    resolved.push(entry);
    rendered.push({ entry, html });

    if (!isNoindex(head.robots)) {
      const label = `${page.id}/${page.lang}`;
      const sameTitle = titles.get(head.title);
      if (sameTitle)
        warnings.push(`${label}: title is the same as ${sameTitle}'s`);
      titles.set(head.title, label);
      const sameDescription = descriptions.get(head.description);
      if (sameDescription)
        warnings.push(
          `${label}: description is the same as ${sameDescription}'s`
        );
      descriptions.set(head.description, label);
      if (head.canonicalPath !== page.path) {
        warnings.push(
          `${label}: canonical ${head.canonicalPath} is not the page path ${page.path}`
        );
      }
    }
  }

  // B3 — the blog's "temporarily unavailable" page, served by Caddy (503)
  // when the renderer that draws the blog cannot be reached.
  for (const [lang, file] of pages.length > 0
    ? Object.entries(MARKETING_BLOG_UNAVAILABLE_FILE)
    : []) {
    files.push({
      path: file,
      contents: renderBlogUnavailable({
        lang: lang as MarketingLang,
        ctx,
        assets,
      }),
    });
  }

  const langs = sitemapLanguages(resolved);
  for (const lang of langs) {
    files.push({
      path: localeSitemapFile(lang),
      contents: buildLocaleSitemap(lang, resolved, ctx),
    });
  }
  files.push({
    path: SITEMAP_INDEX_FILE,
    contents: buildSitemapIndex(langs, ctx),
  });
  files.push({ path: 'robots.txt', contents: buildRobotsTxt(ctx) });
  files.push({
    path: 'llms.txt',
    contents: buildLlmsTxt({ ctx, pages: resolved, copy: input.llms }),
  });

  const pricingMarkdown = buildPricingMarkdown({
    plans: ctx.plans,
    siteUrl: ctx.siteUrl,
    buildDate: ctx.buildDate,
  });
  files.push({ path: PRICING_MD_FILE, contents: pricingMarkdown });

  const listed = new Set(sitemapPages(resolved));
  files.push({
    path: LLMS_FULL_FILE,
    contents: buildLlmsFullTxt({
      siteUrl: ctx.siteUrl,
      buildDate: ctx.buildDate,
      heading: input.llms?.en?.heading,
      summary: input.llms?.en?.summary,
      pricingMarkdown,
      pages: rendered
        .filter(({ entry }) => listed.has(entry))
        .map(({ entry, html }) => ({
          lang: entry.page.lang,
          canonicalPath: entry.canonicalPath,
          title: entry.title,
          html,
        })),
    }),
  });

  for (const file of files) {
    const leftover = file.contents.match(UNFILLED_TOKEN);
    if (leftover) {
      warnings.push(
        `${file.path}: unfilled copy token(s) ${[...new Set(leftover)].join(', ')}`
      );
    }
  }
  return { files, warnings };
}

/** A `{token}` the copy layer did not fill (JSON-LD braces never look like this). */
const UNFILLED_TOKEN = /\{[a-zA-Z]\w*\}/g;
