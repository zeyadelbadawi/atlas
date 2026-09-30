/**
 * Which layer sets the security headers, asserted against the Caddyfile.
 *
 * WHAT WAS WRONG. The site block declared the four security headers
 * site-wide, which meant Caddy also stamped them onto every response it
 * PROXIED to the Nest app — and that app sets its own via helmet.
 * Production returned, on `/api/v1/auth/login`:
 *
 *   x-content-type-options: nosniff        (twice)
 *   x-frame-options: SAMEORIGIN            (twice)
 *   referrer-policy: strict-origin-when-cross-origin, no-referrer
 *   strict-transport-security: max-age=31536000, max-age=15552000
 *
 * The last two differ, so the effective policy was decided by spec
 * tie-breaks — Referrer Policy takes the last valid value, RFC 6797 §8.1
 * takes the first HSTS — across two layers that knew nothing about each
 * other. A duplicated `X-Frame-Options` is the one with teeth: browsers
 * may treat a multi-valued XFO as invalid and ignore it.
 *
 * A SECOND, QUIETER GAP. The catch-all `:443` block — the one that serves
 * academies on their own connected domains — had no header block at all.
 * Same app, same files, no security headers, purely because of which
 * hostname the visitor arrived on.
 *
 * These tests read the real Caddyfile that ships in this repo, so they
 * fail if either property is undone.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');

/**
 * The Caddyfile with comment lines removed.
 *
 * The comments in that file explain this very bug and name the headers
 * while doing so, which would otherwise count as declarations.
 */
const directives = caddyfile
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

const SECURITY_HEADERS = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
] as const;

