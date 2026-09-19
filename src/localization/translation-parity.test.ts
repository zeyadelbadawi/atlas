/**
 * Every key that exists in English exists in Arabic, and vice versa.
 *
 * WHY THIS IS WORTH A TEST. Atlas ships both languages as first-class:
 * Arabic is not a translation layer added later, it is half the product,
 * and an RTL customer is the one who notices first. A key added to
 * `en/*.json` and forgotten in `ar/*.json` does not fail the build, does
 * not warn, and does not throw — i18next falls back to English, so the
 * gap shows up as one English sentence in the middle of an Arabic screen,
 * which is exactly the kind of thing that survives to production. The
 * reverse (a stale Arabic key with no English counterpart) is quieter but
 * still rot: dead copy that no reviewer will ever see rendered.
 *
 * WHY IT READS THE FILES RATHER THAN THE REGISTRY. The pairing is what is
 * being checked, so the test must be able to see one side without the
 * other; going through `TRANSLATION_RESOURCES` would only compare what
 * the registry already declares in pairs.
 *
 * PLURALS ARE COMPARED BY BASE KEY, NOT BY SUFFIX. i18next picks the
 * category through `Intl.PluralRules`, and Arabic has six where English
 * has two — `trialDaysRemaining_few` SHOULD exist in Arabic and must not
 * exist in English. Demanding a literal one-to-one suffix match would
 * force exactly the wrong thing (see `trial-countdown-plurals.test.ts`
 * for the bug that grammar-correct plurals fixed). What is required is
 * that the base key is translated at all, and that each language carries
 * at least the categories its own grammar uses.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RESOURCES = resolve(__dirname, 'resources');

/** The i18next plural/context suffixes a key may legitimately carry. */
const PLURAL_SUFFIX =
  /_(zero|one|two|few|many|other|ordinal_zero|ordinal_one|ordinal_two|ordinal_few|ordinal_many|ordinal_other)$/;

type Bundle = Record<string, unknown>;

function leafKeys(value: Bundle, prefix = ''): readonly string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? leafKeys(child as Bundle, path)
      : [path];
  });
}

/** Leaf keys with any plural suffix stripped, so the two languages are comparable. */
function baseKeys(bundle: Bundle): ReadonlySet<string> {
  return new Set(leafKeys(bundle).map((key) => key.replace(PLURAL_SUFFIX, '')));
}

function read(language: 'en' | 'ar', file: string): Bundle {
  return JSON.parse(
    readFileSync(resolve(RESOURCES, language, file), 'utf8')
  ) as Bundle;
}

const files = readdirSync(resolve(RESOURCES, 'en'))
  .filter((file) => file.endsWith('.json'))
  .sort();

describe('translation bundles', () => {
  it('ships the same set of namespaces in both languages', () => {
    const arabic = readdirSync(resolve(RESOURCES, 'ar'))
      .filter((file) => file.endsWith('.json'))
      .sort();
    expect(arabic).toEqual(files);
  });

  it.each(files)('%s — every English key is translated', (file) => {
    const english = baseKeys(read('en', file));
    const arabic = baseKeys(read('ar', file));
    const missing = [...english].filter((key) => !arabic.has(key)).sort();
    expect(missing).toEqual([]);
  });

  it.each(files)('%s — no Arabic key has lost its English source', (file) => {
    const english = baseKeys(read('en', file));
    const arabic = baseKeys(read('ar', file));
    const orphaned = [...arabic].filter((key) => !english.has(key)).sort();
    expect(orphaned).toEqual([]);
  });

  /*
   * A plural key must carry `_other` in both languages — that is the
   * category i18next falls back to — and the Arabic side must not be a
   * single form standing in for six.
   */
  it.each(files)('%s — plural keys keep their _other fallback', (file) => {
    for (const language of ['en', 'ar'] as const) {
      const keys = leafKeys(read(language, file));
      const pluralBases = new Set(
        keys.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, ''))
      );
      for (const base of pluralBases) {
        expect(
          keys,
          `${language}/${file}: "${base}" has plural forms but no _other fallback`
        ).toContain(`${base}_other`);
      }
    }
  });
});
