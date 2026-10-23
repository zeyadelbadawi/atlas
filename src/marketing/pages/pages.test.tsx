/**
 * Renders every registered marketing page against the catalog snapshot and
 * checks the SPEC acceptance rules that hold for all of them: one H1, no
 * unfilled copy tokens, catalog prices on the page, the banned-strings list
 * (SPEC §A.10), required disclosures, and FAQPage JSON-LD that matches the
 * visible text (GEO: answer engines quote the same words people read).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Plan } from '@/types/plan.types';
import snapshot from '../data/plans.snapshot.json';
import { MARKETING_PAGES } from '../registry';
import { DOC_CATEGORIES } from '@/docs/categories';
import inventory from '@/docs/inventory.json';
import { formatPrice } from '../lib/site';
import type { MarketingRenderContext } from '../types';

const plans = snapshot as unknown as Plan[];
const ctx: MarketingRenderContext = { plans, siteUrl: 'https://atlass.dpdns.org', buildDate: '2026-10-20' };

const rendered = MARKETING_PAGES.map((page) => ({
  page,
  html: renderToStaticMarkup(page.render(ctx)),
  head: page.head(ctx),
}));

/** Visible text only: tags and attribute values stripped. */
function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

const norm = (value: string) => value.replace(/\s+/g, ' ');

/** SPEC §A.10. Legal documents are counsel-owned text and are excluded. */
const BANNED: readonly RegExp[] = [
  /\bfree\b/i,
  /مجان/,
  /ببلاش/,
  /\bUSD\b/,
  /\bpremium\b/i,
  /\bDRM\b(?! )/, // "no DRM" statements live only on legal pages
  /prevents recording|blocks screen recording|cannot be recorded|leak-proof|impossible to leak/i,
  /hidden watermark|علامة مائية مخفية/i,
  /most popular|الأكثر اختيار/i,
  /in minutes|في دقائق/i,
  /arabic-first|عربي بالكامل/i,
  /\b100 ?%/,
  /السناتر/,
  /sign in with google/i,
  /operating system for education|منصة تعليمية متكاملة/i,
  /tenant isolation|\bRLS\b/,
  /auto-renew/i,
];

const LEGAL_IDS = new Set(['privacy-policy', 'terms']);

