/**
 * The Terms of Service must agree with the Privacy Policy and with what
 * Atlas actually does (the pricing FAQ these tests also covered was retired
 * with the marketing site, owner decision D6):
 *
 *   - a free trial can start at signup (an eligible owner who picks a trial
 *     plan at registration gets it when the account is created), so the
 *     Terms must not say a trial never starts automatically;
 *   - subscriptions are paid by manual transfer and confirmed by Atlas, and
 *     a confirmed plan payment sends the owner a receipt;
 *   - every video carries a personal forensic watermark, and redistributing
 *     a recording may be traced to the account — stated without claiming
 *     the watermark stops recording;
 *   - EN and AR stay structurally identical.
 */
import { describe, expect, it } from 'vitest';
import { TERMS_EN } from './content/terms.en';
import { TERMS_AR } from './content/terms.ar';
import type { LegalDocument } from './content/legal-content.types';

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

  it('carries the 9 October 2026 revision date', () => {
    expect(TERMS_EN.lastUpdated).toBe('9 October 2026');
    expect(TERMS_AR.lastUpdated).toBe('٩ أكتوبر ٢٠٢٦');
  });

  it('warns that redistributed recordings may be traced through the watermark (EN + AR)', () => {
    const en = sectionText(TERMS_EN, 'acceptable-use');
    expect(en).toContain('personal forensic watermark');
    expect(en).toContain('may be traced back to that account');
    expect(en).not.toMatch(/unremovable|impossible|100%|cannot be recorded/i);
    const ar = sectionText(TERMS_AR, 'acceptable-use');
    expect(ar).toContain('علامة مائية تتبّعية شخصية');
    expect(ar).toContain('وصولًا إلى ذلك الحساب');
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
