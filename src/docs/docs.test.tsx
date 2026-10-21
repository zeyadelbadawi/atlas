/**
 * Help center (DL-57): parsing, rendering conventions, search, content rules
 * and the whole build over the real content/docs/ tree.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import plansSnapshot from '@/marketing/data/plans.snapshot.json';
import type { Plan } from '@/types/plan.types';
import { loadArticles, loadShots, loadShotSpecs } from './content/load';
import { articlePath, parseArticle } from './content/parse';
import { validateDocs } from './content/validate';
import { buildDocsSite } from './prerender/site';
import { renderArticleBody, headingSlug } from './render/markdown';
import { normalizeText, tokenize } from './search/normalize';
import { buildSearchIndex, searchIndex } from './search/index-build';
import type { DocArticle, DocShot } from './types';

const FM = (over: Record<string, string> = {}) =>
  [
    '---',
    `id: ${over.id ?? 'DOC-COM-002'}`,
    `title: ${over.title ?? 'Set up payment methods'}`,
    'description: Add bank transfer, e-wallet or InstaPay details so learners can pay for courses.',
    'summary: The organization owner adds bank, e-wallet or InstaPay details per academy and turns each method on, and learners see them at checkout.',
    `type: ${over.type ?? 'setup-config'}`,
    'audience: [owner]',
    'order: 2',
    'priority: P0',
    'related: [DOC-COM-001]',
    'keywords: [instapay]',
    'updated: 2026-10-20',
    '---',
    '',
  ].join('\n');

function article(lang: 'en' | 'ar', body: string, over: Record<string, string> = {}): DocArticle {
  return parseArticle(`content/docs/${lang}/selling/payment-methods.md`, FM(over) + body);
}

const shot = (key: string): DocShot => ({
  key,
  width: 1440,
  height: 900,
  files: [
    { src: `media/en/${key}-960.webp`, width: 960 },
    { src: `media/en/${key}-1440.webp`, width: 1440 },
  ],
});

function ctxWith(articles: DocArticle[], shots: DocShot[] = []) {
  const byId = new Map<string, Partial<Record<'en' | 'ar', DocArticle>>>();
  for (const a of articles) byId.set(a.id, { ...byId.get(a.id), [a.lang]: a });
  const map = new Map(shots.map((s) => [s.key, s]));
  return { byId, siteUrl: 'https://atlass.dpdns.org', appUrl: 'https://dashboard.atlass.dpdns.org', shots: { en: map, ar: map } };
}

describe('parseArticle', () => {
  it('maps the path to language, category and slug, and types the front matter', () => {
    const a = article('ar', 'نص.');
    expect(a).toMatchObject({ lang: 'ar', category: 'selling', slug: 'payment-methods', id: 'DOC-COM-002', audience: ['owner'] });
    expect(articlePath(a)).toBe('/ar/selling/payment-methods');
  });

  it('maps index.md to the home page and _index.md to the category page', () => {
    const home = parseArticle('content/docs/en/index.md', FM({ id: 'DOC-HOME-001', type: 'hub' }) + 'x');
    expect(articlePath(home)).toBe('/');
    const hub = parseArticle('content/docs/ar/tasks/_index.md', FM({ id: 'DOC-TASK-000', type: 'hub' }) + 'x');
    expect(articlePath(hub)).toBe('/ar/tasks');
  });

  it('refuses bad paths and bad front matter with the file name', () => {
    expect(() => parseArticle('content/docs/en/Selling/Payment.md', FM())).toThrow(/content\/docs/);
    expect(() => parseArticle('content/docs/en/selling/x.md', FM({ type: 'novel' }))).toThrow(/x\.md: type/);
    expect(() => parseArticle('content/docs/en/selling/x.md', 'no front matter')).toThrow(/front matter/);
  });
});

describe('renderArticleBody', () => {
  const body = [
    '## Add an InstaPay address',
    '',
    '1. Open **Payment methods**.',
    '',
    '   ![The Payment methods page](shot:selling/payment-methods)',
    '',
    '2. Choose **Set up**.',
    '',
    '> [!LIMITATION]',
    '> Atlas does not check that a transfer arrived.',
    '',
    'See [how selling works](doc:DOC-COM-001) and [sign in](app:/auth/sign-in). Trial: {trialDays} days. Read the [terms](site:/terms).',
    '',
    '<script>alert(1)</script>',
  ].join('\n');

  it('renders step cards, screenshots, callouts and resolved links', () => {
    const en = article('en', body);
    const sibling = parseArticle('content/docs/en/selling/overview.md', FM({ id: 'DOC-COM-001', type: 'feature-explanation' }) + 'x');
    const r = renderArticleBody(en, ctxWith([en, sibling], [shot('selling/payment-methods')]), { trialDays: '14' });
    const html = renderToStaticMarkup(<>{r.element}</>);
    expect(html).toContain('<ol start="1" class="doc-steps">');
    expect(html).toMatch(/<figure class="doc-shot"><a class="doc-shot-frame" href="\/media\/en\/selling\/payment-methods-1440\.webp"><img src="\/media\/en\/selling\/payment-methods-960\.webp" srcSet="[^"]+" sizes="[^"]+" width="1440" height="900" alt="The Payment methods page" loading="eager"/);
    expect(html).toContain('Demo content');
    expect(html).toContain('doc-callout-limitation');
    expect(html).toContain('What this does not do');
    expect(html).toContain('href="/selling/overview"');
    // DL-63: app: links go to the dashboard host, site: links to the marketing apex.
    expect(html).toContain('href="https://dashboard.atlass.dpdns.org/auth/sign-in"');
    expect(html).not.toContain('href="https://atlass.dpdns.org/auth/');
    expect(html).toContain('href="https://atlass.dpdns.org/terms"');
    expect(html).toContain('Trial: 14 days');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
    expect(r.headings).toEqual([{ id: 'add-an-instapay-address', text: 'Add an InstaPay address' }]);
    expect(r.steps).toBe(2);
    expect(r.stepsWithoutShot).toEqual([2]);
    expect(r.problems).toEqual([]);
  });

  it('reports broken links, missing screenshots, unknown tokens and an h1', () => {
    const en = article('en', '# Title again\n\n1. Do it.\n\n   ![x](shot:selling/nope)\n\n[x](doc:DOC-NOPE-001) {mystery}');
    const r = renderArticleBody(en, ctxWith([en]), {});
    expect(r.problems).toEqual(
      expect.arrayContaining([
        'unknown token {mystery}',
        'use ## for sections; the title is the only h1',
        'missing screenshot shot:selling/nope (en)',
        'unresolved link doc:DOC-NOPE-001',
      ]),
    );
  });

  it('localises site: links but not app: links in Arabic', () => {
    const ar = article('ar', '[الدخول](app:/auth/sign-in) و[الشروط](site:/terms).');
    const html = renderToStaticMarkup(<>{renderArticleBody(ar, ctxWith([ar]), {}).element}</>);
    expect(html).toContain('href="https://dashboard.atlass.dpdns.org/auth/sign-in"');
    expect(html).toContain('href="https://atlass.dpdns.org/ar/terms"');
  });

  it('keeps Arabic heading ids', () => {
    expect(headingSlug('أضف عنوان إنستاباي')).toBe('أضف-عنوان-إنستاباي');
  });
});

describe('search', () => {
  it('folds Arabic letter forms, diacritics and digits', () => {
    expect(normalizeText('إثباتُ الدفعِ ١٤')).toBe('اثبات الدفع 14');
    expect(normalizeText('مدرسة')).toBe('مدرسه');
    expect(tokenize('الدورات المجانية')).toEqual(expect.arrayContaining(['الدورات', 'دورات']));
  });

  it('finds articles by title, prefix and Arabic variants', () => {
    const index = buildSearchIndex([
      { url: '/a', title: 'Review payment proofs', category: 'Selling', summary: 'Approve or reject.', keywords: ['receipt'], headings: [], body: '' },
      { url: '/b', title: 'Connect your own domain', category: 'Academy', summary: 'DNS records.', keywords: [], headings: [], body: 'payment is not needed' },
      { url: '/ar/a', title: 'مراجعة إثباتات الدفع', category: 'البيع', summary: 'وافق أو ارفض.', keywords: [], headings: [], body: '' },
    ]);
    expect(searchIndex(index, 'payment proo').map((h) => h.url)).toEqual(['/a']);
    expect(searchIndex(index, 'payment')[0].url).toBe('/a');
    expect(searchIndex(index, 'اثبات').map((h) => h.url)).toEqual(['/ar/a']);
    expect(searchIndex(index, 'zzz')).toEqual([]);
  });
});

describe('validateDocs', () => {
  it('requires the Arabic pair, known related ids, a shot per how-to step and clean wording', () => {
    const en = article('en', '1. Open it.\n\nWe offer a free trial.');
    const r = renderArticleBody(en, ctxWith([en]), {});
    const result = validateDocs({
      articles: [en],
      reports: [{ article: en, problems: r.problems, shotKeys: r.shotKeys, stepsWithoutShot: r.stepsWithoutShot, text: r.text }],
      specFiles: {},
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('has no Arabic version'),
        expect.stringContaining('step 1 has no screenshot'),
        expect.stringContaining('"free trial"'),
      ]),
    );
  });
});

describe('the help center build (real content)', () => {
  const articles = loadArticles();
  const result = buildDocsSite({
    articles,
    shots: loadShots(),
    specFiles: loadShotSpecs(),
    plans: plansSnapshot as unknown as Plan[],
    docsUrl: 'https://docs.atlass.dpdns.org',
    siteUrl: 'https://atlass.dpdns.org',
    buildDate: '2026-10-20',
    assets: {
      stylesheets: ['/assets/docs.css'],
      moduleScripts: ['/assets/docs.js'],
      modulePreloads: [],
      themeScript: '/assets/docs-theme.js',
      fontPreloads: { en: [], ar: [] },
    },
    // Writers check drafts before their screenshots exist:
    // DOCS_ALLOW_MISSING_SHOTS=1 npx vitest run src/docs (never in CI).
    requireShots: process.env.DOCS_ALLOW_MISSING_SHOTS !== '1',
  });
  const file = (path: string) => result.files.find((f) => f.path === path)?.contents ?? '';

  it('passes every content rule', () => {
    // A writer may narrow the report to their categories while others draft:
    // DOCS_ONLY=selling,billing (never in CI).
    const only = (process.env.DOCS_ONLY ?? '').split(',').filter(Boolean);
    const errors = only.length === 0 ? result.errors : result.errors.filter((e) => only.some((c) => e.includes(`${c}/`)));
    expect(errors).toEqual([]);
  });

  it('writes home, category, search and 404 pages in both languages', () => {
    for (const path of ['index.html', 'ar/index.html', 'selling/index.html', 'ar/selling/index.html', 'search/index.html', 'ar/search/index.html', '404.html', 'ar/404.html']) {
      expect(file(path), path).toContain('<!doctype html>');
    }
    expect(file('ar/index.html')).toContain('<html lang="ar" dir="rtl">');
    expect(file('search/index.html')).toContain('<meta name="robots" content="noindex, follow">');
    expect(file('404.html')).not.toContain('rel="canonical"');
  });

  it('links every indexable page to its other language and lists it in the sitemap', () => {
    const home = file('index.html');
    expect(home).toContain('<link rel="canonical" href="https://docs.atlass.dpdns.org/">');
    expect(home).toContain('hreflang="ar" href="https://docs.atlass.dpdns.org/ar"');
    expect(file('sitemaps/docs-ar.xml')).toContain('<loc>https://docs.atlass.dpdns.org/ar/selling</loc>');
    expect(file('sitemap.xml')).toContain('https://docs.atlass.dpdns.org/sitemaps/docs-en.xml');
    expect(file('robots.txt')).toContain('Sitemap: https://docs.atlass.dpdns.org/sitemap.xml');
  });

  it('runs no inline script: only same-origin files and JSON-LD data', () => {
    for (const f of result.files.filter((x) => x.path.endsWith('.html') && !x.path.includes('go/'))) {
      for (const tag of f.contents.match(/<script[^>]*>/g) ?? []) {
        expect(tag, f.path).toMatch(/^<script (src="\/assets\/[^"]+"|type="module" src="\/assets\/[^"]+"|type="application\/ld\+json")>$/);
      }
      expect(f.contents, f.path).not.toMatch(/ on[a-z]+="/);
      expect(f.contents, f.path).not.toMatch(/style="/);
    }
  });

  it('points the header account button at the dashboard host (DL-63), footer links at the apex', () => {
    const en = file('index.html');
    expect(en.match(/<a [^>]*data-auth-cta=/g)).toHaveLength(2); // desktop + drawer
    expect(en).toContain('href="https://dashboard.atlass.dpdns.org/auth/sign-in"');
    expect(en).toContain('data-href-signed-in="https://dashboard.atlass.dpdns.org/dashboard"');
    expect(en).toContain('data-label-signed-in="Open dashboard"');
    expect(en).toContain('data-text-signed-in="Opening your dashboard…"');
    expect(en).toContain('role="status" aria-live="polite"');
    expect(en).not.toContain('href="https://atlass.dpdns.org/auth/');
    expect(en).toContain('href="https://atlass.dpdns.org/pricing"');
    const ar = file('ar/index.html');
    expect(ar).toContain('href="https://dashboard.atlass.dpdns.org/auth/sign-in?lang=ar"');
    expect(ar).toContain('data-label-signed-in="افتح لوحة التحكم"');
    expect(ar).toContain('data-text-signed-out="بنفتحلك صفحة الدخول…"');
    expect(ar).toContain('href="https://atlass.dpdns.org/ar/terms"');
  });

  it('builds a search index per language and in-app /go links', () => {
    expect(JSON.parse(file('search-index.en.json'))).toMatchObject({ v: 1 });
    expect(JSON.parse(file('search-index.ar.json'))).toMatchObject({ v: 1 });
    expect(file('go/doc-home-001/index.html')).toContain('content="0; url=/"');
    expect(file('ar/go/doc-home-001/index.html')).toContain('content="0; url=/ar"');
  });
});
