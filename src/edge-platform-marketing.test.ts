/**
 * B1 / M1a (DL-50) — the platform host's edge rules for the static
 * marketing site (Caddyfile). Replaces the B0-WEB-13 holding-page rules.
 *
 *  - `www` 301s to the apex (path and query kept), except `/api/*`;
 *  - the marketing pages, root files and branded 404s are served from
 *    /srv-marketing, on the apex host only, and only when the file exists,
 *    so app routes still reach the single-page app;
 *  - `ATLAS_MARKETING_STATIC=off` turns the pages off (unset = on);
 *  - the holding page's `noindex` is gone (the site is indexable), and
 *    returns only for `/`, `/ar` while the static site is off;
 *  - academy subdomains and connected domains (`:443`) carry none of it.
 *
 * These tests read the real file; the behaviour was checked with a real
 * Caddy (v2.10.2) and a curl matrix (see the B1 infrastructure report).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8');
const dockerfile = readFileSync(resolve(__dirname, '../Dockerfile'), 'utf-8');

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

/** A named matcher's definition body (`@name { … }`, braces balanced). */
function matcher(text: string, name: string): string {
  const opening = new RegExp(`\\n\\s*@${name} \\{\\n`).exec(text);
  expect(opening, `@${name}`).not.toBeNull();
  const start = opening!.index + opening![0].length;
  let depth = 1;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i);
    }
  }
  throw new Error(`@${name} is not closed`);
}

const platform = directives(block('atlass.dpdns.org, *.atlass.dpdns.org'));
const customDomains = directives(block(':443'));

const ON = '{env.ATLAS_MARKETING_STATIC} != "off"';

describe('www → apex (M0, RDM L3–L8)', () => {
  it('redirects www permanently to the apex with path and query, except the API', () => {
    const www = matcher(platform, 'www_host');
    expect(www).toMatch(/host www\.atlass\.dpdns\.org\n/);
    expect(www).toMatch(/not path \/api\/\*\n/);
    expect(platform).toContain(
      'redir @www_host https://atlass.dpdns.org{uri} permanent'
    );
  });

  it('is not on connected domains', () => {
    expect(customDomains).not.toContain('www_host');
    expect(customDomains).not.toContain('redir');
  });
});

