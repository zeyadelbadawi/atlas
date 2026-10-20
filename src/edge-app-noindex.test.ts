/**
 * B1-4 — on the platform host only the marketing site is indexed.
 *
 * Sign-in, registration and the dashboards are served by the app shell
 * (`index.html`) on atlass.dpdns.org. They carried no robots policy and the
 * shell's fallback description was the retired "operating system for
 * education businesses" line, which SPEC §A.10 bans. These tests read the
 * real Caddyfile and `index.html`.
 *
 * Checked with Caddy v2.10.2 (20 Oct 2026): apex app routes get
 * `noindex, follow`, academy subdomains get no header, `/verify` keeps its
 * own `noindex, nofollow`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');
const indexHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

/** The platform site block's last `handle`: the app shell fallback. */
function platformAppHandle(): string {
  const start = caddyfile.indexOf('\natlass.dpdns.org, *.atlass.dpdns.org {');
  const end = caddyfile.indexOf('\n\thandle_errors {', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const block = caddyfile.slice(start, end);
  return block.slice(block.lastIndexOf('\n\t\thandle {'));
}

describe('app shell on the platform host (Caddyfile)', () => {
  it('marks the app noindex on the apex and www only', () => {
    const handle = platformAppHandle();
    expect(handle).toContain(
      '@platform_app host atlass.dpdns.org www.atlass.dpdns.org'
    );
    expect(handle).toContain(
      'header @platform_app X-Robots-Tag "noindex, follow"'
    );
    expect(handle).toContain('try_files {path} /index.html');
    // Academy subdomains share this block and must stay indexable.
    expect(handle).not.toMatch(/header X-Robots-Tag/);
  });
});

describe('app shell fallback metadata (index.html)', () => {
  it('uses the current positioning, never the retired tagline', () => {
    expect(indexHtml).not.toMatch(/operating system for education/i);
    expect(indexHtml).toContain(
      '<meta name="description" content="Your own teaching academy online, under your name." />'
    );
  });

  it('keeps the title equal to the product name the academy hooks compare against', () => {
    expect(indexHtml).toContain('<title>Atlas</title>');
  });
});
