/**
 * ThemeImage — plain values render the same `<img>` sections always did; a
 * released theme asset renders a responsive `<picture>`; a pending one
 * renders the section's fallback.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MODERN_EDUCATION_ASSETS } from './manifests/modern-education.manifest';
import { ThemeImage } from './ThemeImage';
import type * as Registry from './theme-asset.registry';

vi.mock('./theme-asset.registry', async (importOriginal) => {
  const actual = await importOriginal<typeof Registry>();
  const released = {
    ...MODERN_EDUCATION_ASSETS,
    assets: MODERN_EDUCATION_ASSETS.assets.map((entry) =>
      entry.key === 'about-story'
        ? {
            ...entry,
            status: 'released' as const,
            version: 'v1' as const,
            lqip: 'data:image/webp;base64,UklGRg==',
          }
        : entry.key === 'home-cta'
          ? // As it was before release: the pending case.
            {
              ...entry,
              status: 'pending' as const,
              version: undefined,
              lqip: undefined,
              provenance: undefined,
            }
          : entry
    ),
  };
  return {
    ...actual,
    findThemeAsset: (theme: string, key: string, manifests?: never) =>
      actual.findThemeAsset(
        theme,
        key,
        manifests ?? { 'modern-education': released }
      ),
  };
});

afterEach(cleanup);

describe('ThemeImage', () => {
  it('renders a plain value exactly as the sections did before', () => {
    const { container } = render(
      <ThemeImage
        value="https://cdn.example.com/b.png"
        alt="Our team"
        className="w-full"
        style={{ borderRadius: '4px' }}
      />
    );
    expect(container.innerHTML).toBe(
      '<img src="https://cdn.example.com/b.png" alt="Our team" class="w-full" style="border-radius: 4px;">'
    );
  });

  it('wraps an uploaded raster image in a picture with AVIF and WebP variants (CMS phase 4)', () => {
    const url = '/api/v1/public/media/academies/a/b.png';
    const { container } = render(
      <ThemeImage
        value={url}
        alt="Our team"
        className="w-full"
        style={{ borderRadius: '4px' }}
        sizes="(min-width: 768px) 50vw, 100vw"
      />
    );
    const sources = [...container.querySelectorAll('picture > source')];
    expect(sources.map((source) => source.getAttribute('type'))).toEqual([
      'image/avif',
      'image/webp',
    ]);
    expect(sources[0].getAttribute('srcset')).toBe(
      `${url}?w=480&f=avif 480w, ${url}?w=960&f=avif 960w, ${url}?w=1600&f=avif 1600w`
    );
    expect(sources[1].getAttribute('srcset')).toBe(
      `${url}?w=480&f=webp 480w, ${url}?w=960&f=webp 960w, ${url}?w=1600&f=webp 1600w`
    );
    for (const source of sources) {
      expect(source.getAttribute('sizes')).toBe(
        '(min-width: 768px) 50vw, 100vw'
      );
    }
    // The <img> is the one the sections always drew: the original as src.
    expect(container.querySelector('picture > img')!.outerHTML).toBe(
      `<img src="${url}" alt="Our team" class="w-full" style="border-radius: 4px;">`
    );
  });

  it.each([
    ['a GIF', '/api/v1/public/media/academies/a/b.gif'],
    ['an SVG', '/api/v1/public/media/academies/a/b.svg'],
    ['a signed link', '/api/v1/public/media/academies/a/b.png?exp=1&sig=x'],
    ['an external URL', 'https://example.com/api/v1/public/media/a/b.png'],
    ['a data URL', 'data:image/png;base64,iVBORw0KGgo='],
  ])('adds no variants to %s', (_label, value) => {
    const { container } = render(<ThemeImage value={value} alt="" />);
    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelector('img')!.getAttribute('src')).toBe(value);
  });

  it('renders a released asset as a lazy, sized picture with focal point and LQIP', () => {
    const { container } = render(
      <ThemeImage
        value="theme-asset:modern-education/about-story"
        alt=""
        sizes="50vw"
      />
    );
    const sources = container.querySelectorAll('picture > source');
    expect([...sources].map((s) => s.getAttribute('type'))).toEqual([
      'image/avif',
      'image/webp',
    ]);
    expect(sources[0].getAttribute('sizes')).toBe('50vw');
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('fetchpriority')).toBe('auto');
    expect(img.getAttribute('width')).toBe('2400');
    expect(img.getAttribute('height')).toBe('1800');
    // No section alt → the theme's own description.
    expect(img.getAttribute('alt')).toBe(
      'A small team planning together at a whiteboard'
    );
    expect(img.style.objectPosition).toBe('50% 45%');
    expect(img.style.backgroundImage).toContain('data:image/webp');
  });

  it('loads a page-leading theme asset eagerly at high priority when asked', () => {
    const { container } = render(
      <ThemeImage
        value="theme-asset:modern-education/about-story"
        alt=""
        sizes="30vw"
        priority
      />
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('renders the fallback for a pending asset', () => {
    const { container } = render(
      <ThemeImage
        value="theme-asset:modern-education/home-cta"
        alt=""
        fallback={<span>no image yet</span>}
      />
    );
    expect(container.innerHTML).toBe('<span>no image yet</span>');
  });
});
