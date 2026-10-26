/**
 * The platform host's root files, generated from the page registry — the
 * single source for sitemaps, robots.txt and llms.txt (SPEC §E.5–§E.7).
 * They are written under `dist/marketing/` and served on the apex host only
 * (Caddyfile, `@marketing_root_file`); academy hosts never receive them.
 */
import type {
  MarketingLang,
  MarketingPageDef,
  MarketingRenderContext,
} from '../types';
import { absoluteUrl, isNoindex } from './document';

/** One page as the sitemap and llms.txt see it (its head already resolved). */
export interface ResolvedPage {
  readonly page: MarketingPageDef;
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly alternates?: { readonly en: string; readonly ar: string };
  readonly robots?: string;
}

export const SITEMAP_INDEX_FILE = 'sitemap.xml';
export function localeSitemapFile(lang: MarketingLang): string {
  return `sitemaps/marketing-${lang}.xml`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Pages that belong in a sitemap: listed, and indexable. */
export function sitemapPages(pages: readonly ResolvedPage[]): ResolvedPage[] {
  return pages.filter(
    (entry) => entry.page.inSitemap && !isNoindex(entry.robots)
  );
}

/**
 * hreflang pairs only when both language versions are published and
 * indexable (SPEC §E.2 "Pairing").
 */
function hasCompletePair(
  entry: ResolvedPage,
  listed: ReadonlySet<string>
): entry is ResolvedPage & { alternates: { en: string; ar: string } } {
  return (
    !!entry.alternates &&
    listed.has(entry.alternates.en) &&
    listed.has(entry.alternates.ar)
  );
}

/** `sitemaps/marketing-<lang>.xml`: a compact `<urlset>` (no changefreq/priority). */
export function buildLocaleSitemap(
  lang: MarketingLang,
  pages: readonly ResolvedPage[],
  ctx: Pick<MarketingRenderContext, 'siteUrl' | 'buildDate'>
): string {
  const listed = sitemapPages(pages);
  const listedPaths = new Set(listed.map((entry) => entry.canonicalPath));
  const urls = listed
    .filter((entry) => entry.page.lang === lang)
    .map((entry) => {
      const parts = [
        `<loc>${escapeXml(absoluteUrl(ctx.siteUrl, entry.canonicalPath))}</loc>`,
        `<lastmod>${escapeXml(ctx.buildDate)}</lastmod>`,
      ];
      if (hasCompletePair(entry, listedPaths)) {
        for (const [hreflang, path] of [
          ['en', entry.alternates.en],
          ['ar', entry.alternates.ar],
          ['x-default', entry.alternates.en],
        ] as const) {
          parts.push(
            `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(absoluteUrl(ctx.siteUrl, path))}"/>`
          );
        }
      }
      return `<url>${parts.join('')}</url>`;
    });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    urls.join('') +
    '</urlset>\n'
  );
}

/** Languages that have at least one sitemap URL, in a stable order. */
export function sitemapLanguages(
  pages: readonly ResolvedPage[]
): MarketingLang[] {
  const present = new Set(sitemapPages(pages).map((entry) => entry.page.lang));
  return (['en', 'ar'] as const).filter((lang) => present.has(lang));
}

/**
 * B3 — the blog's sitemap, generated at request time by the `ssr`
 * container from the published posts (`server/ssr/blog.mjs`), so a post
 * published from the dashboard is listed without a deploy.
 */
export const BLOG_SITEMAP_FILE = 'sitemaps/blog.xml';

/**
 * `sitemap.xml`: a `<sitemapindex>` of the locale sitemaps (SPEC §E.5) and
 * the blog's dynamic sitemap (no `lastmod`: it changes without a build).
 */
export function buildSitemapIndex(
  langs: readonly MarketingLang[],
  ctx: Pick<MarketingRenderContext, 'siteUrl' | 'buildDate'>,
  dynamicSitemaps: readonly string[] = [BLOG_SITEMAP_FILE]
): string {
  const entries = [
    ...langs.map(
      (lang) =>
        `<sitemap><loc>${escapeXml(absoluteUrl(ctx.siteUrl, `/${localeSitemapFile(lang)}`))}</loc><lastmod>${escapeXml(ctx.buildDate)}</lastmod></sitemap>`
    ),
    ...dynamicSitemaps.map(
      (file) => `<sitemap><loc>${escapeXml(absoluteUrl(ctx.siteUrl, `/${file}`))}</loc></sitemap>`
    ),
  ];
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    entries.join('') +
    '</sitemapindex>\n'
  );
}

/** Search and answer crawlers: allowed (SPEC §E.6, OQ-34; GEO). */
export const ROBOTS_SEARCH_BOTS = [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'PerplexityBot',
  'Claude-SearchBot',
  'Applebot',
] as const;
/** Fetchers acting for a person who asked an assistant about a page: allowed. */
export const ROBOTS_USER_FETCHERS = [
  'ChatGPT-User',
  'Claude-User',
  'Perplexity-User',
] as const;
/** Model-training crawlers: disallowed (reversible). */
export const ROBOTS_TRAINING_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'Applebot-Extended',
] as const;