/** The `handle /api/* { ... }` bodies — the proxied routes. */
function apiHandlerBodies(): readonly string[] {
  const bodies: string[] = [];
  const marker = 'handle /api/* {';
  let from = 0;
  for (;;) {
    const start = caddyfile.indexOf(marker, from);
    if (start === -1) break;
    let depth = 0;
    let i = start + marker.length - 1;
    const open = i;
    for (; i < caddyfile.length; i += 1) {
      if (caddyfile[i] === '{') depth += 1;
      else if (caddyfile[i] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    bodies.push(caddyfile.slice(open + 1, i));
    from = i;
  }
  return bodies;
}

describe("the proxy does not duplicate the API's own headers", () => {
  it('routes /api/* on both site blocks', () => {
    // If this drops to one, the assertions below stop covering a real path.
    expect(apiHandlerBodies()).toHaveLength(2);
  });

  it.each(SECURITY_HEADERS)(
    'does not set %s on proxied responses',
    (header) => {
      for (const body of apiHandlerBodies()) {
        expect(body).not.toContain(header);
      }
    }
  );

  /*
   * The exact regression that produced the duplicates: a `header` block at
   * site level applies to proxied responses too. Security headers belong
   * inside the static handler, never as a bare site-wide directive.
   */
  it('declares the headers once, in reusable snippets', () => {
    expect(directives).toContain('(security_headers)');
    for (const header of SECURITY_HEADERS) {
      // One definition only — the snippet's. HSTS (P63g) is the deliberate
      // exception: two snippets, one per ownership (platform tree vs. a
      // customer's own domain), each declared exactly once.
      const occurrences = directives.split(header).length - 1;
      const expected = header === 'Strict-Transport-Security' ? 2 : 1;
      expect(occurrences, `${header} is declared more than once`).toBe(
        expected
      );
    }
    expect(directives).toContain('(hsts_platform)');
    expect(directives).toContain('(hsts_custom_domain)');
  });
});

describe('P63g — HSTS scope follows ownership', () => {
  it('the platform block asserts includeSubDomains; the custom-domain catch-all does not', () => {
    expect(directives).toContain(
      'Strict-Transport-Security "max-age=31536000; includeSubDomains"'
    );
    expect(directives).toContain(
      'Strict-Transport-Security "max-age=31536000"'
    );
    expect(directives.split('import hsts_platform').length - 1).toBe(1);
    expect(directives.split('import hsts_custom_domain').length - 1).toBe(1);
    // The catch-all imports the custom-domain snippet, never the platform one.
    const catchAll = directives.slice(directives.indexOf('\n:443 {'));
    expect(catchAll).toContain('import hsts_custom_domain');
    expect(catchAll).not.toContain('import hsts_platform');
  });

  it('forwards the real client address and trusts only Cloudflare as a proxy', () => {
    expect(directives).toContain('header_up X-Real-IP {client_ip}');
    expect(directives).not.toContain('header_up X-Real-IP {remote_host}');
    expect(directives).toContain('trusted_proxies static');
    expect(directives).toContain('104.16.0.0/13');
  });

  it('redirects plain HTTP on custom hostnames to HTTPS', () => {
    expect(directives).toContain(':80 {');
    expect(directives).toContain('redir https://{host}{uri} permanent');
  });
});

describe('every document Caddy serves gets the headers', () => {
  it('imports the snippet in both static handlers', () => {
    const imports = directives.split('import security_headers').length - 1;
    // One per site block's document handler (the main wildcard host, and
    // the custom-domain catch-all that previously had none), plus one in
    // the shared `(theme_assets)` handler, which both site blocks import,
    // plus one in the shared `(ssr_unavailable)` fallback (Phase 8: the
    // single-page app served when the public website renderer is down),
    // which both site blocks' error handlers import.
    expect(imports).toBe(4);
    expect(directives.split('import theme_assets').length - 1).toBe(2);
    const catchAll = directives.slice(directives.indexOf('\n:443 {'));
    expect(catchAll).toContain('import theme_assets');
  });

  /*
   * Theme 1 plan §E.4 — versioned theme photographs are immutable, but
   * only when the file exists: a cached 404 would outlive the deploy that
   * adds the file.
   */
  it('marks only existing theme assets immutable, with no SPA fallback', () => {
    const start = directives.indexOf('(theme_assets) {');
    const block = directives.slice(start, directives.indexOf('\n}\n', start));
    expect(block).toContain('handle /theme-assets/* {');
    expect(block).toContain('@found file');
    expect(block).toContain(
      'header @found Cache-Control "public, max-age=31536000, immutable"'
    );
    expect(block).not.toContain('try_files');
  });

  it.each(SECURITY_HEADERS)('still defines %s', (header) => {
    expect(directives).toContain(header);
  });

  /*
   * HSTS is a host-level policy, so the shortest max-age any response
   * carries wins. This value must stay in step with the API's — see the
   * backend's `common/security/helmet.options.ts`.
   */
  it('sets HSTS to one year, matching the API', () => {
    expect(directives).toContain(
      'Strict-Transport-Security "max-age=31536000; includeSubDomains"'
    );
  });
});

/**
 * Phase 8 — server-rendered public Academy pages
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md). The routing's safety properties,
 * asserted against the Caddyfile that ships.
 */
describe('public website server rendering at the edge', () => {
  /** The body of the named snippet. */
  function snippet(name: string): string {
    const start = directives.indexOf(`(${name}) {`);
    expect(start, `snippet ${name} exists`).toBeGreaterThan(-1);
    return directives.slice(start, directives.indexOf('\n}\n', start));
  }

  const catchAll = directives.slice(directives.indexOf('\n:443 {'));
  const platform = directives.slice(
    directives.indexOf('atlass.dpdns.org, *.atlass.dpdns.org {'),
    directives.indexOf('\n:80 {')
  );

  it('is off unless ATLAS_SSR is on, in both site blocks', () => {
    for (const block of [platform, catchAll]) {
      expect(block).toContain('expression {env.ATLAS_SSR} == "on"');
      expect(block).toContain('handle @academy_page {');
    }
  });

  it('never server-renders the platform itself (apex and www)', () => {
    expect(platform).toContain(
      'not host atlass.dpdns.org www.atlass.dpdns.org'
    );
  });

  it('sends only page reads for files that do not exist', () => {
    for (const block of [platform, catchAll]) {
      const start = block.indexOf('@academy_page {');
      const matcher = block.slice(start, block.indexOf('\n\t\t}', start));
      expect(matcher).toContain('method GET HEAD');
      expect(matcher).toContain('not file');
    }
  });

  it('forwards the real client address and serves the SPA on a pass or a 5xx', () => {
    const proxy = snippet('ssr_proxy');
    expect(proxy).toContain('reverse_proxy ssr:3100');
    expect(proxy).toContain('header_up X-Real-IP {client_ip}');
    expect(proxy).toContain('@pass header X-Atlas-SSR pass');
    expect(proxy).toContain('@failed status 5xx');
    expect(proxy.split('rewrite * /index.html').length - 1).toBe(2);
    expect(proxy).toContain('vars atlas_ssr 1');
  });

  it('falls back to the SPA, with every document header, only for renderer requests', () => {
    const fallback = snippet('ssr_unavailable');
    expect(fallback).toContain('vars atlas_ssr 1');
    expect(fallback).toContain('not path /assets/*');
    expect(fallback).toContain('import security_headers');
    expect(fallback).toContain('import csp');
    expect(fallback).toContain('import {args[0]}');
    expect(fallback).toContain('status 200');
  });

  it('keeps each site block’s own HSTS on the fallback', () => {
    expect(platform).toContain('import ssr_unavailable hsts_platform');
    expect(catchAll).toContain('import ssr_unavailable hsts_custom_domain');
    expect(catchAll).not.toContain('import ssr_unavailable hsts_platform');
  });

  it('never routes the API to the renderer', () => {
    for (const body of apiHandlerBodies()) {
      expect(body).not.toContain('ssr');
    }
  });
});
