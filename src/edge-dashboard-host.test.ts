/**
 * DL-63 — the platform app on dashboard.<base>. These tests read the real
 * Caddyfile so they fail if the dashboard loses its own block (it would fall
 * into the academy wildcard and its SEO files/renderer), its origin lock,
 * its security headers or its noindex; or if the apex redirects stop being
 * gated by ATLAS_DASHBOARD_REDIRECT or start catching `/api/*`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');
const directives = caddyfile
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

function siteBlock(opening: string): string {
  const start = directives.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = directives.slice(start + 1).search(/\n[^\s}][^\n]*\{\n/);
  return next === -1 ? directives.slice(start) : directives.slice(start, start + 1 + next);
}

const dashboard = siteBlock('dashboard.atlass.dpdns.org');
const apex = siteBlock('atlass.dpdns.org, *.atlass.dpdns.org');

describe('dashboard host (Caddyfile)', () => {
  it('has its own block, origin-locked first, with its own DNS-01 certificate', () => {
    expect(dashboard.split('\n')[2].trim()).toBe('import origin_lock');
    expect(dashboard).toMatch(/tls \{\s*dns cloudflare \{env\.CLOUDFLARE_API_TOKEN\}\s*\}/);
    expect(directives.indexOf('\ndashboard.atlass.dpdns.org {')).toBeLessThan(
      directives.indexOf('\n:80 {')
    );
  });

  it('serves the app with the platform security headers and keeps the whole host out of search', () => {
    for (const snippet of ['import security_headers', 'import csp', 'import hsts_platform', 'import page_policy_headers', 'import app_assets', 'import theme_assets']) {
      expect(dashboard).toContain(snippet);
    }
    expect(dashboard).toContain('header X-Robots-Tag "noindex, nofollow"');
    expect(dashboard).toContain('root * /srv');
    expect(dashboard).toContain('try_files {path} /index.html');
  });

  it('proxies the API with the host it actually reached, never a client header', () => {
    expect(dashboard).toMatch(/handle \/api\/\* \{\s*reverse_proxy backend:3000 \{\s*header_up X-Real-IP \{client_ip\}\s*header_up X-Forwarded-Host \{host\}/);
  });

  it('never serves marketing files, academy SEO files, the server renderer or the retired worker', () => {
    expect(dashboard).not.toMatch(/\/srv-marketing|\/srv-docs|ssr_proxy|\/api\/v1\/public\/websites\/host/);
    expect(dashboard).toContain('@dashboard_not_here path /sitemap.xml /marketing-assets/* /sw-retired.js');
    expect(dashboard).toMatch(/handle @dashboard_not_here \{\s*respond 404/);
  });
});

describe('apex after the move (Caddyfile)', () => {
  it('redirects old app links to the dashboard only when switched on, path and query kept', () => {
    expect(apex).toMatch(/@app_moved \{\s*host atlass\.dpdns\.org\s*expression `\{env\.ATLAS_DASHBOARD_REDIRECT\} == "on"`/);
    expect(apex).toContain('redir @app_moved https://dashboard.atlass.dpdns.org{uri} 302');
    const paths = apex.match(/@app_moved \{[\s\S]*?path ([^\n]+)/)?.[1] ?? '';
    for (const path of ['/auth/*', '/dashboard/*', '/onboarding/*', '/verify/*', '/academy-chooser']) {
      expect(paths.split(' ')).toContain(path);
    }
    expect(paths).not.toMatch(/\/api/);
  });

  it('retires the apex service worker and stops serving the app shell there, only when switched on', () => {
    expect(apex).toMatch(/@apex_retired_worker \{\s*host atlass\.dpdns\.org\s*expression `\{env\.ATLAS_DASHBOARD_REDIRECT\} == "on"`\s*path \/sw\.js/);
    expect(apex).toContain('rewrite * /sw-retired.js');
    expect(apex).toMatch(/@apex_no_app \{\s*host atlass\.dpdns\.org\s*expression `\{env\.ATLAS_DASHBOARD_REDIRECT\} == "on"`/);
  });

  it('keeps the API on the apex (unsubscribe, webhooks, Google callback)', () => {
    expect(apex).toMatch(/handle \/api\/\* \{\s*reverse_proxy backend:3000/);
  });
});
