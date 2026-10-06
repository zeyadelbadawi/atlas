/**
 * An Atelier page preloads exactly the display faces its heading uses, a
 * Manara page the Alexandria faces its heading uses; every other theme
 * gets no font preload from here.
 */
import { describe, expect, it, vi } from 'vitest';
import type { WebsiteThemeKey } from '@types';
import { themeFontPreloadHtml } from './theme-font-preloads';

// The test runner serves `?url` imports as empty strings; give each face
// the distinct URL a build gives it.
vi.mock('@/assets/fonts/fraunces-latin.woff2?url', () => ({
  default: '/assets/fraunces-latin.woff2',
}));
vi.mock('@/assets/fonts/fraunces-latin-italic.woff2?url', () => ({
  default: '/assets/fraunces-latin-italic.woff2',
}));
vi.mock('@/assets/fonts/markazi-text-arabic.woff2?url', () => ({
  default: '/assets/markazi-text-arabic.woff2',
}));
vi.mock('@/assets/fonts/alexandria-latin.woff2?url', () => ({
  default: '/assets/alexandria-latin.woff2',
}));
vi.mock('@/assets/fonts/alexandria-arabic.woff2?url', () => ({
  default: '/assets/alexandria-arabic.woff2',
}));

const ATELIER = new Set<WebsiteThemeKey>(['atelier']);
const MANARA = new Set<WebsiteThemeKey>(['manara']);
const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

describe('themeFontPreloadHtml', () => {
  it('English hero with highlighted words: the Latin face and its italic', () => {
    const html = themeFontPreloadHtml(
      ATELIER,
      '<main><h1 id="a" class="at-display">Learn deliberately, <em data-highlight="true" class="at-em">one chapter at a time</em></h1></main>'
    );
    expect(hrefs(html)).toEqual([
      '/assets/fraunces-latin.woff2',
      '/assets/fraunces-latin-italic.woff2',
    ]);
    expect(html).toMatch(
      /^<link rel="preload" as="font" type="font\/woff2" crossorigin href=/
    );
  });

  it('a heading without highlighted words: no italic', () => {
    expect(
      hrefs(
        themeFontPreloadHtml(
          ATELIER,
          '<h1 class="at-display max-w-5xl">Questions &amp; answers</h1>'
        )
      )
    ).toEqual(['/assets/fraunces-latin.woff2']);
  });

  it('Arabic hero: the Arabic face only (punctuation and spaces need no Latin face)', () => {
    expect(
      hrefs(
        themeFontPreloadHtml(
          ATELIER,
          '<h1 class="at-display">تعلّم بتأنٍّ، <em class="at-em">فصلًا بعد فصل</em></h1>'
        )
      )
    ).toEqual(['/assets/markazi-text-arabic.woff2']);
  });

  it('an English course title on an Arabic page needs the Latin face', () => {
    expect(
      hrefs(
        themeFontPreloadHtml(
          ATELIER,
          '<h1 class="at-display atp-spread-title" dir="auto">UX Design Foundations</h1>'
        )
      )
    ).toEqual(['/assets/fraunces-latin.woff2']);
  });

  it('only the first heading counts, and only when it is set in the display face', () => {
    expect(
      themeFontPreloadHtml(ATELIER, '<h1 class="text-xl">Sign in</h1>')
    ).toBe('');
    expect(themeFontPreloadHtml(ATELIER, '<p class="at-display">x</p>')).toBe(
      ''
    );
    expect(
      hrefs(
        themeFontPreloadHtml(
          ATELIER,
          '<h1 class="at-title">Not in our index</h1><h1 class="at-display"><em>x</em></h1>'
        )
      )
    ).toEqual(['/assets/fraunces-latin.woff2']);
  });

  it('Theme 1 and the base-pack themes get no font preload', () => {
    const hero = '<h1 class="at-display">Learn <em>deliberately</em></h1>';
    for (const key of ['modern-education', 'premium-academy'] as const) {
      expect(themeFontPreloadHtml(new Set([key]), hero)).toBe('');
    }
  });

  describe('Manara', () => {
    it('English hero with a highlighted phrase: the Latin face once (Alexandria has no italic)', () => {
      const html = themeFontPreloadHtml(
        MANARA,
        '<main><h1 id="a" class="mn-display">Teach the room, <em data-highlight="" class="mn-em">reach the phone</em></h1></main>'
      );
      expect(hrefs(html)).toEqual(['/assets/alexandria-latin.woff2']);
      expect(html).toMatch(
        /^<link rel="preload" as="font" type="font\/woff2" crossorigin href=/
      );
    });

    it('Arabic hero: the Arabic face only', () => {
      expect(
        hrefs(
          themeFontPreloadHtml(
            MANARA,
            '<h1 class="mn-display" data-long="">علّم القاعة، <em class="mn-em">وصِل إلى الهاتف</em></h1>'
          )
        )
      ).toEqual(['/assets/alexandria-arabic.woff2']);
    });

    it('an English course title on an Arabic page needs the Latin face', () => {
      expect(
        hrefs(
          themeFontPreloadHtml(
            MANARA,
            '<h1 class="mn-display mnp-course-title" dir="auto">UX Design Foundations</h1>'
          )
        )
      ).toEqual(['/assets/alexandria-latin.woff2']);
    });

    it('only a heading set in the display face counts, and Atelier markup earns Manara nothing', () => {
      expect(
        themeFontPreloadHtml(MANARA, '<h1 class="text-xl">Sign in</h1>')
      ).toBe('');
      expect(themeFontPreloadHtml(MANARA, '<p class="mn-display">x</p>')).toBe(
        ''
      );
      expect(
        themeFontPreloadHtml(MANARA, '<h1 class="at-display">Learn</h1>')
      ).toBe('');
      expect(
        hrefs(
          themeFontPreloadHtml(
            MANARA,
            '<h1 class="mn-title">Not in our index</h1><h1 class="mn-display">x</h1>'
          )
        )
      ).toEqual(['/assets/alexandria-latin.woff2']);
    });
  });
});
