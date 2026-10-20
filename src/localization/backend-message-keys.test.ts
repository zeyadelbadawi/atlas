/**
 * Message keys the code hands to `t()` exist in BOTH languages.
 *
 * `translation-parity.test.ts` proves EN and AR carry the same keys, but a
 * key missing from both passes it: that is how every `errors.courseOrder.*`
 * key the backend sends during checkout (`alreadyEnrolled`, `expired`,
 * `notPayable`, …) fell back to a generic "conflict" sentence, and how
 * adding an existing learner showed the raw key
 * `academy:members.createStudent.errors.alreadyMember`.
 *
 * The backend keys are listed in `backend-message-keys.json`, written as
 * `errors.x.y` exactly as they arrive in `ApiError.messageKey` (or as a
 * field violation's key). A new backend key belongs there and in both
 * `errors.json` files.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { memberAddErrorKey } from '@/features/academy/utils/member-add.utils';
import type { ApiError } from '@api';

const RESOURCES = resolve(__dirname, 'resources');

function bundle(language: 'en' | 'ar', namespace: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(RESOURCES, language, `${namespace}.json`), 'utf8')
  ) as Record<string, unknown>;
}

/**
 * `namespace:a.b.c` resolves to a non-empty string in that language — or,
 * for a key that names a group (`errors.notFound` is `{ title,
 * description }`), to a group with a `description`, which is the sentence
 * `apiErrorMessage` shows for it.
 */
function hasString(language: 'en' | 'ar', key: string): boolean {
  const [namespace, path] = key.split(':');
  let node: unknown = bundle(language, namespace);
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return false;
    node = (node as Record<string, unknown>)[part];
  }
  if (node && typeof node === 'object') {
    node = (node as Record<string, unknown>).description;
  }
  return typeof node === 'string' && node.trim().length > 0;
}

/** `errors.courseOrder.expired` → `errors:courseOrder.expired`. */
const toKey = (messageKey: string) => messageKey.replace(/^errors\./, 'errors:');

/**
 * Every literal `errors.*` key the backend throws, from
 * `backend-message-keys.json` (regenerate it from atlas-backend when a key
 * is added). `notDisplayable` lists the few keys no screen can receive,
 * each with the reason.
 */
const FIXTURE = JSON.parse(
  readFileSync(resolve(__dirname, 'backend-message-keys.json'), 'utf8')
) as { displayable: string[]; notDisplayable: Record<string, string> };
const BACKEND_KEYS = FIXTURE.displayable;

describe('backend message keys', () => {
  it('lists the whole backend vocabulary, and says why any key is left out', () => {
    expect(BACKEND_KEYS.length).toBeGreaterThan(300);
    expect(BACKEND_KEYS).toContain('errors.courseOrder.expired');
    for (const [key, reason] of Object.entries(FIXTURE.notDisplayable)) {
      expect(BACKEND_KEYS).not.toContain(key);
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it.each(BACKEND_KEYS)('%s has copy in English and Arabic', (messageKey) => {
    expect(hasString('en', toKey(messageKey))).toBe(true);
    expect(hasString('ar', toKey(messageKey))).toBe(true);
  });

  it('says the ACADEMY reviewed a payment it rejected, not Atlas', () => {
    const en = bundle('en', 'errors') as { payment: Record<string, string> };
    const ar = bundle('ar', 'errors') as { payment: Record<string, string> };
    expect(en.payment.rejectedByAcademy).toMatch(/academy/i);
    expect(en.payment.rejectedByAcademy).not.toMatch(/Atlas/);
    expect(ar.payment.rejectedByAcademy).toMatch(/الأكاديمية/);
    expect(ar.payment.rejectedByAcademy).not.toMatch(/أطلس|Atlas/);
  });
});

describe('member add dialogs', () => {
  const PREFIXES = [
    'academy:members.addManager',
    'academy:members.addInstructor',
    'academy:members.createStudent',
  ];
  const KINDS: ApiError['kind'][] = ['notFound', 'conflict', 'forbidden', 'unknown'];

  it.each(PREFIXES)('%s has copy for every error the dialog can show', (prefix) => {
    for (const kind of KINDS) {
      const key = memberAddErrorKey({ kind, messageKey: '' }, prefix);
      expect({ key, en: hasString('en', key), ar: hasString('ar', key) }).toEqual({
        key,
        en: true,
        ar: true,
      });
    }
  });
});
