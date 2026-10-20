/**
 * Builds the whole help center as files (DL-57): every page in both
 * languages, the search indexes, sitemaps, robots.txt, llms.txt and the
 * in-app `/go/<PAGE-ID>` links. Pure (inputs in, files out) so tests run it
 * directly; `scripts/docs/prerender.mjs` writes the result to `dist/docs/`.
 */
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Plan } from '@/types/plan.types';
import { catalogTrialDays, formatNumber, trialDaysPhrase } from '@/marketing/lib/site';
import { escapeHtml } from '@/marketing/prerender/document';
import { DOC_CATEGORIES, categoryById } from '../categories';
import { DOCS_COPY } from '../copy';
import { HOME_CATEGORY, INDEX_SLUG, articlePath, categoryPath, localDocsPath } from '../content/parse';
import { validateDocs, type RenderReport } from '../content/validate';
import { renderArticleBody } from '../render/markdown';
import { buildSearchIndex, type SearchSource } from '../search/index-build';
import { DOC_LANGS, type DocArticle, type DocLang, type DocShot, type DocsRenderContext } from '../types';
import { ArticlePage, CategoryPage, HomePage, NotFoundPage, SearchPage, type PageEnv } from '../pages/pages';
import { renderDocsDocument, type DocsAssets, type DocsHead } from './document';

export interface DocsFile {
  readonly path: string;
  readonly contents: string;
}

export interface DocsBuildInput {
  readonly articles: readonly DocArticle[];
  readonly shots: Readonly<Record<DocLang, ReadonlyMap<string, DocShot>>>;
  readonly specFiles: Record<string, string>;
  readonly plans: readonly Plan[];
  /** `https://docs.atlass.dpdns.org` */
  readonly docsUrl: string;
  /** `https://atlass.dpdns.org` */
  readonly siteUrl: string;
  readonly buildDate: string;
  readonly assets: DocsAssets;
  readonly requireComplete?: boolean;
  readonly requireShots?: boolean;
}

export interface DocsBuildResult {
  readonly files: readonly DocsFile[];
  readonly errors: readonly string[];
  readonly missing: readonly string[];
  readonly pages: number;
}

const OG_IMAGE: Record<DocLang, string> = { en: '/og-docs-en.jpg', ar: '/og-docs-ar.jpg' };
const POPULAR_LIMIT = 6;

function organization(siteUrl: string) {
  return { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'Atlas', url: `${siteUrl}/` };
}

/** `{trialDays}` / `{trialDuration}` from the live catalog, per language. */
export function catalogDocTokens(plans: readonly Plan[], lang: DocLang): Record<string, string> {
  const days = catalogTrialDays(plans);
  if (days === undefined) return {};
  return {
    trialDays: formatNumber(lang, days),
    trialDuration: lang === 'en' ? `${days} days` : trialDaysPhrase('ar', days),
  };
}

function render(element: ReactElement): string {
  return renderToStaticMarkup(element);
}

function pageFile(path: string): string {
  if (path === '/') return 'index.html';
  return `${path.replace(/^\//, '')}/index.html`;
}

function byOrder(a: DocArticle, b: DocArticle): number {
  return a.order - b.order || a.title.localeCompare(b.title);
}