describe('marketing pages', () => {
  it('gives every page except home its own hero illustration, decorative, with every file present', () => {
    for (const { page, html } of rendered) {
      const arts = [...html.matchAll(/<img[^>]*data-hero-art="([a-z-]+)"[^>]*>/g)];
      if (page.id === 'home') {
        // Home keeps the real product screenshot as its hero.
        expect(arts, page.path).toHaveLength(0);
        continue;
      }
      expect(arts, page.path).toHaveLength(1);
      const [tag, name] = arts[0];
      expect(tag).toContain('alt=""');
      expect(tag).toContain('aria-hidden="true"');
      expect(tag).toMatch(/width="1080"[^>]*height="810"/);
      for (const src of tag.match(/\/marketing-assets\/heroes\/v1\/[a-z-]+-\d+w\.webp/g) ?? []) {
        expect(src.startsWith(`/marketing-assets/heroes/v1/${name}-`), src).toBe(true);
        expect(existsSync(resolve(__dirname, '../../../public', src.slice(1))), src).toBe(true);
      }
    }
  });

  it('registers every M1a page in both languages', () => {
    const ids = new Set(MARKETING_PAGES.map((p) => `${p.id}:${p.lang}`));
    for (const id of ['home', 'features', 'pricing', 'security', 'about', 'contact', 'privacy-policy', 'terms', '404']) {
      expect(ids.has(`${id}:en`)).toBe(true);
      expect(ids.has(`${id}:ar`)).toBe(true);
    }
    expect(new Set(MARKETING_PAGES.map((p) => p.file)).size).toBe(MARKETING_PAGES.length);
  });

  it.each(rendered.map((r) => [r.page.file, r] as const))('%s has one h1 and no unfilled tokens', (_file, r) => {
    expect(r.html.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(text(r.html)).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(r.head.title).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(r.head.description).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it.each(rendered.filter((r) => !LEGAL_IDS.has(r.page.id)).map((r) => [r.page.file, r] as const))(
    '%s contains no banned strings',
    (_file, r) => {
      const visible = `${text(r.html)} ${r.head.title} ${r.head.description}`;
      for (const pattern of BANNED) expect(visible).not.toMatch(pattern);
    },
  );

  it('keeps prices and currencies out of metadata', () => {
    for (const r of rendered) {
      expect(`${r.head.title} ${r.head.description}`).not.toMatch(/EGP|ج\.م|\d{1,3}(,\d{3})+/);
    }
  });

  it('shows every catalog price on the pricing pages, formatted per locale', () => {
    for (const lang of ['en', 'ar'] as const) {
      const r = rendered.find((x) => x.page.id === 'pricing' && x.page.lang === lang)!;
      const visible = text(r.html);
      for (const plan of plans) {
        const { amount, yearlyAmount, currency } = plan.pricing ?? {};
        if (!currency) continue;
        if (amount !== undefined) expect(visible).toContain(norm(formatPrice(lang, amount, currency)));
        if (yearlyAmount !== undefined) expect(visible).toContain(norm(formatPrice(lang, yearlyAmount, currency)));
        expect(visible).toContain(plan.nameLocalized?.[lang] ?? plan.name);
      }
    }
  });

  it('never renders withheld limits (staff, recorded sessions, video storage)', () => {
    for (const r of rendered.filter((x) => x.page.id === 'pricing')) {
      const visible = text(r.html).toLowerCase();
      expect(visible).not.toMatch(/recorded session|video storage|staff/);
    }
  });

  it('carries the payments disclosure in both languages on the home page', () => {
    const en = text(rendered.find((x) => x.page.id === 'home' && x.page.lang === 'en')!.html);
    expect(en).toContain('Approval is manual and done by the account owner.');
    const ar = rendered.find((x) => x.page.id === 'home' && x.page.lang === 'ar')!;
    expect(text(ar.html).length).toBeGreaterThan(1000);
  });

  it('keeps FAQPage JSON-LD identical to the visible questions and answers', () => {
    for (const r of rendered) {
      const faqs = (r.head.jsonLd ?? []).filter((node) => (node as { '@type'?: string })['@type'] === 'FAQPage');
      for (const faq of faqs as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }[]) {
        const visible = text(r.html);
        expect(faq.mainEntity.length).toBeGreaterThan(0);
        for (const q of faq.mainEntity) {
          expect(visible).toContain(q.name);
          expect(visible).toContain(q.acceptedAnswer.text);
        }
      }
    }
  });

  it('uses one Organization entity id everywhere and Offers equal to the catalog', () => {
    const pricing = rendered.find((x) => x.page.id === 'pricing' && x.page.lang === 'en')!;
    const app = (pricing.head.jsonLd ?? []).find((n) => (n as { '@type'?: string })['@type'] === 'SoftwareApplication') as {
      offers: { price: string; priceCurrency: string }[];
      publisher: { '@id': string };
    };
    expect(app.publisher['@id']).toBe('https://atlass.dpdns.org/#organization');
    const expected = plans.flatMap((p) => [p.pricing?.amount, p.pricing?.yearlyAmount].filter((v) => v !== undefined).map(String));
    expect(app.offers.map((o) => o.price).sort()).toEqual(expected.sort());
    expect(app.offers.every((o) => o.priceCurrency === 'EGP')).toBe(true);
    expect(JSON.stringify(pricing.head.jsonLd)).not.toMatch(/"(aggregateRating|review)"/);
  });

  it('links the language twin with hreflang and lang on every page', () => {
    for (const r of rendered) {
      const other = r.page.lang === 'ar' ? 'en' : 'ar';
      expect(r.html).toMatch(new RegExp(`hrefLang="${other}"|hreflang="${other}"`));
    }
    const home = rendered.find((x) => x.page.id === 'home' && x.page.lang === 'en')!;
    expect(home.html).toContain('href="/ar"');
  });

  it('carries the plan and Arabic language on registration links', () => {
    const ar = rendered.find((x) => x.page.id === 'pricing' && x.page.lang === 'ar')!;
    expect(ar.html).toContain('/auth/register?plan=growth&amp;lang=ar');
    const en = rendered.find((x) => x.page.id === 'pricing' && x.page.lang === 'en')!;
    expect(en.html).toContain('/auth/register?plan=starter"');
  });

  it('marks the 404 noindex without alternates', () => {
    for (const r of rendered.filter((x) => x.page.id === '404')) {
      expect(r.head.robots).toBe('noindex, follow');
      expect(r.head.alternates).toBeUndefined();
      expect(r.page.inSitemap).toBe(false);
    }
  });
});

describe('links to the help center (DL-57)', () => {
  // Every help-center URL a marketing page links to must be a page the docs
  // build writes: the home, a category page or an inventory article.
  const docsPaths = new Set<string>(['/']);
  for (const category of DOC_CATEGORIES) docsPaths.add(`/${category.id}`);
  for (const entry of inventory as { category: string; slug: string }[]) {
    if (entry.category === 'home') continue;
    docsPaths.add(entry.slug === '_index' ? `/${entry.category}` : `/${entry.category}/${entry.slug}`);
  }

  it('point only at pages of the help center, in the page language', () => {
    let count = 0;
    for (const { page, html } of rendered) {
      for (const [, href] of html.matchAll(/href="(https:\/\/docs\.atlass\.dpdns\.org[^"]*)"/g)) {
        count += 1;
        const path = new URL(href).pathname;
        const ar = path === '/ar' || path.startsWith('/ar/');
        expect(ar, `${page.path}: ${href}`).toBe(page.lang === 'ar');
        const bare = ar ? path.slice(3) || '/' : path;
        expect(docsPaths.has(bare), `${page.path}: ${href} is not a help-center page`).toBe(true);
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it('puts the help center in the header and footer of every page, and learn-more links on features and security', () => {
    for (const { page, html } of rendered) {
      const home = page.lang === 'ar' ? 'https://docs.atlass.dpdns.org/ar"' : 'https://docs.atlass.dpdns.org/"';
      expect(html.split(home).length - 1, page.path).toBeGreaterThanOrEqual(2);
    }
    for (const { page, html } of rendered.filter(({ page: p }) => p.id === 'features' || p.id === 'security')) {
      expect((html.match(/data-mkt-help/g) ?? []).length, page.path).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('trial CTAs for a signed-in visitor', () => {
  // The dashboard actions a body trial CTA may give way to (header aside,
  // which has its own "Open dashboard" button). `?open=` is resolved by the
  // app's academy chooser (academyEntryRoute).
  const SIGNED_IN_TARGETS = /^(\/dashboard|\/dashboard\/tenant\/subscription|\/dashboard\/academy\?open=(payments|courses|team|website))$/;
  const anchors = (html: string) =>
    [...html.replace(/<header[\s\S]*?<\/header>/, '').matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(([tag]) => tag);
  const hrefOf = (tag: string) => tag.match(/href="([^"]*)"/)?.[1].replace(/&amp;/g, '&') ?? '';
  const pathOf = (href: string) => {
    const url = new URL(href, 'https://app.invalid');
    return `${url.pathname}${url.search}`;
  };

  it('pairs every body trial link with a dashboard action, shown instead of it', () => {
    let pairs = 0;
    for (const { page, html } of rendered) {
      const links = anchors(html);
      links.forEach((tag, index) => {
        if (!/\/auth\/register/.test(hrefOf(tag))) return;
        expect(tag, `${page.path}: ${hrefOf(tag)}`).toContain('data-signed-out-only');
        const next = links[index + 1] ?? '';
        expect(next, `${page.path}: no stand-in after ${hrefOf(tag)}`).toContain('data-signed-in-only');
        expect(pathOf(hrefOf(next)), page.path).toMatch(SIGNED_IN_TARGETS);
        expect(text(next).trim().length, page.path).toBeGreaterThan(0);
        pairs += 1;
      });
    }
    // Home: hero, payments, closing; features: hero, closing; pricing: the
    // closing band and every trial plan card; security and about: closing.
    expect(pairs).toBeGreaterThanOrEqual(2 * 9);
  });

  it('hides each pricing card\'s trial line along with its trial button', () => {
    for (const { page, html } of rendered.filter(({ page: p }) => p.id === 'pricing')) {
      const cards = [...html.matchAll(/<li\b[^>]*data-plan="[^"]*"[^>]*>[\s\S]*?<\/li>(?=<li\b[^>]*data-plan|<\/ul>)/g)].map(([m]) => m);
      expect(cards.length, page.path).toBeGreaterThan(0);
      for (const card of cards) {
        if (!/\/auth\/register/.test(card)) continue;
        expect(card, page.path).toMatch(/<p\b[^>]*data-signed-out-only[^>]*>[^<]*(trial|تجربة)/i);
      }
    }
  });

  it('hides the trial microcopy from signed-in visitors', () => {
    for (const { page, html } of rendered.filter(({ page: p }) => p.id === 'home')) {
      // The microcopy line itself ("14-day trial. No card needed."), not prose that mentions the trial.
      const micro = page.lang === 'ar' ? 'تجربة [^<]*، من غير كارت\\.' : '\\d+-day trial\\. No card needed\\.';
      const tags = [...html.matchAll(new RegExp(`<(p|span)\\b[^>]*>(?:(?:(?!</\\1>|<(?:p|span)\\b)[\\s\\S])*?>)?${micro}`, 'g'))].map(([m]) => m);
      expect(tags.length, page.path).toBeGreaterThanOrEqual(2);
      for (const tag of tags) expect(tag, page.path).toMatch(/^<(p|span)\b[^>]*data-signed-out-only/);
    }
  });
});

describe('M1b product pages', () => {
  const PRODUCT_IDS = [
    'academy-website',
    'payments',
    'content-protection',
    'teams-and-academies',
    'quizzes-and-certificates',
  ];
  const product = rendered.filter((r) => PRODUCT_IDS.includes(r.page.id));

  it('registers all five in both languages, under /features/<id>, in the sitemap', () => {
    expect(product).toHaveLength(10);
    for (const r of product) {
      const expected = `${r.page.lang === 'ar' ? '/ar' : ''}/features/${r.page.id}`;
      expect(r.page.path).toBe(expected);
      expect(r.page.inSitemap).toBe(true);
      expect(r.head.canonicalPath).toBe(expected);
      expect(r.head.alternates).toEqual({ en: `/features/${r.page.id}`, ar: `/ar/features/${r.page.id}` });
    }
  });

  it('gives every page a unique title (≤ 60) and description (≤ 155) per language', () => {
    for (const lang of ['en', 'ar'] as const) {
      const pages = rendered.filter((r) => r.page.lang === lang && r.page.id !== '404');
      expect(new Set(pages.map((r) => r.head.title)).size).toBe(pages.length);
      expect(new Set(pages.map((r) => r.head.description)).size).toBe(pages.length);
    }
    for (const r of product) {
      expect([...r.head.title].length, r.page.path).toBeLessThanOrEqual(60);
      expect([...r.head.description].length, r.page.path).toBeLessThanOrEqual(155);
    }
  });

  it('carries BreadcrumbList (Home > Product > page) and WebPage JSON-LD, nothing forbidden', () => {
    for (const r of product) {
      const types = (r.head.jsonLd ?? []).map((node) => (node as { '@type': string })['@type']);
      expect(types).toEqual(['WebPage', 'BreadcrumbList']);
      const crumbs = (r.head.jsonLd![1] as { itemListElement: { item: string }[] }).itemListElement;
      expect(crumbs.map((c) => c.item.replace('https://atlass.dpdns.org', ''))).toEqual([
        r.page.lang === 'ar' ? '/ar' : '/',
        r.page.lang === 'ar' ? '/ar/features' : '/features',
        r.page.path,
      ]);
      expect(JSON.stringify(r.head.jsonLd)).not.toMatch(/Review|AggregateRating|HowTo|Offer/);
    }
  });

  it('describes only shipped behaviour: no trace or lookup, no integrity, no plan-specific domain promise', () => {
    for (const r of product) {
      const visible = `${text(r.html)} ${r.head.title} ${r.head.description}`;
      expect(visible, r.page.path).not.toMatch(/\btrac(e|es|ed|ing)\b|lookup|which account|يكشف|نكشف|نعرف مصدر/i);
      expect(visible, r.page.path).not.toMatch(/integrity|anti-cheat|proctor|نزاهة|غش/i);
      expect(visible, r.page.path).not.toMatch(/on every plan|كل الباقات/i);
      expect(visible, r.page.path).not.toMatch(/automatic payment|instant enrol|coupon|bulk import|staff role|upload your videos/i);
      expect(visible, r.page.path).not.toMatch(/\bfree\b|in minutes|\b100 ?%/i);
    }
  });

  it('carries the required disclosures in both languages', () => {
    for (const lang of ['en', 'ar'] as const) {
      const payments = text(product.find((r) => r.page.id === 'payments' && r.page.lang === lang)!.html);
      const lessons = text(product.find((r) => r.page.id === 'content-protection' && r.page.lang === lang)!.html);
      if (lang === 'en') {
        expect(payments).toContain('Approval is manual and done by the account owner. There is no card or Fawry checkout today.');
        expect(lessons).toContain('A determined student can still copy the YouTube link itself.');
      } else {
        expect(payments).toContain('الموافقة يدوية، ويقوم بها صاحب الحساب. لا يوجد حاليًا دفع بالكارت أو عن طريق فوري.');
        expect(lessons).toContain('الطالب اللي مصمم يقدر ينسخ لينك يوتيوب نفسه.');
      }
    }
  });

  it('is linked from the header menu and footer of every page, and from the home pillars', () => {
    for (const r of rendered) {
      const prefix = r.page.lang === 'ar' ? '/ar' : '';
      for (const id of PRODUCT_IDS) {
        expect(r.html.split(`href="${prefix}/features/${id}"`).length - 1, `${r.page.path} → ${id}`).toBeGreaterThanOrEqual(2);
      }
    }
    for (const lang of ['en', 'ar'] as const) {
      const home = rendered.find((r) => r.page.id === 'home' && r.page.lang === lang)!;
      const prefix = lang === 'ar' ? '/ar' : '';
      for (const id of ['payments', 'academy-website', 'teams-and-academies', 'quizzes-and-certificates']) {
        expect(home.html.split(`href="${prefix}/features/${id}"`).length - 1, `home ${lang} → ${id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('links the product overview to each page, and each page back to the overview and two siblings', () => {
    for (const lang of ['en', 'ar'] as const) {
      const prefix = lang === 'ar' ? '/ar' : '';
      const hub = rendered.find((r) => r.page.id === 'features' && r.page.lang === lang)!;
      for (const id of PRODUCT_IDS) expect(hub.html).toContain(`href="${prefix}/features/${id}"`);
    }
    for (const r of product) {
      const prefix = r.page.lang === 'ar' ? '/ar' : '';
      expect(r.html).toContain(`href="${prefix}/features"`);
      expect((r.html.match(/data-mkt-help/g) ?? []).length, r.page.path).toBeGreaterThanOrEqual(2);
    }
  });
});
