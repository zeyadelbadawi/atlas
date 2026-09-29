/**
 * Theme asset pipeline (plan Phase 3): the manifest contract, completeness
 * against the §E.2 matrix, released files and weight budgets, version
 * immutability, template references, and the resolver.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { themeAssetManifestSchema } from './theme-asset.schema';
import {
  THEME_ASSET_MANIFESTS,
  buildThemeAssetPrompt,
} from './theme-asset.registry';
import {
  hasRenderableImage,
  resolveImageUrl,
  resolveThemeAsset,
} from './resolve-theme-asset';
import { RELEASED_THEME_ASSET_FOLDERS } from './released-versions';
import { MODERN_EDUCATION_ASSETS } from './manifests/modern-education.manifest';
import type { ThemeAssetManifest } from './theme-asset.types';

const REPO = resolve(__dirname, '../../../..');
const PUBLIC_ROOT = join(REPO, 'public', 'theme-assets');

/** The §E.2 A matrix — the manifest must hold exactly these. */
const MATRIX_KEYS = [
  'home-hero',
  'home-benefit',
  'home-cta',
  'courses-launching',
  'about-header',
  'about-story',
  'gallery-1',
  'gallery-2',
  'gallery-3',
  'gallery-4',
  'gallery-5',
  'auth-side',
];

const released = Object.values(THEME_ASSET_MANIFESTS).flatMap((manifest) =>
  manifest.assets
    .filter((entry) => entry.status === 'released')
    .map((entry) => ({ manifest, entry }))
);

describe('theme asset manifests', () => {
  it.each(Object.values(THEME_ASSET_MANIFESTS).map((m) => [m.theme, m]))(
    '%s satisfies the manifest contract',
    (_theme, manifest) => {
      const result = themeAssetManifestSchema.safeParse(manifest);
      expect(result.success ? [] : result.error.issues).toEqual([]);
    }
  );

  it('Modern Education holds exactly the §E.2 matrix, once each', () => {
    expect(MODERN_EDUCATION_ASSETS.assets.map((a) => a.key)).toEqual(
      MATRIX_KEYS
    );
    expect(
      MODERN_EDUCATION_ASSETS.assets.filter((a) => a.priority)
    ).toHaveLength(1);
  });

  it('builds a prompt with the subject, ratio, art direction and exclusions', () => {
    const [hero] = MODERN_EDUCATION_ASSETS.assets;
    const prompt = buildThemeAssetPrompt(MODERN_EDUCATION_ASSETS, hero);
    expect(prompt).toContain(hero.direction);
    expect(prompt).toContain('4:5 aspect ratio');
    expect(prompt).toContain(MODERN_EDUCATION_ASSETS.artDirection);
    expect(prompt).toContain('No text');
  });

  it('refuses a released entry without its version, LQIP and provenance', () => {
    const manifest = {
      ...MODERN_EDUCATION_ASSETS,
      assets: [{ ...MODERN_EDUCATION_ASSETS.assets[0], status: 'released' }],
    };
    const result = themeAssetManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    const paths = result.success
      ? []
      : result.error.issues.map((issue) => issue.path.at(-1));
    expect(paths).toEqual(
      expect.arrayContaining(['version', 'lqip', 'provenance'])
    );
  });

  it('refuses a master that does not match its ratio, or widths past the master', () => {
    const [hero] = MODERN_EDUCATION_ASSETS.assets;
    const bad = {
      ...MODERN_EDUCATION_ASSETS,
      assets: [
        { ...hero, master: { width: 2000, height: 2000 } },
        { ...hero, key: 'wide', widths: [480, 3000] },
      ],
    };
    expect(themeAssetManifestSchema.safeParse(bad).success).toBe(false);
  });
});