export function buildDocsSite(input: DocsBuildInput): DocsBuildResult {
  const { articles, docsUrl, siteUrl, assets } = input;
  const files: DocsFile[] = [];
  const reports: RenderReport[] = [];
  const buildYear = Number(input.buildDate.slice(0, 4));

  const byId = new Map<string, Partial<Record<DocLang, DocArticle>>>();
  for (const a of articles) byId.set(a.id, { ...byId.get(a.id), [a.lang]: a });
  const ctx: DocsRenderContext = {
    plans: input.plans,
    docsUrl,
    siteUrl,
    buildDate: input.buildDate,
    shots: input.shots,
    byId,
  };
  const abs = (path: string) => `${docsUrl}${path === '/' ? '/' : path}`;
  const sitemap: Record<DocLang, { loc: string; alt?: { en: string; ar: string }; lastmod: string }[]> = { en: [], ar: [] };
  let pages = 0;

  for (const lang of DOC_LANGS) {
    const copy = DOCS_COPY[lang];
    const tokens = catalogDocTokens(input.plans, lang);
    const inLang = articles.filter((a) => a.lang === lang);
    const regular = inLang.filter((a) => a.category !== HOME_CATEGORY && a.slug !== INDEX_SLUG);
    const nav = new Map<string, DocArticle[]>();
    for (const category of DOC_CATEGORIES) {
      nav.set(category.id, regular.filter((a) => a.category === category.id).sort(byOrder));
    }
    const env: PageEnv = { lang, siteUrl, docsUrl, nav, buildYear };
    const popular = regular
      .filter((a) => a.priority === 'P0' && a.type !== 'hub')
      .sort((a, b) => (categoryById(a.category)?.order ?? 99) - (categoryById(b.category)?.order ?? 99) || byOrder(a, b))
      .slice(0, POPULAR_LIMIT);
    const searchSources: SearchSource[] = [];
    const other: DocLang = lang === 'en' ? 'ar' : 'en';
    const pair = (id: string) => byId.get(id)?.[other];

    const emit = (path: string, head: DocsHead, body: string, page: string, inSitemap: boolean, lastmod = input.buildDate, alt?: { en: string; ar: string }) => {
      files.push({ path: pageFile(path), contents: renderDocsDocument({ lang, head, assets, bodyHtml: body, page }) });
      pages += 1;
      if (inSitemap) sitemap[lang].push({ loc: abs(path), alt, lastmod });
    };
    const alternates = (enPath: string, arPath: string) => ({ en: abs(enPath), ar: abs(arPath) });
    const breadcrumbs = (items: { name: string; path: string }[]) => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path) })),
    });

    // Articles (and category intros).
    const rendered = new Map<string, ReturnType<typeof renderArticleBody>>();
    for (const article of inLang) {
      const r = renderArticleBody(article, ctx, tokens);
      rendered.set(article.id, r);
      reports.push({
        article,
        problems: r.problems,
        shotKeys: r.shotKeys,
        stepsWithoutShot: r.stepsWithoutShot,
        text: `${article.title} ${article.summary} ${article.description} ${r.text}`,
      });
    }

    for (const article of regular) {
      const r = rendered.get(article.id)!;
      const path = articlePath(article);
      const twin = pair(article.id);
      const category = categoryById(article.category)!;
      const siblings = nav.get(article.category)!;
      const index = siblings.indexOf(article);
      const related = article.related.map((id) => byId.get(id)?.[lang]).filter((a): a is DocArticle => Boolean(a) && a!.category !== HOME_CATEGORY);
      const alt = twin ? alternates(lang === 'en' ? path : articlePath(twin), lang === 'en' ? articlePath(twin) : path) : undefined;
      const head: DocsHead = {
        title: `${article.title} | ${copy.brand}`,
        description: article.description,
        canonical: abs(path),
        alternates: alt,
        ogImage: abs(OG_IMAGE[lang]),
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: article.title,
            description: article.description,
            abstract: article.summary,
            inLanguage: lang,
            dateModified: article.updated,
            url: abs(path),
            author: organization(siteUrl),
            publisher: organization(siteUrl),
            isPartOf: { '@type': 'WebSite', '@id': `${docsUrl}/#website`, name: copy.brand, url: abs(localDocsPath(lang, '/')) },
            about: { '@type': 'SoftwareApplication', name: 'Atlas', applicationCategory: 'EducationalApplication' },
          },
          breadcrumbs([
            { name: copy.nav.home, path: localDocsPath(lang, '/') },
            { name: category.title[lang], path: categoryPath(lang, category.id) },
            { name: article.title, path },
          ]),
        ],
      };
      const body = render(
        createElement(ArticlePage, {
          lang,
          env,
          article,
          body: r.element,
          headings: r.headings,
          steps: HOW_TO.has(article.type) ? r.steps : 0,
          related,
          previous: siblings[index - 1],
          next: siblings[index + 1],
          altPath: twin ? articlePath(twin) : localDocsPath(other, '/'),
        }),
      );
      emit(path, head, body, 'docs:article', true, article.updated, alt);
      searchSources.push({
        url: path,
        title: article.title,
        category: category.title[lang],
        summary: article.summary,
        keywords: article.keywords,
        headings: r.headings.map((h) => h.text),
        body: r.text,
      });
    }

    // Category pages.
    for (const category of DOC_CATEGORIES) {
      const path = categoryPath(lang, category.id);
      const introArticle = inLang.find((a) => a.category === category.id && a.slug === INDEX_SLUG);
      const intro = introArticle ? rendered.get(introArticle.id)!.element : undefined;
      const head: DocsHead = {
        title: `${introArticle?.title ?? category.title[lang]} | ${copy.brand}`,
        description: introArticle?.description ?? category.description[lang],
        canonical: abs(path),
        alternates: alternates(categoryPath('en', category.id), categoryPath('ar', category.id)),
        ogImage: abs(OG_IMAGE[lang]),
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: category.title[lang],
            description: category.description[lang],
            inLanguage: lang,
            url: abs(path),
            isPartOf: { '@id': `${docsUrl}/#website` },
            publisher: organization(siteUrl),
          },
          breadcrumbs([
            { name: copy.nav.home, path: localDocsPath(lang, '/') },
            { name: category.title[lang], path },
          ]),
        ],
      };
      const body = render(createElement(CategoryPage, { lang, env, categoryId: category.id, articles: nav.get(category.id)!, intro, introArticle }));
      emit(path, head, body, 'docs:category', true, input.buildDate, head.alternates);
      if (introArticle) {
        searchSources.push({
          url: path,
          title: introArticle.title,
          category: category.title[lang],
          summary: introArticle.summary,
          keywords: introArticle.keywords,
          headings: rendered.get(introArticle.id)!.headings.map((h) => h.text),
          body: rendered.get(introArticle.id)!.text,
        });
      }
    }

    // Home.
    {
      const homeArticle = inLang.find((a) => a.category === HOME_CATEGORY);
      const path = localDocsPath(lang, '/');
      const head: DocsHead = {
        title: homeArticle?.title ?? copy.homeTitle,
        description: homeArticle?.description ?? copy.homeDescription,
        canonical: abs(path),
        alternates: alternates('/', '/ar'),
        ogImage: abs(OG_IMAGE[lang]),
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${docsUrl}/#website`,
            name: copy.brand,
            url: abs(path),
            inLanguage: lang,
            publisher: organization(siteUrl),
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: `${abs(localDocsPath(lang, '/search'))}?q={search_term_string}` },
              'query-input': 'required name=search_term_string',
            },
          },
        ],
      };
      const intro = homeArticle ? rendered.get(homeArticle.id)!.element : undefined;
      emit(path, head, render(createElement(HomePage, { lang, env, intro, popular })), 'docs:home', true, input.buildDate, head.alternates);
    }

    // Search and 404 (noindex, not in the sitemap).
    emit(
      localDocsPath(lang, '/search'),
      { title: `${copy.search.resultsTitle} | ${copy.brand}`, description: copy.homeDescription, robots: 'noindex, follow', ogImage: abs(OG_IMAGE[lang]) },
      render(createElement(SearchPage, { lang, env, popular })),
      'docs:search',
      false,
    );
    files.push({
      path: lang === 'en' ? '404.html' : 'ar/404.html',
      contents: renderDocsDocument({
        lang,
        head: { title: `${copy.notFound.title} | ${copy.brand}`, description: copy.notFound.body, robots: 'noindex, follow', ogImage: abs(OG_IMAGE[lang]) },
        assets,
        bodyHtml: render(createElement(NotFoundPage, { lang, env, popular })),
        page: 'docs:404',
      }),
    });

    // In-app links: /go/<PAGE-ID> (and /ar/go/…) forward to the article.
    for (const article of inLang) {
      const target = articlePath(article);
      const go = `${lang === 'ar' ? '/ar' : ''}/go/${article.id.toLowerCase()}`;
      files.push({
        path: pageFile(go),
        contents: [
          '<!doctype html>',
          `<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">`,
          '<meta name="robots" content="noindex">',
          `<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">`,
          `<link rel="canonical" href="${escapeHtml(abs(target))}">`,
          `<title>${escapeHtml(article.title)}</title></head>`,
          `<body><p><a href="${escapeHtml(target)}">${escapeHtml(article.title)}</a></p></body></html>`,
          '',
        ].join('\n'),
      });
    }

    files.push({ path: `search-index.${lang}.json`, contents: JSON.stringify(buildSearchIndex(searchSources)) });
  }

  // Sitemaps, robots, llms.txt.
  const urlset = (entries: (typeof sitemap)['en']) =>
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    entries
      .map(
        (e) =>
          `<url><loc>${escapeHtml(e.loc)}</loc><lastmod>${e.lastmod}</lastmod>` +
          (e.alt
            ? `<xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(e.alt.en)}"/><xhtml:link rel="alternate" hreflang="ar" href="${escapeHtml(e.alt.ar)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(e.alt.en)}"/>`
            : '') +
          '</url>',
      )
      .join('') +
    '</urlset>\n';
  for (const lang of DOC_LANGS) files.push({ path: `sitemaps/docs-${lang}.xml`, contents: urlset(sitemap[lang]) });
  files.push({
    path: 'sitemap.xml',
    contents:
      '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      DOC_LANGS.map((lang) => `<sitemap><loc>${docsUrl}/sitemaps/docs-${lang}.xml</loc><lastmod>${input.buildDate}</lastmod></sitemap>`).join('') +
      '</sitemapindex>\n',
  });
  files.push({ path: 'robots.txt', contents: docsRobotsTxt(docsUrl) });
  files.push({ path: 'llms.txt', contents: docsLlmsTxt(articles, docsUrl, siteUrl) });

  const validation = validateDocs({
    articles,
    reports,
    specFiles: input.specFiles,
    requireComplete: input.requireComplete,
    requireShots: input.requireShots,
  });
  return { files, errors: validation.errors, missing: validation.missing, pages };
}

