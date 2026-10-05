import { describe, expect, it } from 'vitest';
import {
  adoptThemeAssetReference,
  adoptThemeAssets,
} from './adopt-theme-assets';
import { THEME_ASSET_MANIFESTS } from './theme-asset.registry';
import type { ThemeAssetManifest } from './theme-asset.types';

describe('adoptThemeAssetReference', () => {
  it("draws another theme's photograph as the active theme's photograph for the same slot", () => {
    expect(
      adoptThemeAssetReference(
        'theme-asset:modern-education/home-hero',
        'atelier'
      )
    ).toBe('theme-asset:atelier/home-hero');
    expect(
      adoptThemeAssetReference(
        'theme-asset:atelier/gallery-3',
        'modern-education'
      )
    ).toBe('theme-asset:modern-education/gallery-3');
  });

  it('maps the slots whose key differs between themes', () => {
    expect(
      adoptThemeAssetReference(
        'theme-asset:modern-education/home-benefit',
        'atelier'
      )
    ).toBe('theme-asset:atelier/home-philosophy');
    expect(
      adoptThemeAssetReference(
        'theme-asset:atelier/home-philosophy',
        'modern-education'
      )
    ).toBe('theme-asset:modern-education/home-benefit');
  });

  it('every Modern Education starter photograph has an Atelier counterpart', () => {
    for (const entry of THEME_ASSET_MANIFESTS['modern-education'].assets) {
      if (entry.key === 'theme-card') continue;
      expect(
        adoptThemeAssetReference(
          `theme-asset:modern-education/${entry.key}`,
          'atelier'
        )
      ).toMatch(/^theme-asset:atelier\//);
    }
  });

  it("keeps the active theme's own references, owner images and other values", () => {
    for (const value of [
      'theme-asset:atelier/home-hero',
      'https://cdn.example.com/photo.jpg',
      '/media/academy/abc.png',
      'Hello world',
      '',
    ]) {
      expect(adoptThemeAssetReference(value, 'atelier')).toBe(value);
    }
  });

  it('keeps the stored reference when the active theme has no photograph for the slot', () => {
    // Atelier's method plate has no Modern Education counterpart.
    expect(
      adoptThemeAssetReference(
        'theme-asset:atelier/home-method',
        'modern-education'
      )
    ).toBe('theme-asset:atelier/home-method');
    // A theme without photographs (base pack) draws what is stored.
    expect(
      adoptThemeAssetReference(
        'theme-asset:modern-education/home-hero',
        'bold-creative'
      )
    ).toBe('theme-asset:modern-education/home-hero');
  });

  it('never points at a photograph the active theme has not released', () => {
    const atelier = THEME_ASSET_MANIFESTS.atelier;
    const pendingHero: Record<string, ThemeAssetManifest> = {
      ...THEME_ASSET_MANIFESTS,
      atelier: {
        ...atelier,
        assets: atelier.assets.map((entry) =>
          entry.key === 'home-hero'
            ? { ...entry, status: 'pending' as const }
            : entry
        ),
      },
    };
    expect(
      adoptThemeAssetReference(
        'theme-asset:modern-education/home-hero',
        'atelier',
        pendingHero
      )
    ).toBe('theme-asset:modern-education/home-hero');
  });
});

describe('adoptThemeAssets', () => {
  it('rewrites references anywhere in section content and leaves the rest as it is', () => {
    const sections = [
      {
        id: 's1',
        type: 'hero',
        enabled: true,
        config: {
          title: { en: 'Learn', ar: 'تعلّم' },
          image: 'theme-asset:modern-education/home-hero',
        },
      },
      {
        id: 's2',
        type: 'gallery',
        enabled: true,
        config: {
          items: [
            { image: 'theme-asset:modern-education/gallery-1' },
            { image: 'https://cdn.example.com/own.jpg' },
          ],
        },
      },
    ] as const;
    const adopted = adoptThemeAssets(sections, 'atelier');
    expect(adopted[0].config.image).toBe('theme-asset:atelier/home-hero');
    expect(adopted[0].config.title).toBe(sections[0].config.title);
    expect(adopted[1].config.items[0].image).toBe(
      'theme-asset:atelier/gallery-1'
    );
    expect(adopted[1].config.items[1]).toBe(sections[1].config.items[1]);
    // Stored content is never mutated.
    expect(sections[0].config.image).toBe(
      'theme-asset:modern-education/home-hero'
    );
  });

  it('returns the same object when nothing changes', () => {
    const page = {
      id: 'p',
      sections: [{ config: { image: 'theme-asset:atelier/home-hero' } }],
    };
    expect(adoptThemeAssets(page, 'atelier')).toBe(page);
  });
});