describe('static marketing site (Caddyfile)', () => {
  it('serves pages from /srv-marketing on the apex only, when the file exists', () => {
    const page = matcher(platform, 'marketing_page');
    expect(page).toMatch(/host atlass\.dpdns\.org\n/);
    expect(page).not.toContain('www.');
    expect(page).toContain('method GET HEAD');
    expect(page).toContain(`expression \`${ON}\``);
    expect(page).toMatch(
      /file \{\s*root \/srv-marketing\s*try_files \{path\}\/index\.html\s*\}/
    );
    expect(platform).toMatch(
      /handle @marketing_page \{\s*(?:import edge_html \*\s*)?root \* \/srv-marketing\s*rewrite \* \{file_match\.relative\}\s*file_server\s*\}/
    );
  });

  it('301s a trailing slash on a page to the slash-less URL, query kept', () => {
    const slash = matcher(platform, 'marketing_slash');
    expect(slash).toMatch(/path \*\/\n/);
    expect(slash).toMatch(/not path \/\n/);
    expect(slash).toContain('try_files {path}index.html');
    expect(platform).toMatch(
      /handle @marketing_slash \{\s*route \{\s*uri strip_suffix \/\s*redir \* \{path\}\{\?query\} permanent\s*\}\s*\}/
    );
  });

  it('serves the root files from /srv-marketing with UTF-8 text types and no app fallback', () => {
    const files = matcher(platform, 'marketing_root_file');
    expect(files).toMatch(/host atlass\.dpdns\.org\n/);
    expect(files).toContain(
      'path /robots.txt /sitemap.xml /sitemaps/* /llms.txt /llms-full.txt /pricing.md /marketing-assets/*'
    );
    const handler = platform.slice(
      platform.indexOf('handle @marketing_root_file {')
    );
    const body = handler.slice(0, handler.indexOf('\n\t\t}\n'));
    expect(body).toContain('root * /srv-marketing');
    expect(body).toContain(
      'header /pricing.md Content-Type "text/markdown; charset=utf-8"'
    );
    expect(body).toContain(
      'header /llms.txt Content-Type "text/plain; charset=utf-8"'
    );
    expect(body).toContain(
      'header /llms-full.txt Content-Type "text/plain; charset=utf-8"'
    );
    expect(body).toContain('file_server');
    expect(body).not.toContain('try_files');
    expect(body).not.toContain('index.html');
  });

  it('answers /blog, the planned pages and unknown /ar paths with the branded 404', () => {
    const ar = matcher(platform, 'marketing_gone_ar');
    expect(ar).toContain('path /ar/*');
    expect(ar).toContain('try_files /ar/404.html');
    const gone = matcher(platform, 'marketing_gone');
    expect(gone).toMatch(/path \/blog \/blog\/\* /);
    expect(gone).toContain('/features/content-protection');
    expect(gone).toContain('try_files /404.html');
    expect(platform).toMatch(
      /handle @marketing_gone_ar \{\s*(?:import edge_html \*\s*)?root \* \/srv-marketing\s*rewrite \* \/ar\/404\.html\s*file_server \{\s*status 404\s*\}\s*\}/
    );
    expect(platform).toMatch(
      /handle @marketing_gone \{\s*(?:import edge_html \*\s*)?root \* \/srv-marketing\s*rewrite \* \/404\.html\s*file_server \{\s*status 404\s*\}\s*\}/
    );
  });

  it('is routed inside the document handler (same headers), in order, before the app', () => {
    const order = [
      'import page_policy_headers',
      'handle @marketing_root_file',
      'handle @marketing_slash',
      'handle @marketing_page',
      'handle @marketing_gone_ar',
      'handle @marketing_gone',
      'handle @retired_blog',
      'handle @academy_page',
      'try_files {path} /index.html',
    ].map((marker) => platform.indexOf(marker));
    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const documentHandler = platform.slice(
      platform.lastIndexOf('import security_headers')
    );
    expect(documentHandler).toContain('import csp');
    expect(documentHandler).toContain('import hsts_platform');
    expect(documentHandler).toContain('import static_cache');
  });

  it('can be switched off by ATLAS_MARKETING_STATIC=off (unset or empty = on)', () => {
    for (const name of [
      'marketing_slash',
      'marketing_page',
      'marketing_gone_ar',
      'marketing_gone',
    ]) {
      expect(matcher(platform, name)).toContain(`expression \`${ON}\``);
    }
    const off = matcher(platform, 'marketing_static_off');
    expect(off).toContain('expression `{env.ATLAS_MARKETING_STATIC} == "off"`');
    expect(off).toMatch(/path \/ \/ar \/ar\/\n/);
    expect(platform).toMatch(
      /header @marketing_static_off \{\s*X-Robots-Tag "noindex, follow"\s*defer\s*\}/
    );
  });

  it('no longer marks the home page noindex while the site is on', () => {
    expect(platform).not.toContain('holding_page');
    expect(caddyfile).not.toContain('@holding_page');
  });

  it('keeps the retired blog a real 404 when the static site is off', () => {
    const blog = matcher(platform, 'retired_blog');
    expect(blog).toMatch(/host atlass\.dpdns\.org www\.atlass\.dpdns\.org\n/);
    expect(platform).toMatch(
      /handle @retired_blog \{\s*rewrite \* \/index\.html\s*file_server \{\s*status 404\s*\}\s*\}/
    );
  });

  it('leaves academy subdomains and connected domains untouched', () => {
    expect(customDomains).not.toMatch(
      /marketing|srv-marketing|status 404|\/blog/
    );
    for (const name of [
      'marketing_page',
      'marketing_slash',
      'marketing_root_file',
      'marketing_gone',
      'marketing_gone_ar',
    ]) {
      expect(matcher(platform, name)).toMatch(/host atlass\.dpdns\.org\n/);
    }
  });
});

describe('the image keeps marketing files out of /srv (Dockerfile)', () => {
  it('moves dist/marketing and the marketing images to /srv-marketing', () => {
    expect(dockerfile).toContain('rm -rf dist/marketing');
    expect(dockerfile).toContain(
      'mv dist/marketing-assets dist-marketing/marketing-assets'
    );
    expect(dockerfile).toContain(
      'COPY --from=build /app/dist-marketing /srv-marketing'
    );
    expect(dockerfile).not.toMatch(/MARKETING_PLANS_ALLOW_SNAPSHOT=1/);
  });
});

describe('B2 — the email logo is a static marketing file', () => {
  it('ships the Atlas mark as a 96 px PNG (Gmail renders no SVG) under /marketing-assets/brand/', () => {
    // The backend's email layout points at exactly this path on the apex
    // (`PLATFORM_LOGO_PATH`); the root-file handler above serves it with
    // the edge cache headers and no cookies.
    const png = readFileSync(resolve(__dirname, '../public/marketing-assets/brand/atlas-mark-email-2x.png'));
    expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(96);
    expect(png.readUInt32BE(20)).toBe(96);
  });
});