/**
 * `robots.txt` for the platform host (SPEC §E.6 + GEO). Purpose-specific
 * groups; app paths are NOT disallowed (their `X-Robots-Tag: noindex` must
 * stay readable).
 */
export function buildRobotsTxt(
  ctx: Pick<MarketingRenderContext, 'siteUrl'>
): string {
  const host = ctx.siteUrl.replace(/\/+$/, '');
  return [
    `# ${host}/robots.txt — platform marketing host only. Generated from the page registry.`,
    '# Policy: search engines, AI answer engines and fetches a person asks an',
    '# assistant to make are allowed; crawling to train models is not.',
    '',
    '# Search and answer engines',
    ...ROBOTS_SEARCH_BOTS.map((bot) => `User-agent: ${bot}`),
    'Allow: /',
    '',
    '# User-triggered fetchers (an assistant reading a page for a person)',
    ...ROBOTS_USER_FETCHERS.map((bot) => `User-agent: ${bot}`),
    'Allow: /',
    '',
    '# Model-training crawlers',
    ...ROBOTS_TRAINING_BOTS.map((bot) => `User-agent: ${bot}`),
    'Disallow: /',
    '',
    'User-agent: Google-Extended',
    'Disallow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl(ctx.siteUrl, `/${SITEMAP_INDEX_FILE}`)}`,
    '',
  ].join('\n');
}

/**
 * The llms.txt copy of one language (`content/<lang>.ts` → `llms`, shape
 * `MkLlms` in `content/content.types.ts`). Structural, so this module does
 * not depend on the content package being present.
 */
export interface LlmsCopy {
  readonly heading: string;
  readonly summary: string;
  readonly details: string;
  readonly pagesTitle: string;
  /** One-line note per page id (`home`, `pricing`, …). */
  readonly pageNotes: Readonly<Partial<Record<string, string>>>;
  readonly pricingFileNote: string;
  readonly crawlerPolicy: string;
}

/** The AI-crawler statement used when no copy is provided; matches robots.txt. */
export const LLMS_CRAWLER_POLICY =
  'Search and answer engines (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot, Claude-SearchBot, Applebot) and user-triggered fetchers (ChatGPT-User, Claude-User, Perplexity-User) may read this site. Model-training crawlers (GPTBot, ClaudeBot, CCBot, Applebot-Extended, Google-Extended) are disallowed in robots.txt.';

const FALLBACK_LLMS: LlmsCopy = {
  heading: 'Atlas',
  summary:
    'Atlas is a branded academy platform for Egyptian teachers who sell lessons online. Each teacher gets an academy website under their own name, where students pay and are enrolled after the teacher approves the payment.',
  details: '',
  pagesTitle: 'Pages',
  pageNotes: {},
  pricingFileNote:
    'Plans, prices, trial terms and limits, generated from the live catalog.',
  crawlerPolicy: LLMS_CRAWLER_POLICY,
};

export const LLMS_FULL_FILE = 'llms-full.txt';
export const PRICING_MD_FILE = 'pricing.md';

/**
 * `llms.txt` (SPEC §E.7): H1 brand, the summary (EN, then AR), the EN
 * details, the published pages per language with a one-line note, links to
 * `/pricing.md` and `/llms-full.txt`, and the crawler policy. Only listed,
 * indexable pages appear — never a 404 or a planned URL.
 */
export function buildLlmsTxt(input: {
  readonly ctx: Pick<MarketingRenderContext, 'siteUrl'>;
  readonly pages: readonly ResolvedPage[];
  readonly copy?: Partial<Record<MarketingLang, LlmsCopy>>;
}): string {
  const { ctx } = input;
  const pages = sitemapPages(input.pages);
  const en = input.copy?.en ?? FALLBACK_LLMS;
  const ar = input.copy?.ar;
  const url = (path: string) => absoluteUrl(ctx.siteUrl, path);

  const section = (
    lang: MarketingLang,
    copy: LlmsCopy | undefined
  ): string[] => {
    const entries = pages.filter((entry) => entry.page.lang === lang);
    if (entries.length === 0) return [];
    const title =
      copy?.pagesTitle ??
      (lang === 'ar' ? 'الصفحات' : FALLBACK_LLMS.pagesTitle);
    return [
      `## ${title}`,
      '',
      ...entries.map((entry) => {
        const note = copy?.pageNotes[entry.page.id] ?? entry.description;
        return `- [${entry.title}](${url(entry.canonicalPath)}): ${oneLine(note)}`;
      }),
      '',
    ];
  };

  return [
    `# ${oneLine(en.heading)}`,
    '',
    `> ${oneLine(en.summary)}`,
    ...(ar ? ['', `> ${oneLine(ar.summary)}`] : []),
    '',
    ...(en.details.trim() ? [en.details.trim(), ''] : []),
    ...section('en', input.copy?.en),
    ...section('ar', ar),
    '## Files',
    '',
    `- [Pricing (Markdown)](${url(`/${PRICING_MD_FILE}`)}): ${oneLine(en.pricingFileNote)}`,
    `- [Full text](${url(`/${LLMS_FULL_FILE}`)}): The text of every page listed above, English then Arabic, followed by the pricing file.`,
    '',
    '## Crawlers',
    '',
    oneLine(en.crawlerPolicy),
    '',
  ].join('\n');
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
