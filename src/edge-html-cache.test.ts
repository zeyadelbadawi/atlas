/**
 * Edge cache for documents that are the same for every visitor (22 Oct
 * 2026). These tests read the real Caddyfile and deploy workflow so they
 * fail if the `edge_html` headers reach anything per-user or per-academy
 * (the API, academy websites), replace the year-long cache of hashed
 * assets or the service worker's `no-cache`, or if a deploy stops purging
 * the tag those documents carry.
 *
 * Checked with Caddy v2.10.2 (22 Oct 2026) on a local run of the real
 * Caddyfile: apex marketing pages, root files and branded 404s, docs pages
 * and 404s, and the dashboard's app shell answer `public, max-age=0,
 * s-maxage=86400` with `Cache-Tag: atlas-html`; /assets/* stays immutable,
 * /sw.js, dashboard real files and academy pages stay `no-cache`, and
 * redirects carry no tag.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');
const deploy = readFileSync(
  resolve(__dirname, '../.github/workflows/deploy.yml'),
  'utf-8'
);
const directives = caddyfile
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

function siteBlock(opening: string): string {
  const start = directives.indexOf(`\n${opening} {`);
  expect(start).toBeGreaterThan(-1);
  const next = directives.slice(start + 1).search(/\n[^\s}][^\n]*\{\n/);
  return next === -1
    ? directives.slice(start)
    : directives.slice(start, start + 1 + next);
}

/** The body of the `handle <matcher> {` block that starts at `opening`. */
function handleBlock(scope: string, opening: string): string {
  const start = scope.indexOf(opening);
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = start; i < scope.length; i += 1) {
    if (scope[i] === '{') depth += 1;
    if (scope[i] === '}') {
      depth -= 1;
      if (depth === 0) return scope.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated block: ${opening}`);
}

const apex = siteBlock('atlass.dpdns.org, *.atlass.dpdns.org');
const dashboard = siteBlock('dashboard.atlass.dpdns.org');
const docs = siteBlock(
  'docs.atlass.dpdns.org, doc.atlass.dpdns.org, help.atlass.dpdns.org'
);
const customDomains = siteBlock(':443');

describe('edge-cached documents (Caddyfile)', () => {
  it('lets Cloudflare keep a document for a day, browsers revalidate, and tags it for the deploy purge', () => {
    const snippet =
      /\(edge_html\) \{([\s\S]*?)\n\}/.exec(directives)?.[1] ?? '';
    expect(snippet).toContain(
      'header {args[0]} Cache-Control "public, max-age=0, s-maxage=86400"'
    );
    expect(snippet).toContain('header {args[0]} Cache-Tag "atlas-html"');
  });

  it('is applied to the static marketing pages, root files and branded 404s on the apex', () => {
    for (const opening of [
      'handle @marketing_root_file {',
      'handle @marketing_page {',
      'handle @marketing_gone_ar {',
      'handle @marketing_gone {',
      'handle @apex_no_app {',
    ]) {
      const block = handleBlock(apex, opening);
      expect(block).toContain('import edge_html *');
      expect(block).toContain('root * /srv-marketing');
    }
    expect(apex.match(/import edge_html/g)).toHaveLength(5);
  });

  it('never reaches the API, academy websites or the app shell they share', () => {
    expect(handleBlock(apex, 'handle /api/* {')).not.toContain('edge_html');
    expect(handleBlock(apex, 'handle @academy_page {')).not.toContain(
      'edge_html'
    );
    expect(handleBlock(apex, 'handle @academy_seo_files {')).not.toContain(
      'edge_html'
    );
    expect(customDomains).not.toContain('edge_html');
  });

  it('is applied to the dashboard app shell only, not its real files (the service worker keeps no-cache)', () => {
    expect(dashboard).toMatch(
      /@dashboard_shell not file\s*import edge_html @dashboard_shell\s*try_files \{path\} \/index\.html/
    );
    expect(dashboard.match(/import edge_html/g)).toHaveLength(1);
    expect(handleBlock(dashboard, 'handle /api/* {')).not.toContain(
      'edge_html'
    );
  });

  it('is applied to help-center pages and 404s, never its hashed assets and media', () => {
    expect(handleBlock(docs, 'handle @docs_found {')).toMatch(
      /@docs_document not path \/assets\/\* \/media\/\*\s*import edge_html @docs_document/
    );
    expect(docs.match(/import edge_html \*/g)).toHaveLength(2);
    expect(handleBlock(docs, 'handle @docs_off {')).not.toContain('edge_html');
  });
});

describe('deploy purges the edge-cached documents', () => {
  it('purges the atlas-html tag after the rollout, with a zone-scoped token from secrets', () => {
    const rollout = deploy.indexOf('- name: Deploy to VPS');
    const purge = deploy.indexOf('- name: Purge the edge-cached documents');
    expect(rollout).toBeGreaterThan(-1);
    expect(purge).toBeGreaterThan(rollout);
    const step = deploy.slice(purge);
    expect(step).toContain('CF_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(step).toContain('CF_ZONE: ${{ secrets.CLOUDFLARE_ZONE_ID }}');
    expect(step).toContain('{"tags":["atlas-html"]}');
    expect(step).not.toContain('purge_everything');
  });
});
