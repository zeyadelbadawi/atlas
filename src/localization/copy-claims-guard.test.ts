/**
 * B0 copy guard — phrases that described behaviour the product does not
 * have. Scans every EN and AR resource file, so a claim cannot come back
 * through a different key.
 *
 * - B0-CPY-01: a learner's phone IS visible to academy owners/managers
 *   and Atlas platform administrators.
 * - B0-CPY-09 / B0-MED-01: hosted video cannot be authored, so no copy may
 *   promise uploading or protecting hosted video.
 * - B0-CPY-19: there is no learner forum, no live-session reminder email
 *   and no deadline-reminder event.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, 'resources');

function strings(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === 'string') out.push([path, value]);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      strings(child, path ? `${path}.${key}` : key, out);
    }
  }
}

function allStrings(lang: 'en' | 'ar'): [string, string][] {
  const out: [string, string][] = [];
  for (const file of readdirSync(resolve(ROOT, lang))) {
    if (!file.endsWith('.json')) continue;
    const ns = file.replace(/\.json$/, '');
    strings(
      JSON.parse(readFileSync(resolve(ROOT, lang, file), 'utf-8')),
      ns,
      out
    );
  }
  return out;
}

const BANNED: Record<'en' | 'ar', { pattern: RegExp; scope?: RegExp }[]> = {
  en: [
    { pattern: /only you can see it/i },
    { pattern: /academies and other users can['’]t see it/i },
    { pattern: /hosted video/i, scope: /^auth\.register\.plan\./ },
    { pattern: /upload\/choose a hosted video/i },
    {
      pattern: /discussion replies|live sessions|deadlines/i,
      scope: /^notifications\.communication\./,
    },
  ],
  ar: [
    { pattern: /لا يراه أحد غيرك/ },
    { pattern: /لا تراه الأكاديميات/ },
    { pattern: /المستضافة/, scope: /^auth\.register\.plan\./ },
    { pattern: /فيديو مستضافًا/ },
    {
      pattern: /النقاشات|الجلسات المباشرة/,
      scope: /^notifications\.communication\./,
    },
  ],
};

describe.each(['en', 'ar'] as const)('copy claims guard (%s)', (lang) => {
  const all = allStrings(lang);

  it('has resource strings to check', () => {
    expect(all.length).toBeGreaterThan(1000);
  });

  it.each(BANNED[lang].map((rule) => [String(rule.pattern), rule] as const))(
    'no string matches %s',
    (_label, rule) => {
      const hits = all
        .filter(([key]) => !rule.scope || rule.scope.test(key))
        .filter(([, text]) => rule.pattern.test(text))
        .map(([key]) => key);
      expect(hits).toEqual([]);
    }
  );
});
