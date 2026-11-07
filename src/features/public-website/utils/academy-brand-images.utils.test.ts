/**
 * SEO/AEO/GEO pass — the generated share card and monogram URLs, versioned
 * exactly as the backend versions them (`brand-images.util.ts`).
 */
import { describe, expect, it } from 'vitest';
import {
  absoluteImageUrl,
  academyIconHref,
  academyMonogramIconHref,
  academyOgImageUrl,
  brandImageVersion,
} from './academy-brand-images.utils';

const academy = {
  academyId: 'a1',
  academyName: 'Alpha Academy',
  presentation: {
    themeKey: 'modern-education',
    brand: { primaryColor: '350 60% 45%' },
  },
};

describe('brandImageVersion', () => {
  it('matches the backend’s pinned values (FNV-1a over UTF-16)', () => {
    expect(brandImageVersion('Alpha Academy', '350 60% 45%')).toBe('5df5a69e');
    expect(brandImageVersion('أكاديمية النور', '221 83% 53%')).toBe('8fb18879');
  });
});

describe('academy brand image URLs', () => {
  it('the share card is absolute on the canonical origin', () => {
    expect(
      academyOgImageUrl(academy, 'https://alpha.example/', '/api/v1')
    ).toBe(
      'https://alpha.example/api/v1/public/websites/a1/og-image.png?v=5df5a69e'
    );
    expect(
      academyOgImageUrl(
        academy,
        'https://alpha.example',
        'http://localhost:3000/api'
      )
    ).toBe(
      'http://localhost:3000/api/public/websites/a1/og-image.png?v=5df5a69e'
    );
  });

  it('the tab icon is the uploaded favicon, else the monogram', () => {
    expect(academyMonogramIconHref(academy, 180, '/api/v1')).toBe(
      '/api/v1/public/websites/a1/icon.png?size=180&v=5df5a69e'
    );
    expect(academyIconHref(academy, '/api/v1')).toBe(
      '/api/v1/public/websites/a1/icon.png?size=96&v=5df5a69e'
    );
    expect(
      academyIconHref({ ...academy, faviconVersion: 'f1' }, '/api/v1')
    ).toBe('/api/v1/public/websites/a1/favicon?v=f1');
  });

  it('owner images become absolute; data: URIs and other schemes are dropped', () => {
    expect(
      absoluteImageUrl('/api/v1/public/media/x.png', 'https://a.example')
    ).toBe('https://a.example/api/v1/public/media/x.png');
    expect(
      absoluteImageUrl('https://cdn.example/x.png', 'https://a.example')
    ).toBe('https://cdn.example/x.png');
    expect(
      absoluteImageUrl('data:image/png;base64,AA', 'https://a.example')
    ).toBeUndefined();
    expect(
      absoluteImageUrl('//evil.example/x.png', 'https://a.example')
    ).toBeUndefined();
    expect(absoluteImageUrl(undefined, 'https://a.example')).toBeUndefined();
  });
});
