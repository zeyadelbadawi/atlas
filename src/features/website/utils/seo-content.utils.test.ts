/**
 * SEO/AEO/GEO pass — default descriptions come from what the page says;
 * FAQ structured data from what the FAQ sections show.
 */
import { describe, expect, it } from 'vitest';
import type { WebsitePage } from '@types';
import {
  collectPageFaqItems,
  composeSeoDescription,
  derivePageDescription,
  truncateForSnippet,
} from './seo-content.utils';

const lt = (en: string, ar: string) => ({ en, ar });

const page = (sections: unknown[]): WebsitePage =>
  ({
    id: 'p',
    pageType: 'core',
    coreType: 'faqs',
    slug: 'faqs',
    visible: true,
    seo: {},
    sections,
  }) as unknown as WebsitePage;

describe('derivePageDescription', () => {
  it('takes the first visible section’s description, in the page language', () => {
    const p = page([
      {
        id: 's0',
        type: 'hero',
        visible: false,
        config: { description: lt('Hidden', 'مخفي') },
      },
      {
        id: 's1',
        type: 'pageHeader',
        config: {
          title: lt('T', 'ت'),
          description: lt('Short answers.', 'إجابات قصيرة.'),
        },
      },
    ]);
    expect(derivePageDescription(p, 'en')).toBe('Short answers.');
    expect(derivePageDescription(p, 'ar')).toBe('إجابات قصيرة.');
  });

  it('skips unfilled placeholders and pages with no copy', () => {
    expect(
      derivePageDescription(
        page([
          {
            id: 's',
            type: 'about',
            config: { body: lt('Welcome to {{academyName}}', 'x') },
          },
        ]),
        'en'
      )
    ).toBe('');
    expect(derivePageDescription(page([]), 'en')).toBe('');
  });
});

describe('composeSeoDescription', () => {
  it('tops a short page sentence up with the academy description', () => {
    expect(
      composeSeoDescription({
        pageText: 'Answers.',
        academyDescription: 'Design courses.',
        generic: 'g',
      })
    ).toBe('Answers. Design courses.');
    expect(
      composeSeoDescription({
        pageText: 'Answers',
        academyDescription: 'Design courses.',
        generic: 'g',
      })
    ).toBe('Answers. Design courses.');
  });

  it('falls back to the academy description, then the generic sentence', () => {
    expect(
      composeSeoDescription({
        academyDescription: 'Design courses.',
        generic: 'g',
      })
    ).toBe('Design courses.');
    expect(
      composeSeoDescription({ generic: 'Horizon — online courses.' })
    ).toBe('Horizon — online courses.');
  });

  it('cuts at a word within 160 characters', () => {
    const long = 'word '.repeat(60);
    const result = truncateForSnippet(long);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toMatch(/wor…$/);
  });
});

describe('collectPageFaqItems', () => {
  it('library entries first, then inline items, cut to maxItems, each question once', () => {
    const p = page([
      {
        id: 'f',
        type: 'faq',
        config: {
          maxItems: 3,
          libraryEntries: [
            {
              id: 'l1',
              question: lt('Online?', 'عبر الإنترنت؟'),
              answer: lt('Yes.', 'نعم.'),
            },
          ],
          items: [
            {
              id: 'i1',
              question: lt('Pay later?', 'لاحقًا؟'),
              answer: lt('No.', 'لا.'),
            },
            {
              id: 'i2',
              question: lt('Online?', 'x'),
              answer: lt('dup', 'dup'),
            },
            {
              id: 'i3',
              question: lt('Beyond max?', 'x'),
              answer: lt('x', 'x'),
            },
          ],
        },
      },
    ]);
    expect(collectPageFaqItems(p, 'en')).toEqual([
      { question: 'Online?', answer: 'Yes.' },
      { question: 'Pay later?', answer: 'No.' },
    ]);
    expect(collectPageFaqItems(p, 'ar')[0]).toEqual({
      question: 'عبر الإنترنت؟',
      answer: 'نعم.',
    });
  });
});
