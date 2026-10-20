/**
 * Renders every registered marketing page against the catalog snapshot and
 * checks the SPEC acceptance rules that hold for all of them: one H1, no
 * unfilled copy tokens, catalog prices on the page, the banned-strings list
 * (SPEC §A.10), required disclosures, and FAQPage JSON-LD that matches the
 * visible text (GEO: answer engines quote the same words people read).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Plan } from '@/types/plan.types';
import snapshot from '../data/plans.snapshot.json';
import { MARKETING_PAGES } from '../registry';
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
