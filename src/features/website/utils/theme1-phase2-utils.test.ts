import { describe, expect, it } from 'vitest';
import {
  fromCatalogSearch,
  resolveCatalogHref,
  toCatalogSearch,
} from './catalog-url.utils';
import { collectSampleContent } from './sample-content.utils';
import type { WebsitePage } from '@types';

describe('catalog URL contract', () => {
  it('round-trips state and skips empty values', () => {
    const state = { search: 'react basics', category: 'c1', page: '2' };
    const search = toCatalogSearch({ ...state, level: '' });
    expect(search).toBe('?q=react+basics&category=c1&page=2');
    expect(fromCatalogSearch(search)).toEqual(state);
    expect(toCatalogSearch({})).toBe('');
  });

  it('ignores unknown parameters', () => {
    expect(fromCatalogSearch('?utm_source=x&level=beginner')).toEqual({
      level: 'beginner',
    });
  });

  it('points at the courses core page, or nowhere without one', () => {
    const pages = [
      { id: 'p', coreType: 'courses', slug: 'courses' },
    ] as unknown as WebsitePage[];
    expect(resolveCatalogHref(pages, { category: 'c1' })).toBe(
      '/courses?category=c1'
    );
    expect(resolveCatalogHref([], { category: 'c1' })).toBeUndefined();
  });
});

describe('collectSampleContent (mirror of the backend)', () => {
  it('lists sections holding sample testimonials, in order', () => {
    const testimonials = (id: string, samples: boolean[]) => ({
      id,
      type: 'testimonials',
      enabled: true,
      config: {
        items: samples.map((sample, i) => ({
          id: `${id}-${i}`,
          quote: { en: 'q', ar: '' },
          authorName: 'A',
          sample,
        })),
      },
    });
    const pages = [
      {
        id: 'p1',
        title: 'Home',
        sections: [testimonials('t1', [true, true, false])],
      },
      { id: 'p2', title: 'About', sections: [testimonials('t2', [false])] },
    ] as unknown as WebsitePage[];
    expect(collectSampleContent(pages)).toEqual([
      {
        pageId: 'p1',
        pageTitle: 'Home',
        sectionId: 't1',
        sectionType: 'testimonials',
        sampleItems: 2,
      },
    ]);
  });
});
