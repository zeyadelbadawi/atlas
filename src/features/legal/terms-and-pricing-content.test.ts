/**
 * The Terms of Service and the pricing FAQ must agree with each other, with
 * the Privacy Policy and with what Atlas actually does:
 *
 *   - a free trial can start at signup (an eligible owner who picks a trial
 *     plan at registration gets it when the account is created), so the
 *     Terms must not say a trial never starts automatically;
 *   - not every plan offers a trial, so the pricing FAQ must not promise
 *     one on every plan;
 *   - subscriptions are paid by manual transfer and confirmed by Atlas, and
 *     a confirmed plan payment sends the owner a receipt;
 *   - EN and AR stay structurally identical.
 */
import { describe, expect, it } from 'vitest';
import { TERMS_EN } from './content/terms.en';
import { TERMS_AR } from './content/terms.ar';
import type { LegalDocument } from './content/legal-content.types';
import enPricing from '@/localization/resources/en/pricing.json';
import arPricing from '@/localization/resources/ar/pricing.json';

function sectionText(document: LegalDocument, id: string): string {
  const section = document.sections.find((s) => s.id === id);
  if (!section) throw new Error(`missing section ${id}`);
  return section.blocks
    .map((block) =>
      block.kind === 'paragraph'
        ? block.text
        : block.kind === 'list'
          ? block.items.join(' ')
          : block.items.map((item) => `${item.term} ${item.detail}`).join(' ')
    )
    .join(' ');
}

function shape(document: LegalDocument) {
  return document.sections.map((section) => ({
    id: section.id,
    blocks: section.blocks.map((block) =>
      block.kind === 'paragraph'
        ? 'paragraph'
        : `${block.kind}:${block.items.length}`
    ),
  }));
}

describe('Terms of Service content', () => {
  it('has identical section structure in English and Arabic', () => {
    expect(shape(TERMS_AR)).toEqual(shape(TERMS_EN));
  });

  it('carries the 5 October 2026 revision date', () => {
    expect(TERMS_EN.lastUpdated).toBe('5 October 2026');
    expect(TERMS_AR.lastUpdated).toBe('٥ أكتوبر ٢٠٢٦');
  });

  it('describes the signup trial truthfully (EN + AR)', () => {
    const en = sectionText(TERMS_EN, 'trials');
    expect(en).not.toMatch(/does not begin automatically/);
    expect(en).toContain(
      'the trial of that plan starts when your account is created'
    );
    expect(en).toContain('only on plans that include one');
    expect(en).toContain('Creating an academy never starts a trial');
    const ar = sectionText(TERMS_AR, 'trials');
    expect(ar).not.toContain('ولا تبدأ تلقائيًا عند إنشاء حساب');
    expect(ar).toContain('تبدأ الفترة التجريبية لتلك الخطة عند إنشاء حسابك');
  });

  it('describes manual-transfer payment, the receipt and gifted days (EN + AR)', () => {
    const en = sectionText(TERMS_EN, 'subscriptions');
    expect(en).toContain('manual transfer');
    expect(en).toContain('email receipt');
    expect(en).toContain('gifted setup days');
    expect(en).not.toMatch(/configured payment provider/);
    const ar = sectionText(TERMS_AR, 'subscriptions');
    expect(ar).toContain('بالتحويل اليدوي');
    expect(ar).toContain('إيصالًا بالبريد الإلكتروني');
    expect(ar).toContain('أيام إعداد مُهداة');
  });

  it('makes no compliance claims and carries no draft markers', () => {
    for (const document of [TERMS_EN, TERMS_AR]) {
      const text = document.sections
        .map((s) => sectionText(document, s.id))
        .join(' ');
      expect(text).not.toMatch(/\bTODO\b|\bTBD\b|\bFIXME\b/i);
      expect(text).not.toMatch(/GDPR|fully compliant|compliant with/i);
    }
  });
});

describe('Pricing FAQ', () => {
  it('does not promise a free trial on every plan (EN + AR)', () => {
    expect(enPricing.faq.description).not.toMatch(/every plan/i);
    expect(enPricing.faq.description).toContain(
      'Some plans include a free trial'
    );
    expect(enPricing.faq.description).toContain('one free trial');
    expect(arPricing.faq.description).not.toContain('تبدأ كل خطة');
    expect(arPricing.faq.description).toContain(
      'تتضمن بعض الخطط فترة تجريبية مجانية'
    );
  });
});
