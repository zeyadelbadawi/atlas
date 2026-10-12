/**
 * B0-WEB-08 / B0-LRN-10 — page-policy headers at the edge (Caddyfile).
 *
 * `/sw.js` is always revalidated, and `/verify` + `/verify/*` (certificate
 * verification, which names a learner) carry `X-Robots-Tag: noindex`, on
 * the platform/subdomain block AND the connected-domain block. The header
 * behaviour itself was checked with a real Caddy (v2.8.4) run; these tests
 * read the real file so removing either rule, or importing it in only one
 * site block, fails the build.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');

function block(opening: string): string {
  const start = caddyfile.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = caddyfile.slice(start + 1).search(/\n[^\s#}][^\n]*\{\n/);
  return next === -1
    ? caddyfile.slice(start)
    : caddyfile.slice(start, start + 1 + next);
}

describe('page policy headers (Caddyfile)', () => {
  const snippet = block('(page_policy_headers)');

  it('revalidates the service worker script', () => {
    expect(snippet).toContain('header /sw.js Cache-Control "no-cache"');
  });

  it('marks certificate verification pages noindex, deferred past the SSR proxy', () => {
    expect(snippet).toMatch(/@verify_page path \/verify \/verify\/\*/);
    expect(snippet).toMatch(
      /header @verify_page \{\s*X-Robots-Tag "noindex, nofollow"\s*defer\s*\}/
    );
  });

  it.each([
    ['platform and academy subdomains', 'atlass.dpdns.org, *.atlass.dpdns.org'],
    ['connected custom domains', ':443'],
  ])('is applied on %s', (_name, opening) => {
    expect(block(opening)).toContain('import page_policy_headers');
  });

  it('does not disallow /verify in robots.txt (the header must stay readable)', () => {
    const robots = readFileSync(
      resolve(__dirname, '../public/robots.txt'),
      'utf-8'
    );
    expect(robots).not.toMatch(/Disallow:\s*\/verify/);
  });
});
