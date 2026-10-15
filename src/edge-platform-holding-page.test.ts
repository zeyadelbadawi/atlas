/**
 * B0-WEB-13 (owner decision D6) — the platform host's edge rules for the
 * retired marketing site (Caddyfile).
 *
 * The holding page at `/` and `/ar` carries `X-Robots-Tag: noindex, follow`
 * on the response, not only in the meta tag the app adds once it has run,
 * and `/blog` + `/blog/*` are a real 404 instead of the SPA's 200 "not
 * found" page. Both are scoped to the platform host (apex, www): the same
 * site block serves every academy subdomain, whose `/` is the academy's
 * home page and which may have a page called `blog`; the connected-domain
 * block must not carry either rule at all. These tests read the real file.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');

/** The body of a top-level block, by the exact line that opens it. */
function block(opening: string): string {
  const start = caddyfile.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = caddyfile.slice(start + 1).search(/\n[^\s#}][^\n]*\{\n/);
  return next === -1
    ? caddyfile.slice(start)
    : caddyfile.slice(start, start + 1 + next);
}

/** `text` without its comment lines (the comments name the rules). */
function directives(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
}

const PLATFORM_HOSTS = /host atlass\.dpdns\.org www\.atlass\.dpdns\.org\n/;

const platform = directives(block('atlass.dpdns.org, *.atlass.dpdns.org'));
const customDomains = directives(block(':443'));

describe('holding page X-Robots-Tag (Caddyfile)', () => {
  it('matches exactly /, /ar and /ar/ on the platform host only', () => {
    const matcher = platform.match(/@holding_page \{([^}]*)\}/);
    expect(matcher).not.toBeNull();
    expect(matcher?.[1]).toMatch(PLATFORM_HOSTS);
    expect(matcher?.[1]).toMatch(/\bpath \/ \/ar \/ar\/\n/);
    // Exact paths: no wildcard that would reach /index.html, /ar/contact…
    expect(matcher?.[1]).not.toContain('*');
  });

  it('sends noindex, follow, deferred like the verify page', () => {
    expect(platform).toMatch(
      /header @holding_page \{\s*X-Robots-Tag "noindex, follow"\s*defer\s*\}/
    );
  });

  it('is not in the shared page-policy snippet or on connected domains', () => {
    expect(block('(page_policy_headers)')).not.toContain('holding_page');
    expect(customDomains).not.toContain('holding_page');
    expect(customDomains).not.toContain('noindex, follow');
  });
});

describe('retired /blog is a real 404 (Caddyfile)', () => {
  it('matches /blog and /blog/* on the platform host only', () => {
    const matcher = platform.match(/@retired_blog \{([^}]*)\}/);
    expect(matcher).not.toBeNull();
    expect(matcher?.[1]).toMatch(PLATFORM_HOSTS);
    expect(matcher?.[1]).toMatch(/\bpath \/blog \/blog\/\*\n/);
  });

  it('serves the app shell with status 404', () => {
    expect(platform).toMatch(
      /handle @retired_blog \{\s*rewrite \* \/index\.html\s*file_server \{\s*status 404\s*\}\s*\}/
    );
  });

  it('is routed inside the document handler, before the SPA fallback', () => {
    // Inside the handler that sets the document's headers…
    expect(platform.indexOf('handle @retired_blog')).toBeGreaterThan(
      platform.indexOf('import page_policy_headers')
    );
    // …and ahead of `try_files`, which would answer 200.
    expect(platform.indexOf('handle @retired_blog')).toBeLessThan(
      platform.indexOf('try_files {path} /index.html')
    );
  });

  it('leaves connected domains (academy websites) untouched', () => {
    expect(customDomains).not.toContain('retired_blog');
    expect(customDomains).not.toMatch(/\/blog/);
    expect(customDomains).not.toContain('status 404');
  });
});

describe('certificate verify page rule (unchanged)', () => {
  it('still marks /verify noindex, nofollow on every host', () => {
    const snippet = block('(page_policy_headers)');
    expect(snippet).toMatch(/@verify_page path \/verify \/verify\/\*\n/);
    expect(snippet).toMatch(
      /header @verify_page \{\s*X-Robots-Tag "noindex, nofollow"\s*defer\s*\}/
    );
    expect(platform).toContain('import page_policy_headers');
    expect(customDomains).toContain('import page_policy_headers');
  });
});
