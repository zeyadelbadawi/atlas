/**
 * What a failed upload actually tells the user.
 *
 * WHAT WAS WRONG. Uploading a file whose bytes do not match its extension
 * is refused by the backend with a precise reason —
 * `errors.media.unsupportedFileType`. The frontend's errors bundle had no
 * `media` section at all, so the lookup missed and the failure strip
 * rendered the file name, the size, and a Retry button with an EMPTY
 * reason line. Reproduced in production: a real 45-byte text file named
 * `.png` produced "not-really-an-image.png · 45 B" and nothing else.
 *
 * TWO DEFECTS, TWO SETS OF TESTS. The missing strings were the immediate
 * cause, and the first group pins them down. The second group pins the
 * shape of the bug: a missed lookup rendered SILENCE, so the next
 * unmapped key would have failed just as invisibly. Checking `exists`
 * first means an unmapped reason degrades to the generic message instead
 * of a blank line.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import i18next from 'i18next';
import en from '@localization/resources/en/errors.json';
import ar from '@localization/resources/ar/errors.json';
import { toErrorsNamespaceKey } from '@utils';

/**
 * Every `messageKey` the media endpoints can return, taken from the
 * backend's own `throw` sites. If the backend gains a new one and nobody
 * adds a string, the first test here fails — which is the point.
 */
const BACKEND_MEDIA_ERROR_KEYS = [
  'errors.media.unsupportedFileType',
  'errors.media.invalidDataUrl',
  'errors.media.fileTooLarge',
  'errors.media.insufficientRole',
] as const;

/**
 * `.description`, not `errors:generic`. The top-level kinds in this bundle
 * are `{title, description}` objects for `ErrorState`'s two-line card;
 * asking i18next for the object itself returns the literal diagnostic
 * "key 'generic (en)' returned an object instead of string", which is what
 * a single-line strip would otherwise show a customer.
 */
const GENERIC_FAILURE_KEY = 'errors:generic.description';

beforeAll(async () => {
  await i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['errors'],
    defaultNS: 'errors',
    resources: { en: { errors: en }, ar: { errors: ar } },
    interpolation: { escapeValue: false },
  });
});

/** The component's own rule, mirrored here. */
function failureText(lng: string, messageKey: string | undefined): string {
  const fixedT = i18next.getFixedT(lng);
  const exists = (key: string) => i18next.exists(key, { lng });
  if (!messageKey) return fixedT(GENERIC_FAILURE_KEY);
  const key = toErrorsNamespaceKey(messageKey);
  return exists(key) ? fixedT(key) : fixedT(GENERIC_FAILURE_KEY);
}

/**
 * Asserts the text is this reason's OWN message.
 *
 * Three ways this can go wrong, and all three are checked, because each
 * one on its own passes the other two:
 *
 *   - empty      the original bug, a blank line under the file name;
 *   - key-shaped i18next echoes a missed key, and echoes it WITHOUT the
 *                namespace prefix, so looking for "errors.media…" in the
 *                output misses the very failure it is meant to catch;
 *   - generic    the `exists` fallback guarantees SOME sentence, so a
 *                test that only demanded text would pass while every
 *                distinct reason collapsed into "Something went wrong".
 */
function expectSpecificMessage(text: string, lng: string, key: string): void {
  expect(text.length, `${key} produced nothing`).toBeGreaterThan(0);
  // A key is one dotted, space-free token; a message is not.
  expect(text, `${key} rendered as a key, not a message`).not.toMatch(
    /^[A-Za-z][A-Za-z0-9]*([.:][A-Za-z0-9]+)+$/
  );
  expect(text, `${key} fell back to the generic message`).not.toBe(
    i18next.getFixedT(lng)(GENERIC_FAILURE_KEY)
  );
}

describe('every media failure has something to say', () => {
  it.each(BACKEND_MEDIA_ERROR_KEYS)('explains %s in English', (key) => {
    expectSpecificMessage(failureText('en', key), 'en', key);
  });

  it.each(BACKEND_MEDIA_ERROR_KEYS)('explains %s in Arabic', (key) => {
    const text = failureText('ar', key);
    expectSpecificMessage(text, 'ar', key);
    // Arabic script, not an untranslated English fallback.
    expect(text, `ar:${key} looks untranslated`).toMatch(/[؀-ۿ]/);
  });

  /*
   * The one a user is most likely to hit — and the exact case reproduced
   * in production. The message must name what IS accepted, not just say no.
   */
  it('tells the user which file types would work', () => {
    const text = failureText('en', 'errors.media.unsupportedFileType');
    for (const format of ['JPG', 'PNG', 'GIF', 'WebP', 'PDF']) {
      expect(text, `does not mention ${format}`).toContain(format);
    }
  });
});

describe('an unmapped reason still says something', () => {
  /*
   * The defect in shape rather than in content: before this, a key with
   * no string rendered as an empty line, so the user saw a failure with
   * no explanation at all.
   */
  it('falls back to the generic message instead of rendering nothing', () => {
    const text = failureText('en', 'errors.media.somethingNobodyMappedYet');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toBe(i18next.getFixedT('en')(GENERIC_FAILURE_KEY));
  });

  it('falls back when the error carries no key at all', () => {
    const text = failureText('en', undefined);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toBe(i18next.getFixedT('en')(GENERIC_FAILURE_KEY));
  });

  it('never returns an empty string for any input', () => {
    for (const key of [
      ...BACKEND_MEDIA_ERROR_KEYS,
      'errors.nope.nope',
      undefined,
    ]) {
      for (const lng of ['en', 'ar']) {
        expect(failureText(lng, key).trim()).not.toBe('');
      }
    }
  });
});
