/**
 * Dates follow the user's chosen language, not the browser's.
 *
 * WHAT WAS WRONG. Two dozen screens rendered dates with a bare
 * `new Date(value).toLocaleDateString()`. With no locale argument that
 * uses the BROWSER's locale — so an Arabic user on an en-US machine saw
 * `9/12/2026`, the same user on a de-DE machine would have seen
 * `12.9.2026`, and Atlas chose neither. Spotted in production in the media
 * details dialog, where a browser-locale date sat directly under a
 * correctly localized size (`٣٨١ بايت`).
 *
 * The first test is the one that matters long-term: it re-scans the source
 * tree, so the pattern cannot quietly return in a new file.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { formatDate } from '@utils';

const SRC = resolve(__dirname, '../..');

/** Every `.ts`/`.tsx` under `src`, excluding tests and this file's own guards. */
function sourceFiles(dir: string): readonly string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('no screen formats a date in the browser locale', () => {
  it('has no locale-less toLocaleDateString/toLocaleString/toLocaleTimeString', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf-8');
      // The hook's own doc comment names the bad pattern to explain it.
      if (file.endsWith('useDateFormatter.ts')) continue;
      // `chart.tsx` is a vendored shadcn primitive that formats raw numeric
      // axis values, not user-facing dates.
      if (file.endsWith(join('components', 'ui', 'chart.tsx'))) continue;

      for (const match of source.matchAll(
        /\.toLocale(?:Date|Time)?String\(\s*\)/g
      )) {
        offenders.push(`${file.slice(SRC.length + 1)} :: ${match[0]}`);
      }
    }

    expect(
      offenders,
      `Use useDateFormatter() so the date follows the user's language:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});

describe('the formatter honours the language it is given', () => {
  const when = '2026-09-12T10:30:00.000Z';

  it('writes an Arabic month name in Arabic', () => {
    const text = formatDate(when, 'ar', 'short');
    expect(text).toMatch(/[؀-ۿ]/);
    // Not the English abbreviation.
    expect(text).not.toContain('Sep');
  });

  it('writes an English month name in English', () => {
    expect(formatDate(when, 'en', 'short')).toContain('Sep');
  });

  /*
   * The point of the fix: the SAME instant renders differently per
   * language, and neither rendering depends on the host machine.
   */
  it('produces different text per language for one instant', () => {
    expect(formatDate(when, 'ar', 'short')).not.toBe(
      formatDate(when, 'en', 'short')
    );
  });

  it('returns an empty string rather than "Invalid Date"', () => {
    expect(formatDate('not-a-date', 'ar', 'short')).toBe('');
    expect(formatDate('not-a-date', 'en', 'short')).toBe('');
  });
});
