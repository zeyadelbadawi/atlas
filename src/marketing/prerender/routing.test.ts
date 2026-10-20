/**
 * The marketing routing decision shared by the Vite dev/preview servers —
 * and kept in step with the Caddyfile's apex rules, which it mirrors.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MARKETING_PLANNED_PATHS,
  MARKETING_ROOT_FILES,
  isMarketingGonePath,
  marketingFileForPath,
  resolveMarketingRequest,
} from './routing';

const BUILT = new Set([
  'index.html',
  'ar/index.html',
  'pricing/index.html',
  'ar/pricing/index.html',
  'privacy-policy/index.html',
  '404.html',
  'ar/404.html',
  'robots.txt',
  'sitemap.xml',
  'sitemaps/marketing-en.xml',
  'llms.txt',
  'llms-full.txt',
  'pricing.md',
]);
const exists = (file: string) => BUILT.has(file);
const route = (path: string, search = '') =>
  resolveMarketingRequest(path, search, exists);

describe('resolveMarketingRequest', () => {
  it.each([
    ['/', 'index.html'],
    ['/ar', 'ar/index.html'],
    ['/pricing', 'pricing/index.html'],
    ['/ar/pricing', 'ar/pricing/index.html'],
  ])('serves %s from %s', (path, file) => {
    expect(route(path)).toEqual({ kind: 'file', file, status: 200 });
  });

  it('301s a trailing slash once, keeping the query', () => {
    expect(route('/ar/')).toEqual({
      kind: 'redirect',
      location: '/ar',
      status: 301,
    });
    expect(route('/pricing/', '?utm_source=x')).toEqual({
      kind: 'redirect',
      location: '/pricing?utm_source=x',
      status: 301,
    });
    expect(route('/privacy-policy/')).toMatchObject({
      location: '/privacy-policy',
    });
  });

  it('serves the root files, and a real 404 for a missing one', () => {
    for (const file of [
      '/robots.txt',
      '/sitemap.xml',
      '/sitemaps/marketing-en.xml',
      '/llms.txt',
      '/llms-full.txt',
      '/pricing.md',
    ]) {
      expect(route(file)).toEqual({
        kind: 'file',
        file: file.slice(1),
        status: 200,
      });
    }
    expect(route('/sitemaps/marketing-xx.xml')).toEqual({
      kind: 'notFound',
      file: null,
      status: 404,
    });
  });

  it('answers retired and planned URLs, and unknown /ar paths, with the branded 404', () => {
    expect(route('/blog')).toEqual({
      kind: 'notFound',
      file: '404.html',
      status: 404,
    });
    expect(route('/blog/old-post')).toMatchObject({
      file: '404.html',
      status: 404,
    });
    for (const planned of MARKETING_PLANNED_PATHS) {
      expect(route(planned)).toMatchObject({ file: '404.html', status: 404 });
      expect(route(`/ar${planned}`)).toMatchObject({
        file: 'ar/404.html',
        status: 404,
      });
    }
    expect(route('/ar/does-not-exist')).toMatchObject({
      file: 'ar/404.html',
      status: 404,
    });
  });

  it('leaves app paths to the single-page app', () => {
    for (const path of [
      '/dashboard',
      '/dashboard/academy',
      '/auth/register',
      '/auth/sign-in',
      '/index.html',
      '/unknown',
      '/verify/abc',
      '/marketing/index.html',
      '/404.html',
      '/features/',
    ]) {
      expect(route(path), path).toBeNull();
    }
    expect(
      resolveMarketingRequest('/../etc/passwd', '', () => true)
    ).toBeNull();
  });

  it('serves nothing when nothing is built', () => {
    expect(resolveMarketingRequest('/', '', () => false)).toBeNull();
    expect(resolveMarketingRequest('/blog', '', () => false)).toBeNull();
    expect(resolveMarketingRequest('/ar/x', '', () => false)).toBeNull();
  });

  it('maps paths to files', () => {
    expect(marketingFileForPath('/')).toBe('index.html');
    expect(marketingFileForPath('/ar/pricing')).toBe('ar/pricing/index.html');
    expect(isMarketingGonePath('/features')).toBe(false);
    expect(isMarketingGonePath('/ar/blog/')).toBe(true);
  });
});

describe('the Caddyfile mirrors these rules', () => {
  const caddyfile = readFileSync(
    resolve(__dirname, '../../../Caddyfile'),
    'utf8'
  );
  /** A named matcher's definition body (`@name { … }`, braces balanced). */
  function matcher(name: string, text = caddyfile): string {
    const opening = new RegExp(`\\n\\s*@${name} \\{\\n`).exec(text);
    expect(opening, `@${name}`).not.toBeNull();
    const start = opening!.index + opening![0].length;
    let depth = 1;
    for (let i = start; i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(start, i);
      }
    }
    throw new Error(`@${name} is not closed`);
  }

  it('lists every root file', () => {
    const paths = matcher('marketing_root_file');
    for (const file of MARKETING_ROOT_FILES)
      expect(paths).toContain(` ${file}`);
    expect(paths).toContain(' /sitemaps/*');
  });

  it('404s every planned page and its Arabic twin', () => {
    const paths = matcher('marketing_gone');
    for (const planned of MARKETING_PLANNED_PATHS) {
      expect(paths).toContain(` ${planned}`);
      expect(paths).toContain(` /ar${planned}`);
    }
    expect(paths).toMatch(/ \/blog \/blog\/\* /);
  });
});
