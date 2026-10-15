/**
 * Owner decision D6 — the platform host's build-time `sitemap.xml` lists
 * only the indexable kept pages (contact, privacy policy, terms): never
 * the noindex holding page and never a retired marketing page. The build
 * config is read as text (the router-test precedent) to prove it is the
 * list the sitemap plugin is given.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PLATFORM_SITEMAP_EXCLUDED,
  PLATFORM_SITEMAP_ROUTES,
} from './platform-sitemap';
import { RETIRED_MARKETING_ROUTES } from './route-paths';

const VITE_CONFIG = readFileSync(
  resolve(__dirname, '../../../vite.config.ts'),
  'utf8'
);

describe('platform sitemap (D6)', () => {
  it('lists exactly contact and the legal documents', () => {
    expect([...PLATFORM_SITEMAP_ROUTES]).toEqual([
      '/contact',
      '/privacy-policy',
      '/terms',
    ]);
  });

  it('leaves out the holding page, the scaffold blog index and every retired marketing page', () => {
    expect([...PLATFORM_SITEMAP_EXCLUDED]).toEqual(['/', '/blog']);
    for (const path of ['/', '/ar', ...RETIRED_MARKETING_ROUTES]) {
      expect(PLATFORM_SITEMAP_ROUTES).not.toContain(path);
    }
  });

  it('is what the build hands the sitemap plugin', () => {
    expect(VITE_CONFIG).toContain(
      'dynamicRoutes: [...PLATFORM_SITEMAP_ROUTES]'
    );
    expect(VITE_CONFIG).toContain('exclude: [...PLATFORM_SITEMAP_EXCLUDED]');
  });
});
