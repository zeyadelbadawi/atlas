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
        value="/api/v1/public/media/academies/a/b.png"
        alt="Our team"
        className="w-full"
        style={{ borderRadius: '4px' }}
      />
    );
    expect(container.innerHTML).toBe(
      '<img src="/api/v1/public/media/academies/a/b.png" alt="Our team" class="w-full" style="border-radius: 4px;">'
    );
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