describe('released theme asset files', () => {
  it('every released folder still exists (released versions are immutable)', () => {
    for (const folder of RELEASED_THEME_ASSET_FOLDERS) {
      expect(existsSync(join(PUBLIC_ROOT, folder)), folder).toBe(true);
    }
  });

  it('nothing is served from an unreleased folder', () => {
    if (!existsSync(PUBLIC_ROOT)) return;
    for (const theme of readdirSync(PUBLIC_ROOT)) {
      if (!statSync(join(PUBLIC_ROOT, theme)).isDirectory()) continue;
      for (const version of readdirSync(join(PUBLIC_ROOT, theme))) {
        expect(RELEASED_THEME_ASSET_FOLDERS).toContain(`${theme}/${version}`);
      }
    }
  });

  it.each(released.map(({ entry }) => [entry.key, entry.key]))(
    '%s has every derivative, within its weight budget',
    (key) => {
      const { manifest, entry } = released.find((r) => r.entry.key === key)!;
      const folder = `${manifest.theme}/${entry.version}`;
      expect(RELEASED_THEME_ASSET_FOLDERS).toContain(folder);
      for (const format of manifest.formats) {
        for (const width of entry.widths) {
          const file = join(PUBLIC_ROOT, folder, `${key}-${width}.${format}`);
          expect(existsSync(file), file).toBe(true);
        }
      }
      const budgetWidth =
        [...entry.widths].reverse().find((width) => width <= 1200) ??
        entry.widths[0];
      const avif = join(PUBLIC_ROOT, folder, `${key}-${budgetWidth}.avif`);
      expect(statSync(avif).size).toBeLessThanOrEqual(entry.budgetBytes);
    }
  );
});

describe('template references', () => {
  it('every theme-asset reference in the exported templates names a manifest key', () => {
    const dir = join(REPO, 'e2e', 'theme-baseline', 'fixtures', 'generated');
    const references = existsSync(dir)
      ? readdirSync(dir)
          .filter((file) => file.endsWith('.json'))
          .flatMap(
            (file) =>
              readFileSync(join(dir, file), 'utf8').match(
                /theme-asset:[a-z0-9-]+\/[a-z0-9-]+/g
              ) ?? []
          )
      : [];
    for (const reference of new Set(references)) {
      const [theme, key] = reference.slice('theme-asset:'.length).split('/');
      expect(
        THEME_ASSET_MANIFESTS[theme]?.assets.some((a) => a.key === key),
        reference
      ).toBe(true);
    }
  });
});

describe('resolveThemeAsset', () => {
  const RELEASED: ThemeAssetManifest = {
    ...MODERN_EDUCATION_ASSETS,
    assets: [
      {
        ...MODERN_EDUCATION_ASSETS.assets[0],
        status: 'released',
        version: 'v1',
        lqip: 'data:image/webp;base64,UklGRg==',
      },
    ],
  };
  const manifests = { 'modern-education': RELEASED };

  it('resolves a released asset to AVIF/WebP srcsets, size, LQIP and focal point', () => {
    const asset = resolveThemeAsset(
      'theme-asset:modern-education/home-hero',
      manifests
    )!;
    expect(asset.sources.map((s) => s.type)).toEqual([
      'image/avif',
      'image/webp',
    ]);
    expect(asset.sources[0].srcSet).toBe(
      [480, 800, 1200, 1600]
        .map(
          (w) => `/theme-assets/modern-education/v1/home-hero-${w}.avif ${w}w`
        )
        .join(', ')
    );
    expect(asset.src).toBe(
      '/theme-assets/modern-education/v1/home-hero-800.webp'
    );
    expect(asset).toMatchObject({
      width: 2000,
      height: 2500,
      objectPosition: '45% 55%',
      priority: true,
      lqip: 'data:image/webp;base64,UklGRg==',
    });
  });

  it('resolves pending, unknown and malformed references to null', () => {
    expect(
      resolveThemeAsset('theme-asset:modern-education/home-hero')
    ).toBeNull();
    expect(
      resolveThemeAsset('theme-asset:modern-education/nope', manifests)
    ).toBeNull();
    expect(resolveThemeAsset('theme-asset:../x', manifests)).toBeNull();
  });

  it('only a pending theme asset changes whether an image draws', () => {
    expect(hasRenderableImage(undefined)).toBe(false);
    expect(hasRenderableImage('')).toBe(false);
    expect(hasRenderableImage('https://cdn.example/a.png')).toBe(true);
    expect(hasRenderableImage('/api/v1/public/media/a/b.png')).toBe(true);
    expect(hasRenderableImage('theme-asset:modern-education/home-hero')).toBe(
      false
    );
    expect(resolveImageUrl('https://cdn.example/a.png')).toBe(
      'https://cdn.example/a.png'
    );
    expect(
      resolveImageUrl('theme-asset:modern-education/home-hero')
    ).toBeUndefined();
  });
});
