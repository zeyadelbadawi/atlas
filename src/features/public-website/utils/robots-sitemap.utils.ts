/**
 * robots.txt / sitemap.xml generation (Prompt 11).
 *
 * Pure string generators, reusing Prompt 10's `buildSitemapEntries`
 * (`@features/website`) unchanged for WHICH content qualifies — this
 * file only formats that already-filtered list into the two standard
 * text formats. Neither function performs any I/O; `PublicWebsiteRouter`
 * calls them and renders the result as plain text (see that file's doc
 * comment for the honest boundary around what a client-rendered SPA can
 * and cannot do for real `Content-Type: text/plain` serving).
 */
import type { SitemapEntry } from '@types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** `sitemapUrl`, when supplied, must be an absolute URL (built from `window.location.origin`, never an invented domain). */
export function generateRobotsTxt(indexable: boolean, sitemapUrl?: string): string {
  const lines = ['User-agent: *', indexable ? 'Allow: /' : 'Disallow: /'];
  if (sitemapUrl) lines.push('', `Sitemap: ${sitemapUrl}`);
  return lines.join('\n');
}

/** `baseUrl` must be an absolute origin (e.g. `https://harvard.example.com`) — every entry's `path` is appended to it. */
export function generateSitemapXml(entries: readonly SitemapEntry[], baseUrl: string): string {
  const urlNodes = entries
    .map(
      (entry) =>
        [
          '  <url>',
          `    <loc>${escapeXml(baseUrl + entry.path)}</loc>`,
          `    <lastmod>${entry.lastModified}</lastmod>`,
          `    <changefreq>${entry.changeFrequency}</changefreq>`,
          `    <priority>${entry.priority.toFixed(1)}</priority>`,
          '  </url>',
        ].join('\n')
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlNodes,
    '</urlset>',
  ].join('\n');
}
