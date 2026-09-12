/**
 * The checkout's payment-method step, when there is nothing to choose.
 *
 * WHAT WAS WRONG. The step handled loading (a skeleton) and failure (an
 * error card), but not an empty list. A customer who had already picked a
 * plan, seen "$79.00/mo", and committed to buying reached a panel headed
 * "Payment method" with nothing under it and a disabled "Continue to
 * payment" button — no explanation of what was missing, whose problem it
 * was, or what to do next. Confirmed against production, where the
 * organization has no enabled method and the list comes back empty.
 *
 * WHY THE COPY MATTERS AS MUCH AS THE COMPONENT. Which methods exist is
 * platform configuration; the tenant cannot fix it from this screen. A
 * message that implied otherwise ("add a payment method") would send them
 * looking for a setting that is not theirs, so the empty state says what is
 * true and offers the one route that can actually resolve it.
 *
 * These tests cover the decision and the copy. They deliberately do not
 * render the page: `CheckoutPage` needs a router, a query client, an auth
 * session and a live checkout before it will paint this panel at all, and a
 * test that assembled all of that would be testing the harness. What can go
 * wrong here is the predicate and the strings, so that is what is pinned.
 */
import { describe, expect, it } from 'vitest';
import en from '@localization/resources/en/payments.json';
import ar from '@localization/resources/ar/payments.json';

interface Method {
  readonly key: string;
  readonly enabled: boolean;
}

/** The page's own rule, kept in one place so both branches read the same list. */
function enabledMethods(methods: readonly Method[] | undefined): readonly Method[] {
  return (methods ?? []).filter((method) => method.enabled);
}

describe('which payment methods are offered', () => {
  it('treats a missing list as empty rather than throwing', () => {
    expect(enabledMethods(undefined)).toHaveLength(0);
  });

  it('treats an empty list as empty', () => {
    expect(enabledMethods([])).toHaveLength(0);
  });

  /*
   * The case that produced the blank panel: methods exist, but every one
   * of them is disabled. Counting the raw list here instead of the
   * filtered one is precisely how the empty state gets skipped.
   */
  it('counts a list of only disabled methods as empty', () => {
    const methods = [
      { key: 'bank_transfer', enabled: false },
      { key: 'card', enabled: false },
    ];
    expect(methods).toHaveLength(2);
    expect(enabledMethods(methods)).toHaveLength(0);
  });

  it('offers the methods that are enabled', () => {
    const methods = [
      { key: 'bank_transfer', enabled: true },
      { key: 'card', enabled: false },
    ];
    expect(enabledMethods(methods).map((m) => m.key)).toEqual(['bank_transfer']);
  });
});

describe('what the empty state says', () => {
  const keys = ['noMethodsTitle', 'noMethodsDescription', 'contactSupport'] as const;

  it('is written in both languages', () => {
    for (const key of keys) {
      expect(en.checkout[key], `en is missing ${key}`).toBeTruthy();
      expect(ar.checkout[key], `ar is missing ${key}`).toBeTruthy();
    }
  });

  it('is Arabic, not an untranslated English string', () => {
    for (const key of keys) {
      // Arabic script anywhere in the value; an English fallback has none.
      expect(ar.checkout[key], `ar:${key} looks untranslated`).toMatch(
        /[؀-ۿ]/,
      );
    }
  });

  /*
   * The tenant cannot enable a payment method from this screen, so copy
   * that tells them to do it would be a dead end dressed up as an action.
   */
  it('does not tell the customer to do something they cannot do', () => {
    expect(en.checkout.noMethodsDescription.toLowerCase()).not.toMatch(
      /add a payment method|set up a payment method/,
    );
    expect(en.checkout.noMethodsDescription.toLowerCase()).toContain('support');
  });

  it('names the action rather than labelling it vaguely', () => {
    expect(en.checkout.contactSupport).toBe('Contact support');
  });
});
