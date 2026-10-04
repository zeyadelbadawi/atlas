/**
 * The Privacy Policy's two language versions, and the disclosures the
 * follow-up phase added.
 *
 * Pinned here:
 *   - EN and AR have the same sections, in the same order, with the same
 *     block shapes — so an English clause can never be missing from the
 *     Arabic page (the parity the content files' own comments promise);
 *   - the "last updated" date of this revision;
 *   - the implemented facts the policy now states (the eligibility ledgers,
 *     180-day trial forensics, 90-day security events and email records,
 *     24-hour code records), in both languages;
 *   - no TODO text, no compliance claims, and none of the wording the W8
 *     report flagged ("cannot be reversed" about the trial hash);
 *   - the Arabic page renders right-to-left.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { PRIVACY_POLICY_EN } from './content/privacy-policy.en';
import { PRIVACY_POLICY_AR } from './content/privacy-policy.ar';
import type { LegalBlock, LegalDocument } from './content/legal-content.types';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';

afterEach(() => cleanup());

function blockShape(block: LegalBlock): string {
  return block.kind === 'paragraph'
    ? 'paragraph'
    : `${block.kind}:${block.items.length}`;
}

function shape(document: LegalDocument) {
  return document.sections.map((section) => ({
    id: section.id,
    blocks: section.blocks.map(blockShape),
  }));
}

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

function fullText(document: LegalDocument): string {
  return [
    document.title,
    document.summary,
    ...document.sections.map(
      (s) => `${s.heading} ${sectionText(document, s.id)}`
    ),
  ].join(' ');
}

describe('Privacy Policy content', () => {
  it('has identical section structure in English and Arabic', () => {
    expect(shape(PRIVACY_POLICY_AR)).toEqual(shape(PRIVACY_POLICY_EN));
  });

  it('numbers its sections consecutively in both languages', () => {
    const toLatin = (value: string) =>
      value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    for (const document of [PRIVACY_POLICY_EN, PRIVACY_POLICY_AR]) {
      document.sections.forEach((section, index) => {
        expect(toLatin(section.heading)).toMatch(
          new RegExp(`^${index + 1}\\.`)
        );
      });
    }
  });

  it('carries the 4 October 2026 revision date', () => {
    expect(PRIVACY_POLICY_EN.lastUpdated).toBe('4 October 2026');
    expect(PRIVACY_POLICY_AR.lastUpdated).toBe('٤ أكتوبر ٢٠٢٦');
  });

  it('describes the eligibility ledgers as implemented (EN)', () => {
    const text = sectionText(PRIVACY_POLICY_EN, 'eligibility-records');
    expect(text).toContain('keyed cryptographic hash (HMAC)');
    expect(text).toContain('The email address itself is not stored');
    expect(text).toContain('Gmail');
    expect(text).toContain('cleared automatically after 180 days');
    expect(text).toContain('earlier method');
    expect(text).toContain('a refund does not restore eligibility');
    expect(text).toContain('depends on the plan and billing cycle');
  });

  it('states the implemented retention periods in both languages', () => {
    const en = sectionText(PRIVACY_POLICY_EN, 'retention');
    expect(en).toContain('24 hours');
    expect(en).toContain('180 days');
    expect(en).toContain('90 days');
    expect(en).toContain('365 days');
    expect(en).toContain('15 days');
    const ar = sectionText(PRIVACY_POLICY_AR, 'retention');
    for (const figure of ['٢٤ ساعة', '١٨٠ يومًا', '٩٠ يومًا', '٣٦٥ يومًا']) {
      expect(ar).toContain(figure);
    }
  });

  it('explains what deletion removes and what it keeps (EN + AR)', () => {
    const en = sectionText(PRIVACY_POLICY_EN, 'deletion');
    expect(en).toContain('What is removed');
    expect(en).toContain('What is kept, and why');
    expect(en).toContain('hashes and dates only');
    const ar = sectionText(PRIVACY_POLICY_AR, 'deletion');
    expect(ar).toContain('ما يُزال');
    expect(ar).toContain('ما يُحتفظ به، ولماذا');
  });

  it('makes no compliance claims and carries no draft markers', () => {
    for (const document of [PRIVACY_POLICY_EN, PRIVACY_POLICY_AR]) {
      const text = fullText(document);
      expect(text).not.toMatch(/\bTODO\b|\bTBD\b|\bFIXME\b/i);
      expect(text).not.toMatch(/GDPR|fully compliant|compliant with/i);
    }
    const en = fullText(PRIVACY_POLICY_EN);
    expect(en).not.toMatch(/cannot be reversed|non-reversible|irreversibl/i);
  });
});

describe('PrivacyPolicyPage', () => {
  it('renders the Arabic policy right-to-left with the new sections', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('ar')}>
        <PrivacyPolicyPage />
      </I18nextProvider>
    );
    const article = screen.getByRole('article');
    expect(article.getAttribute('dir')).toBe('rtl');
    expect(article.getAttribute('lang')).toBe('ar');
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '٦. الفترات التجريبية المجانية وأيام الاشتراك المُهداة',
      })
    ).toBeTruthy();
  });

  it('renders the English policy left-to-right', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PrivacyPolicyPage />
      </I18nextProvider>
    );
    const article = screen.getByRole('article');
    expect(article.getAttribute('dir')).toBe('ltr');
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '7. Emails, sign-in codes and security monitoring',
      })
    ).toBeTruthy();
  });
});
