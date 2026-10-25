/**
 * Atlas mobile app — the App Links / Universal Links files must reach the
 * backend on the platform host and every academy subdomain, ahead of the
 * static file server (which would answer with the SPA shell, and phones
 * would then refuse the association).
 *
 * Reads the real Caddyfile, so this fails if the routes are removed or
 * moved after the catch-all.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');

function siteBlock(opening: string): string {
  const start = caddyfile.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = caddyfile.slice(start + 1).search(/\n[^\s#}][^\n]*\{\n/);
  return next === -1
    ? caddyfile.slice(start)
    : caddyfile.slice(start, start + 1 + next);
}

const platform = siteBlock('atlass.dpdns.org, *.atlass.dpdns.org');

describe('mobile app link files (Caddyfile)', () => {
  it.each([
    ['assetlinks.json', 'assetlinks.json'],
    ['apple-app-site-association', 'apple-app-site-association'],
  ])('/.well-known/%s goes to the backend', (file, endpoint) => {
    const opening = `handle /.well-known/${file} {`;
    expect(platform).toContain(opening);
    const body = platform.slice(platform.indexOf(opening));
    expect(body.slice(0, body.indexOf('\n\t}'))).toContain(
      `rewrite * /api/v1/public/mobile/${endpoint}`
    );
    // Before the SPA's catch-all `handle {` and its static files.
    expect(platform.indexOf(opening)).toBeLessThan(
      platform.indexOf('try_files {path} /index.html')
    );
  });
});
