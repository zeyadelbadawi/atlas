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
 * The backend keys below are the ones its course-order and payment
 * services throw (atlas-backend `src/course-commerce`, `src/billing`),
 * written as `errors.x.y` exactly as they arrive in `ApiError.messageKey`.
 * A new backend key in these groups belongs in this list and in both
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

/** `namespace:a.b.c` resolves to a non-empty string in that language. */
function hasString(language: 'en' | 'ar', key: string): boolean {
  const [namespace, path] = key.split(':');
  let node: unknown = bundle(language, namespace);
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' && node.trim().length > 0;
}

/** `errors.courseOrder.expired` → `errors:courseOrder.expired`. */
const toKey = (messageKey: string) => messageKey.replace(/^errors\./, 'errors:');

const BACKEND_KEYS = [
  'errors.courseOrder.alreadyEnrolled',
  'errors.courseOrder.commissionNotConfigured',
  'errors.courseOrder.courseNotPaid',
  'errors.courseOrder.expired',
  'errors.courseOrder.gatewayNotConfigured',
  'errors.courseOrder.notAcceptingEnrollments',
  'errors.courseOrder.notPayable',
  'errors.courseOrder.paymentSetupIncomplete',
  'errors.courseOrder.paymentUnderReview',
  'errors.courseOrder.pricingUnavailable',
  'errors.courseOrder.refundContactAcademy',
  'errors.courseOrder.refundNotEligible',
  'errors.courseOrder.refundWindowElapsed',
  'errors.payment.alreadyUnderReview',
  'errors.payment.methodNotFound',
  'errors.payment.notEditable',
  'errors.payment.notPendingReview',
  'errors.payment.proofNotSupported',
  'errors.payment.rejectedByAcademy',
  'errors.payment.rejectedByReviewer',
  'errors.payment.unsupportedProofFileType',
] as const;

describe('backend message keys', () => {
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
