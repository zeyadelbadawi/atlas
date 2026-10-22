/**
 * CMS phase 3d — the academy site's CSP lets the map section's frame in,
 * and nothing broader.
 *
 * The map section inserts `https://www.google.com/maps?q=…&output=embed`
 * only after a visitor presses "Show map" (`sections/bodies/MapPanel.tsx`).
 * The app CSP (`(csp)`, used by academy sites) allows exactly the path
 * `/maps` on www.google.com: not the origin, and not `/maps/` (a source
 * ending in `/` matches only paths under it, which blocks `/maps?q=…`).
 * The help center's strict policy keeps `frame-src 'none'`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  googleMapsDirectionsUrl,
  googleMapsEmbedUrl,
} from './features/website/sections/bodies/section-bodies.logic';

const directives = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf-8')
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n');

function policy(snippet: string): string {
  return (
    new RegExp(
      `\\(${snippet}\\) \\{[\\s\\S]*?Content-Security-Policy \`([^\`]+)\``
    ).exec(directives)?.[1] ?? ''
  );
}

function frameSources(csp: string): string[] {
  const directive = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('frame-src '));
  return directive ? directive.split(/\s+/).slice(1) : [];
}

describe('map section frame — CSP', () => {
  it('the app CSP allows the Google Maps embed path and no other Google source', () => {
    const sources = frameSources(policy('csp'));
    expect(sources).toContain('https://www.google.com/maps');
    const google = sources.filter((source) => source.includes('google.com'));
    expect(google).toEqual(['https://www.google.com/maps']);
  });

  it('the frame the section inserts is exactly what that source matches', () => {
    const embed = new URL(googleMapsEmbedUrl('12 Tahrir St., Dokki'));
    expect(embed.origin).toBe('https://www.google.com');
    expect(embed.pathname).toBe('/maps');
    expect(embed.searchParams.get('q')).toBe('12 Tahrir St., Dokki');
    expect(embed.searchParams.get('output')).toBe('embed');
  });

  it('a typed query can only ever be a query value, never a path or another host', () => {
    const hostile = 'x&output=html#/../evil?<script>';
    const embed = new URL(googleMapsEmbedUrl(hostile));
    expect(embed.origin + embed.pathname).toBe('https://www.google.com/maps');
    expect(embed.searchParams.get('q')).toBe(hostile);
    expect(embed.searchParams.getAll('output')).toEqual(['embed']);
    const directions = new URL(googleMapsDirectionsUrl(hostile));
    expect(directions.origin + directions.pathname).toBe(
      'https://www.google.com/maps/search/'
    );
    expect(directions.searchParams.get('query')).toBe(hostile);
  });

  it('the help center keeps frames off entirely', () => {
    expect(frameSources(policy('docs_csp'))).toEqual(["'none'"]);
  });
});
