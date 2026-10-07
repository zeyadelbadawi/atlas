/**
 * Riwaq's photographs (plan §7): every entry is released with its
 * provenance; the prompt the manifest derives is exactly the shared
 * `buildThemeAssetPrompt` (the text Magnific was sent); every derivative
 * the renderer can request exists and the lead image stays in budget; and
 * no master is shared with Themes 1–3 (the brief's no-reuse rule, checked
 * by the masters' sha256 as recorded at release).
 */
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildThemeAssetPrompt } from '../theme-asset.registry';
import { RIWAQ_ASSETS } from './riwaq.manifest';
import { ALL_THEME_ASSET_MANIFESTS } from './index';

const PUBLIC = resolve(__dirname, '../../../../../public/theme-assets');

describe('Riwaq asset manifest', () => {
  it('releases all twenty photographs, generated on Magnific and reviewed', () => {
    expect(RIWAQ_ASSETS.assets).toHaveLength(20);
    for (const entry of RIWAQ_ASSETS.assets) {
      expect(entry.status, entry.key).toBe('released');
      expect(entry.version).toBe('v1');
      expect(entry.lqip).toMatch(/^data:image\/webp;base64,/);
      expect(entry.provenance?.generator).toBe('magnific');
      expect(entry.provenance?.model).toContain('imagen-nano-banana-2');
      expect(entry.provenance?.reviewOutcome).toBe('approved');
      expect(entry.provenance?.masterSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.alt.en.length).toBeGreaterThan(10);
      expect(entry.alt.ar.length).toBeGreaterThan(10);
    }
  });

  it('records exactly the prompt the shared builder produces', () => {
    for (const entry of RIWAQ_ASSETS.assets) {
      expect(entry.provenance?.prompt, entry.key).toBe(
        buildThemeAssetPrompt(RIWAQ_ASSETS, entry)
      );
    }
  });

  it('ships every derivative the renderer can request, the hero within budget', () => {
    for (const entry of RIWAQ_ASSETS.assets) {
      for (const width of entry.widths) {
        for (const format of RIWAQ_ASSETS.formats) {
          const file = join(PUBLIC, 'riwaq', 'v1', `${entry.key}-${width}.${format}`);
          expect(existsSync(file), file).toBe(true);
        }
      }
      const budgetWidth = [...entry.widths].reverse().find((w) => w <= 1200)!;
      const bytes = statSync(
        join(PUBLIC, 'riwaq', 'v1', `${entry.key}-${budgetWidth}.avif`)
      ).size;
      expect(bytes, entry.key).toBeLessThanOrEqual(entry.budgetBytes);
    }
    const hero = RIWAQ_ASSETS.assets.find((entry) => entry.key === 'home-hero')!;
    expect(hero.priority).toBe(true);
    // The phone's lead image: 480w AVIF under 45 kB (plan §8).
    expect(statSync(join(PUBLIC, 'riwaq', 'v1', 'home-hero-480.avif')).size).toBeLessThanOrEqual(45_000);
  });

  it('reuses no photograph of Themes 1–3', () => {
    const others = new Set(
      Object.values(ALL_THEME_ASSET_MANIFESTS)
        .filter((manifest) => manifest.theme !== 'riwaq')
        .flatMap((manifest) => manifest.assets)
        .map((entry) => entry.provenance?.masterSha256)
        .filter((sha): sha is string => !!sha)
    );
    expect(others.size).toBeGreaterThan(20);
    const mine = RIWAQ_ASSETS.assets.map((entry) => entry.provenance!.masterSha256);
    expect(new Set(mine).size).toBe(mine.length);
    for (const sha of mine) expect(others.has(sha)).toBe(false);
  });
});
