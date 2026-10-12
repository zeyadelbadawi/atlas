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
 * - B0-CPY-02/03/06/07/10/14/16/17: organization rename, invite policy,
 *   trial rule, review time, staff dialogs, who reviews academy payments,
 *   and invoices — each stated as it actually works.
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
    { pattern: /change it later/i, scope: /^auth\.register\.organization\./ },
    { pattern: /whatever the policy says/i },
    { pattern: /once per account/i },
    { pattern: /a day or two/i, scope: /^tenant\.lifecycle\./ },
    { pattern: /brand-new Atlas account/i },
    { pattern: /reviewed by Atlas/i, scope: /^payments\.academy/ },
    { pattern: /only the academy owner/i, scope: /^payments\./ },
    { pattern: /invoices/i, scope: /^notifications\.communication\./ },
    { pattern: /receipts/i, scope: /^learning\.learnerDashboard\.purchases\./ },
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
    { pattern: /تغييره لاحق/, scope: /^auth\.register\.organization\./ },
    { pattern: /مهما كانت السياسة/ },
    { pattern: /مرة واحدة لكل حساب/ },
    { pattern: /يومًا أو يومين/, scope: /^tenant\.lifecycle\./ },
    { pattern: /حساب أطلس جديدًا/ },
    { pattern: /تراجع أطلس/, scope: /^payments\.academy/ },
    { pattern: /مالك الأكاديمية فقط/, scope: /^payments\./ },
    { pattern: /الفواتير/, scope: /^notifications\.communication\./ },
    { pattern: /إيصالاتك/, scope: /^learning\.learnerDashboard\.purchases\./ },
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
