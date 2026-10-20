/**
 * DL-57 — the help center on docs.<base>. These tests read the real
 * Caddyfile and Dockerfile so they fail if the docs host loses its own block
 * (it would fall into the academy wildcard), its origin lock, its strict
 * CSP, its kill switch, or if any other host could read /srv-docs.
 *
 * Checked with Caddy v2.10.2 (20 Oct 2026) on a local run of this file:
 * docs pages 200 with `noindex, nofollow` while ATLAS_DOCS_STATIC is unset,
 * indexable with `on`, 503 with `off`; doc./help. and the apex /docs paths
 * 301 to docs.<base>; /api/* other than the beacon and CSP reports 404;
 * unknown paths get the branded 404 in their language.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');
const dockerfile = readFileSync(resolve(__dirname, '../Dockerfile'), 'utf-8');
const directives = caddyfile
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

const OPENING = 'docs.atlass.dpdns.org, doc.atlass.dpdns.org, help.atlass.dpdns.org';

function siteBlock(opening: string): string {
  const start = directives.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = directives.slice(start + 1).search(/\n[^\s}][^\n]*\{\n/);
  return next === -1 ? directives.slice(start) : directives.slice(start, start + 1 + next);
}

const docs = siteBlock(OPENING);

describe('help center host (Caddyfile)', () => {
  it('has its own site block, before the port-80 and custom-domain catch-alls', () => {
    const at = directives.indexOf(`\n${OPENING} {`);
    expect(at).toBeGreaterThan(directives.indexOf('\natlass.dpdns.org, *.atlass.dpdns.org {'));
    expect(at).toBeLessThan(directives.indexOf('\n:80 {'));
    expect(docs.split('\n')[2].trim()).toBe('import origin_lock');
    expect(docs).toMatch(/tls \{\s*dns cloudflare \{env\.CLOUDFLARE_API_TOKEN\}\s*\}/);
  });

  it('sends doc. and help. to docs., path and query kept', () => {
    expect(docs).toContain('@docs_alias host doc.atlass.dpdns.org help.atlass.dpdns.org');
    expect(docs).toContain('redir @docs_alias https://docs.atlass.dpdns.org{uri} permanent');
  });

  it('proxies only the beacon and CSP reports to the API', () => {
    expect(docs).toContain('@docs_api path /api/v1/mkt/events /api/v1/security/csp-reports');
    expect(docs.match(/reverse_proxy /g)).toHaveLength(1);
    expect(docs).toMatch(/handle \/api\/\* \{\s*respond 404/);
  });

  it('serves only /srv-docs, and no other block reads it', () => {
    expect(docs).toContain('root * /srv-docs');
    expect(docs).not.toMatch(/root \* \/srv(\s|$)|\/srv-marketing|ssr_proxy|try_files \{path\} \/index\.html/);
    const elsewhere = directives.replace(docs, '');
    expect(elsewhere).not.toContain('/srv-docs');
  });

  it('keeps pages noindex until ATLAS_DOCS_STATIC is on, and can switch them off', () => {
    expect(docs).toMatch(/@docs_preview expression `\{env\.ATLAS_DOCS_STATIC\} != "on"`\s*header @docs_preview X-Robots-Tag "noindex, nofollow"/);
    expect(docs).toMatch(/@docs_off expression `\{env\.ATLAS_DOCS_STATIC\} == "off"`/);
    expect(docs).toMatch(/respond "[^"]+" 503/);
  });

  it('uses the strict help-center CSP and platform HSTS', () => {
    expect(docs).toContain('import docs_csp');
    expect(docs).toContain('import hsts_platform');
    expect(docs).toContain('import security_headers');
    const csp = /\(docs_csp\) \{[\s\S]*?Content-Security-Policy `([^`]+)`/.exec(directives)?.[1] ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain('unsafe');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("frame-src 'none'");
  });

  it('answers unknown paths with the branded 404 in their language', () => {
    expect(docs).toMatch(/handle \/ar\/\* \{\s*rewrite \* \/ar\/404\.html\s*file_server \{\s*status 404/);
    expect(docs).toMatch(/rewrite \* \/404\.html\s*file_server \{\s*status 404/);
  });

  it('forwards the planned apex /docs paths to the docs host', () => {
    const platform = siteBlock('atlass.dpdns.org, *.atlass.dpdns.org');
    expect(platform).toContain('redir @docs_moved_ar https://docs.atlass.dpdns.org/ar{re.docs_ar.1} permanent');
    expect(platform).toContain('redir @docs_moved https://docs.atlass.dpdns.org{re.docs.1} permanent');
    expect(platform).toMatch(/@docs_moved \{\s*host atlass\.dpdns\.org/);
  });
});

describe('help center image tree (Dockerfile)', () => {
  it('moves dist/docs out of /srv into /srv-docs', () => {
    expect(dockerfile).toMatch(/cp -R dist\/docs\/\. dist-docs\/ && rm -rf dist\/docs/);
    expect(dockerfile).toContain('COPY --from=build /app/dist-docs /srv-docs');
  });
});