const HOW_TO = new Set(['step-by-step', 'setup-config', 'workflow']);

/** Same crawler policy as the marketing host (search/answer engines and user fetchers allowed; training disallowed). */
export function docsRobotsTxt(docsUrl: string): string {
  return [
    `# ${docsUrl}/robots.txt — Atlas Help Center. Generated by the docs build.`,
    '',
    'User-agent: Googlebot',
    'User-agent: Bingbot',
    'User-agent: OAI-SearchBot',
    'User-agent: PerplexityBot',
    'User-agent: Claude-SearchBot',
    'User-agent: Applebot',
    'Allow: /',
    'Disallow: /search',
    'Disallow: /ar/search',
    '',
    'User-agent: ChatGPT-User',
    'User-agent: Claude-User',
    'User-agent: Perplexity-User',
    'Allow: /',
    '',
    'User-agent: GPTBot',
    'User-agent: ClaudeBot',
    'User-agent: CCBot',
    'User-agent: Applebot-Extended',
    'Disallow: /',
    '',
    'User-agent: Google-Extended',
    'Disallow: /',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /search',
    'Disallow: /ar/search',
    '',
    `Sitemap: ${docsUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

export function docsLlmsTxt(articles: readonly DocArticle[], docsUrl: string, siteUrl: string): string {
  const lines = [
    '# Atlas Help Center',
    '',
    `> Step-by-step help for Atlas (${siteUrl}), the platform Egyptian teachers use to run their own online academy: courses, quizzes, a website, learner payments by bank transfer, e-wallet or InstaPay, and teams. Every article exists in English and Arabic (/ar/…).`,
    '',
  ];
  for (const category of DOC_CATEGORIES) {
    const list = articles
      .filter((a) => a.lang === 'en' && a.category === category.id && a.slug !== INDEX_SLUG)
      .sort(byOrder);
    if (list.length === 0) continue;
    lines.push(`## ${category.title.en}`, '');
    for (const a of list) lines.push(`- [${a.title}](${docsUrl}${articlePath(a)}): ${a.description}`);
    lines.push('');
  }
  return lines.join('\n');
}
