/**
 * CMS phase 4 — the pre-publish page check: each rule, only switched-on
 * sections, and where each warning points.
 */
import { describe, expect, it } from 'vitest';
import type { SectionInstance, WebsitePage } from '@types';
import { collectPagePublishIssues } from './page-publish-check.utils';

const page = (id: string, visible = true, title = id) =>
  ({
    id,
    title,
    visible,
    slug: id,
    pageType: 'custom',
  }) as unknown as WebsitePage;

const pages = [page('about'), page('secret', false, 'Secret offer')];
const context = { pages, themeKey: 'manara', requiredLocale: 'en' as const };

const section = (
  id: string,
  type: string,
  config: Record<string, unknown>,
  enabled = true
) => ({ id, type, enabled, config }) as unknown as SectionInstance;

const rules = (sections: SectionInstance[]) =>
  collectPagePublishIssues(sections, context).map((issue) => [
    issue.sectionId,
    issue.rule,
    issue.fieldPath ?? null,
    issue.locale ?? null,
  ]);

describe('collectPagePublishIssues', () => {
  it('finds nothing on a clean page', () => {
    expect(
      rules([
        section('h', 'hero', {
          title: { en: 'Learn', ar: 'تعلّم' },
          image: '/api/v1/public/media/academies/a/b.png',
          imageAlt: { en: 'Students', ar: '' },
          cta: { label: { en: 'About', ar: '' }, pageId: 'about' },
        }),
      ])
    ).toEqual([]);
  });

  it('flags an image without a description in the main language', () => {
    expect(
      rules([
        section('h', 'hero', {
          image: '/api/v1/public/media/academies/a/b.png',
          imageAlt: { en: ' ', ar: 'طلاب' },
        }),
        section('g', 'gallery', {
          items: [
            { id: '1', image: 'theme-asset:manara/x', imageAlt: { en: 'ok' } },
            { id: '2', image: 'https://example.com/x.png' },
          ],
        }),
      ])
    ).toEqual([
      ['h', 'imageAlt', 'imageAlt', 'en'],
      ['g', 'imageAlt', 'items.1.imageAlt', 'en'],
    ]);
  });

  it('skips an image the theme does not draw', () => {
    // The steps plate is drawn by Atelier only.
    expect(
      rules([
        section('s', 'steps', {
          image: '/api/v1/public/media/academies/a/b.png',
          items: [],
        }),
      ])
    ).toEqual([]);
  });

  it('flags buttons with no link, a missing page or a hidden page', () => {
    expect(
      rules([
        section('c', 'cta', {
          cta: { label: { en: 'Go', ar: '' } },
          secondaryCta: { label: { en: 'Gone', ar: '' }, pageId: 'deleted' },
          tertiaryCta: { label: { en: 'Offer', ar: '' }, pageId: 'secret' },
        }),
      ])
    ).toEqual([
      ['c', 'buttonNoLink', 'cta', null],
      ['c', 'buttonMissingPage', 'secondaryCta', null],
      ['c', 'buttonHiddenPage', 'tertiaryCta', null],
    ]);
    const [hidden] = collectPagePublishIssues(
      [
        section('c', 'cta', {
          cta: { label: { en: 'Offer', ar: '' }, pageId: 'secret' },
        }),
      ],
      context
    );
    expect(hidden.values).toEqual({ page: 'Secret offer' });
  });

  it('flags every main title after the first (the renderer gives the page one h1)', () => {
    expect(
      rules([
        section('a', 'pageHeader', {}),
        section('b', 'about', {}),
        section('c', 'hero', {}),
      ])
    ).toEqual([['c', 'multipleH1', null, null]]);
  });

  it('flags bracketed placeholders in either language', () => {
    const issues = collectPagePublishIssues(
      [
        section('p', 'pricing', {
          title: { en: 'Plans', ar: 'الباقات' },
          items: [{ id: '1', price: { en: '[Price]', ar: '[السعر]' } }],
        }),
      ],
      context
    );
    expect(
      issues.map((issue) => [issue.fieldPath, issue.locale, issue.values])
    ).toEqual([
      ['items.0.price', 'en', { text: '[Price]' }],
      ['items.0.price', 'ar', { text: '[السعر]' }],
    ]);
  });

  it('flags sample items with the shared sample rule', () => {
    const issues = collectPagePublishIssues(
      [
        section('t', 'testimonials', {
          items: [
            { id: '1', sample: true },
            { id: '2', sample: true },
            { id: '3' },
          ],
        }),
      ],
      context
    );
    expect(issues.map((issue) => [issue.rule, issue.values])).toEqual([
      ['sample', { count: 2 }],
    ]);
  });

  it('ignores switched-off sections', () => {
    expect(
      rules([
        section('h', 'hero', { cta: { label: { en: 'x', ar: '' } } }, false),
        section('x', 'hero', {}, false),
        section('y', 'hero', {}),
      ])
    ).toEqual([]);
  });
});
