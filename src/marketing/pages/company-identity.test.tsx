/**
 * B0-OC-17 — the operating company is named everywhere a customer looks for
 * who they contract with: the marketing footer (every page), the contact
 * page's company details, the Organization JSON-LD, and the Terms and the
 * Privacy Policy (EN + AR). Every value comes from `COMPANY`, so a change to
 * src/config/company.config.ts is the only edit registration needs.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { COMPANY, isPlaceholderNumber } from '@/config/company.config';
import { PRIVACY_POLICY_AR } from '@/features/legal/content/privacy-policy.ar';
import { PRIVACY_POLICY_EN } from '@/features/legal/content/privacy-policy.en';
import { TERMS_AR } from '@/features/legal/content/terms.ar';
import { TERMS_EN } from '@/features/legal/content/terms.en';
import type { LegalDocument } from '@/features/legal/content/legal-content.types';
import type { Plan } from '@/types/plan.types';
import snapshot from '../data/plans.snapshot.json';
import { MARKETING_PAGES } from '../registry';
import type { MarketingRenderContext } from '../types';

const ctx: MarketingRenderContext = {
  plans: snapshot as unknown as Plan[],
  siteUrl: 'https://atlass.dpdns.org',
  buildDate: '2026-11-05',
};

function render(id: string, lang: 'en' | 'ar') {
  const page = MARKETING_PAGES.find((p) => p.id === id && p.lang === lang);
  if (!page) throw new Error(`${id}/${lang} missing`);
  return { html: renderToStaticMarkup(page.render(ctx)), head: page.head(ctx) };
}

function sectionText(document: LegalDocument, id: string): string {
  const section = document.sections.find((s) => s.id === id);
  if (!section) throw new Error(`missing section ${id}`);
  return section.blocks
    .map((block) => (block.kind === 'paragraph' ? block.text : ''))
    .join(' ');
}

describe('company identity (B0-OC-17)', () => {
  it('the footer names the company and its registration numbers (EN + AR)', () => {
    for (const lang of ['en', 'ar'] as const) {
      const { html } = render('home', lang);
      expect(html).toContain(`© 2026 ${COMPANY.legalName[lang]}`);
      expect(html).toContain(COMPANY.commercialRegisterNumber);
      expect(html).toContain(COMPANY.taxRegistrationNumber);
    }
  });

  it('the contact page lists the company details (EN + AR)', () => {
    const en = render('contact', 'en').html;
    expect(en).toContain('Company details');
    expect(en).toContain('Commercial register no.');
    const ar = render('contact', 'ar').html;
    expect(ar).toContain('بيانات الشركة');
    expect(ar).toContain(COMPANY.legalName.ar);
  });

  it('the Organization JSON-LD carries the legal name, and no placeholder tax ID', () => {
    const ld = (render('home', 'en').head.jsonLd ?? []) as Record<string, unknown>[];
    const org = ld.find((node) => node['@type'] === 'Organization');
    expect(org?.legalName).toBe(COMPANY.legalName.en);
    if (isPlaceholderNumber(COMPANY.taxRegistrationNumber)) expect(org).not.toHaveProperty('taxID');
  });

  it('the Terms and the Privacy Policy say who operates Atlas (EN + AR)', () => {
    for (const [doc, section, lang] of [
      [TERMS_EN, 'acceptance', 'en'],
      [TERMS_AR, 'acceptance', 'ar'],
      [PRIVACY_POLICY_EN, 'who-we-are', 'en'],
      [PRIVACY_POLICY_AR, 'who-we-are', 'ar'],
      [TERMS_EN, 'contact', 'en'],
      [TERMS_AR, 'contact', 'ar'],
      [PRIVACY_POLICY_EN, 'contact', 'en'],
      [PRIVACY_POLICY_AR, 'contact', 'ar'],
    ] as const) {
      const text = sectionText(doc, section);
      expect(text).toContain(COMPANY.legalName[lang]);
      expect(text).toContain(COMPANY.commercialRegisterNumber);
      expect(text).toContain(COMPANY.taxRegistrationNumber);
    }
  });

  it('recognises the zero placeholders used until registration', () => {
    expect(isPlaceholderNumber('000000')).toBe(true);
    expect(isPlaceholderNumber('000-000-000')).toBe(true);
    expect(isPlaceholderNumber('123456')).toBe(false);
  });
});
