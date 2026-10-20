/**
 * B0-OPS-04 — the origin answers only Cloudflare.
 *
 * Every legitimate request reaches the origin through Cloudflare (proxied
 * platform records, Cloudflare for SaaS for connected domains), so a
 * connection from any other address is someone going around the WAF, the
 * rate limits and the edge cache. Caddy drops it before any route runs.
 *
 * Verified with Caddy v2.10.2 (20 Oct 2026): without `order abort first`
 * the abort sorted after `redir` and `handle` and every route still
 * answered; without `auto_https disable_redirects` Caddy's own HTTP->HTTPS
 * redirect for the platform names ran ahead of the lock on port 80.
 *
 * These tests read the real Caddyfile so they fail if the lock is removed
 * from a site block, the two Cloudflare lists drift apart, or the ordering
 * that makes the lock effective is undone.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');
/** Directives only: comments can quote anything. */
const directives = caddyfile
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

function ranges(line: RegExp): string[] {
  const match = directives.match(line);
  expect(match).not.toBeNull();
  return match![1].trim().split(/\s+/);
}

const trusted = ranges(/trusted_proxies static ([^\n]+)/);
const locked = ranges(/not remote_ip ([^\n]+)/);

/** The body of a top-level site block, by the exact line that opens it. */
function siteBlock(opening: string): string {
  const start = directives.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = directives.slice(start + 1).search(/\n[^\s}][^\n]*\{\n/);
  return next === -1
    ? directives.slice(start)
    : directives.slice(start, start + 1 + next);
}

describe('origin lock (Caddyfile)', () => {
  it('admits exactly the Cloudflare ranges it trusts as proxies, plus private addresses', () => {
    expect(trusted.length).toBeGreaterThan(10);
    expect(locked.filter((r) => r !== 'private_ranges')).toEqual(trusted);
    expect(locked).toContain('private_ranges');
  });

  it('matches the socket peer, never a forwarded header', () => {
    const matcher =
      directives.match(/@direct_to_origin \{\n([\s\S]*?)\n\t\}/)?.[1] ?? '';
    expect(matcher).toMatch(/^\s*not remote_ip /m);
    expect(matcher).not.toContain('client_ip');
    expect(directives).toMatch(/\babort @direct_to_origin\b/);
  });

  it.each([
    ['platform and academy subdomains', 'atlass.dpdns.org, *.atlass.dpdns.org'],
    ['the help center (DL-57)', 'docs.atlass.dpdns.org, doc.atlass.dpdns.org, help.atlass.dpdns.org'],
    ['plain HTTP', ':80'],
    ['connected custom domains', ':443'],
  ])('locks %s as the first directive of the site block', (_name, opening) => {
    const block = siteBlock(opening);
    expect(block.split('\n')[2].trim()).toBe('import origin_lock');
  });

  it('runs the abort before any route, and owns the port-80 redirect', () => {
    const globals = directives.slice(
      directives.indexOf('\n{\n'),
      directives.indexOf('\natlass.dpdns.org, ')
    );
    expect(globals).toContain('order abort first');
    expect(globals).toContain('auto_https disable_redirects');
    expect(siteBlock(':80')).toContain('redir https://{host}{uri} permanent');
  });

  it('keeps an env kill switch that defaults to locked', () => {
    expect(directives).toMatch(
      /@direct_to_origin \{\s*expression `\{env\.ATLAS_ORIGIN_LOCK\} != "off"`/
    );
  });
});
