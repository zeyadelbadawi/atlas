/**
 * B0-WEB-01 — on academy hosts, /robots.txt and /sitemap.xml must reach the
 * backend's per-academy generator, not the platform's static files.
 *
 * Caddy serves an existing file before anything else (`try_files`, and the
 * SSR matcher's `not file`), so the platform's robots.txt/sitemap.xml in
 * /srv used to answer for every academy subdomain and connected domain.
 * These tests read the real Caddyfile so they fail if the routing is
 * removed, or if the platform host starts proxying its own files.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');

/** The body of a top-level site block, by the exact line that opens it. */
function siteBlock(opening: string): string {
  const start = caddyfile.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = caddyfile.slice(start + 1).search(/\n[^\s#}][^\n]*\{\n/);
  return next === -1
    ? caddyfile.slice(start)
    : caddyfile.slice(start, start + 1 + next);
}

const platform = siteBlock('atlass.dpdns.org, *.atlass.dpdns.org');
const customDomains = siteBlock(':443');

describe('academy robots.txt and sitemap.xml routing (Caddyfile)', () => {
  it.each([
    ['academy subdomains', platform],
    ['connected custom domains', customDomains],
  ])(
    '%s send both files to the backend generator with the visitor host',
    (_name, block) => {
      expect(block).toMatch(
        /@academy_seo_files \{[^}]*path \/robots\.txt \/sitemap\.xml/
      );
      expect(block).toContain('rewrite * /api/v1/public/websites/host{path}');
      expect(block).toContain('header_up X-Forwarded-Host {host}');
      // Routed before the static file server, which would otherwise win.
      expect(block.indexOf('handle @academy_seo_files')).toBeLessThan(
        block.indexOf('try_files {path} /index.html')
      );
    }
  );

  it('keeps the platform host on its own static files', () => {
    expect(platform).toMatch(
      /@academy_seo_files \{\s*not host atlass\.dpdns\.org www\.atlass\.dpdns\.org/
    );
  });
});
