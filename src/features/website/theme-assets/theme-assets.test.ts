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
import { ATELIER_ASSETS } from './manifests/atelier.manifest';
import type { ThemeAssetEntry, ThemeAssetManifest } from './theme-asset.types';

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
  'theme-card',
];

/** Atelier's asset keys (Reports/THEME_2_ATELIER_PLAN.md §5). */
const ATELIER_KEYS = [
  'home-hero',
  'home-philosophy',
  'home-method',
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
  'course-fallback',
  'theme-card',
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

  it('Atelier holds exactly its plan keys, once each, with one LCP image', () => {
    expect(ATELIER_ASSETS.assets.map((a) => a.key)).toEqual(ATELIER_KEYS);
    expect(
      ATELIER_ASSETS.assets.filter((a) => a.priority).map((a) => a.key)
    ).toEqual(['home-hero']);
  });

  it('releases Atelier’s learning photographs as v3, hero at full-window widths; v1 and v2 kept', () => {
    const hero = ATELIER_ASSETS.assets.find((a) => a.key === 'home-hero')!;
    expect(hero.version).toBe('v3');
    // The opening scene's full window at 1440, 1920 and 2560 CSS px (1x),
    // and 2x up to the widest the 3686 px master allows; never upscaled.
    expect(hero.widths).toEqual([480, 800, 1200, 1600, 2000, 2560, 3200]);
    expect(hero.master).toEqual({ width: 3680, height: 4600 });
    expect(hero.provenance?.masterSha256).toBe(
      'cc1628a9d2b76ee325bdd97bb6b7f1b00ada416ee36994bad4a655e2fbfb47a8'
    );
    // Every Atelier photograph was replaced together (5 Oct 2026).
    for (const entry of ATELIER_ASSETS.assets) {
      expect(entry.version, entry.key).toBe('v3');
    }
    expect(RELEASED_THEME_ASSET_FOLDERS).toEqual(
      expect.arrayContaining(['atelier/v1', 'atelier/v2', 'atelier/v3'])
    );
    // Earlier versions stay served for anything that still references them.
    for (const [version, widths] of [
      ['v1', [480, 800, 1200, 1600]],
      ['v2', [480, 800, 1200, 1600, 2000, 2560, 3200]],
    ] as const) {
      for (const width of widths) {
        for (const format of ATELIER_ASSETS.formats) {
          expect(
            existsSync(
              join(
                PUBLIC_ROOT,
                'atelier',
                version,
                `home-hero-${width}.${format}`
              )
            )
          ).toBe(true);
        }
      }
    }
  });

  it('shares no photograph between Atelier and Modern Education', () => {
    const atelier = new Set(
      ATELIER_ASSETS.assets.map((a) => a.provenance?.masterSha256)
    );
    for (const entry of MODERN_EDUCATION_ASSETS.assets) {
      expect(atelier.has(entry.provenance?.masterSha256), entry.key).toBe(
        false
      );
    }
  });

  it('freezes every asset’s slot, crops, safe area, exclusion zone and RTL behaviour', () => {
    for (const entry of [
      ...MODERN_EDUCATION_ASSETS.assets,
      ...ATELIER_ASSETS.assets,
    ]) {
      const { composition } = entry;
      expect(
        composition.crops.map((crop) => crop.breakpoint),
        entry.key
      ).toEqual(['desktop', 'tablet', 'mobile']);
      expect(composition.crops[0].ratio, entry.key).not.toBe('hidden');
      expect(composition.rtl, entry.key).toContain('not mirrored');
    }
  });

  it('builds a prompt with the subject, ratio, art direction and exclusions', () => {
    const [hero] = MODERN_EDUCATION_ASSETS.assets;
    const prompt = buildThemeAssetPrompt(MODERN_EDUCATION_ASSETS, hero);
    expect(prompt).toContain(hero.direction);
    expect(prompt).toContain('4:5 aspect ratio');
    expect(prompt).toContain(MODERN_EDUCATION_ASSETS.artDirection);
    expect(prompt).toContain('No text');
  });

  it('records exactly the prompt the manifest builds for every released asset', () => {
    for (const { manifest, entry } of released) {
      expect(entry.provenance?.prompt, entry.key).toBe(
        buildThemeAssetPrompt(manifest, entry)
      );
    }
  });

  it('refuses a released entry without its version, LQIP and provenance', () => {
    const manifest = {
      ...MODERN_EDUCATION_ASSETS,
      // A pending entry marked released without releasing it.
      assets: [
        { ...asPending(MODERN_EDUCATION_ASSETS.assets[2]), status: 'released' },
      ],
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

/** An entry as it was before release: no version, LQIP or provenance. */
function asPending(entry: ThemeAssetEntry): ThemeAssetEntry {
  const { version: _v, lqip: _l, provenance: _p, ...rest } = entry;
  return { ...rest, status: 'pending' };
}

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
      asPending(
        MODERN_EDUCATION_ASSETS.assets.find(
          (entry) => entry.key === 'home-cta'
        )!
      ),
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
      objectPosition: '46% 76%',
      priority: true,
      lqip: 'data:image/webp;base64,UklGRg==',
    });
  });

  it('resolves pending, unknown and malformed references to null', () => {
    expect(
      resolveThemeAsset('theme-asset:modern-education/home-cta', manifests)
    ).toBeNull();
    expect(
      resolveThemeAsset('theme-asset:modern-education/nope', manifests)
    ).toBeNull();
    expect(resolveThemeAsset('theme-asset:../x', manifests)).toBeNull();
  });

  it('only an unresolved theme asset changes whether an image draws', () => {
    expect(hasRenderableImage(undefined)).toBe(false);
    expect(hasRenderableImage('')).toBe(false);
    expect(hasRenderableImage('https://cdn.example/a.png')).toBe(true);
    expect(hasRenderableImage('/api/v1/public/media/a/b.png')).toBe(true);
    // Every shipped entry is released; an unknown key stands in for one
    // that isn't (the pending case is covered with a manifest above).
    expect(
      hasRenderableImage('theme-asset:modern-education/not-released')
    ).toBe(false);
    expect(hasRenderableImage('theme-asset:modern-education/home-hero')).toBe(
      true
    );
    expect(resolveImageUrl('https://cdn.example/a.png')).toBe(
      'https://cdn.example/a.png'
    );
    expect(
      resolveImageUrl('theme-asset:modern-education/not-released')
    ).toBeUndefined();
  });
});
