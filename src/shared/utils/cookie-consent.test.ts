/**
 * Cookie consent — P106-CON-001..012.
 *
 * These test the thing that actually matters about a consent banner:
 * whether declining CHANGES ANYTHING. A banner that records a decision and
 * then lets every write through is the industry's most common consent bug,
 * and it is invisible from the UI — the dialog looks correct either way.
 *
 * So the assertions are about localStorage and document.cookie, not about
 * React state.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@constants/storage.constants';
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  isPreferenceStorageAllowed,
  isPreferenceStorageKey,
  readConsent,
  writeConsent,
} from './cookie-consent.utils';
import { readStoredValue, writeStoredValue } from './storage.utils';

describe('cookie consent — P106-CON-001..012', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'sidebar_state=; path=/; max-age=0';
  });

  it('P106-CON-001 — silence is not consent', () => {
    // The default with no decision recorded must be "not allowed".
    // Treating an undecided visitor as consenting is the single most
    // consequential way to get this wrong.
    expect(readConsent()).toBeNull();
    expect(isPreferenceStorageAllowed()).toBe(false);
  });

  it('P106-CON-002 — accepting records the decision and permits storage', () => {
    const consent = writeConsent(true);

    expect(consent.preferences).toBe(true);
    expect(consent.necessary).toBe(true);
    expect(consent.version).toBe(CONSENT_VERSION);
    expect(Date.parse(consent.decidedAt)).not.toBeNaN();
    expect(isPreferenceStorageAllowed()).toBe(true);
  });

  it('P106-CON-003 — declining is recorded as a real decision, not as absence', () => {
    // "Reject" must persist. If it did not, the banner would reappear on
    // every page load, which pressures people into accepting.
    writeConsent(false);

    expect(readConsent()?.preferences).toBe(false);
    expect(isPreferenceStorageAllowed()).toBe(false);
  });

  it('P106-CON-004 — declining REMOVES preference data already stored', () => {
    // The half that is usually missing: someone who accepted months ago
    // and now declines must have the stored values cleared, not merely
    // have future writes blocked.
    window.localStorage.setItem(STORAGE_KEYS.theme, '"dark"');
    window.localStorage.setItem(STORAGE_KEYS.language, '"ar"');
    window.localStorage.setItem(STORAGE_KEYS.userPreferences, '{"a":1}');

    writeConsent(false);

    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.language)).toBeNull();
    expect(
      window.localStorage.getItem(STORAGE_KEYS.userPreferences)
    ).toBeNull();
  });

  it('P106-CON-005 — declining expires the one real cookie Atlas sets', () => {
    document.cookie = 'sidebar_state=true; path=/';
    expect(document.cookie).toContain('sidebar_state');

    writeConsent(false);

    expect(document.cookie).not.toContain('sidebar_state=true');
  });

  it('P106-CON-006 — declining NEVER touches strictly necessary storage', () => {
    // Clearing these would sign the user out. Declining optional cookies
    // is not a request to be signed out, and a consent implementation
    // that does that is broken in a way users experience as data loss.
    window.localStorage.setItem(STORAGE_KEYS.authTokens, '{"accessToken":"x"}');
    window.localStorage.setItem(STORAGE_KEYS.activeOrganization, '"org-1"');

    writeConsent(false);

    expect(window.localStorage.getItem(STORAGE_KEYS.authTokens)).toBe(
      '{"accessToken":"x"}'
    );
    expect(window.localStorage.getItem(STORAGE_KEYS.activeOrganization)).toBe(
      '"org-1"'
    );
  });

  it('P106-CON-007 — a declined preference write is actually refused', () => {
    // Through the real write path every provider uses, not a fake.
    writeConsent(false);

    const wrote = writeStoredValue(STORAGE_KEYS.theme, 'dark');

    expect(wrote).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
    expect(readStoredValue(STORAGE_KEYS.theme, 'system')).toBe('system');
  });

  it('P106-CON-008 — an accepted preference write goes through', () => {
    writeConsent(true);

    expect(writeStoredValue(STORAGE_KEYS.theme, 'dark')).toBe(true);
    expect(readStoredValue(STORAGE_KEYS.theme, 'system')).toBe('dark');
  });

  it('P106-CON-009 — necessary writes work even when preferences are declined', () => {
    writeConsent(false);

    expect(
      writeStoredValue(STORAGE_KEYS.authTokens, { accessToken: 'x' })
    ).toBe(true);
    expect(writeStoredValue(STORAGE_KEYS.activeOrganization, 'org-1')).toBe(
      true
    );
  });

  it('P106-CON-010 — an undecided visitor cannot have preferences written either', () => {
    // Consent must be given, not assumed from not having answered yet.
    expect(writeStoredValue(STORAGE_KEYS.theme, 'dark')).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
  });

  it('P106-CON-011 — a decision about an older category set is re-asked, not honoured', () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION - 1,
        necessary: true,
        preferences: true,
        decidedAt: new Date().toISOString(),
      })
    );

    // Consenting to a different set of categories is not consent to this
    // one — and the stale record must not silently grant permission.
    expect(readConsent()).toBeNull();
    expect(isPreferenceStorageAllowed()).toBe(false);
  });

  it('P106-CON-012 — corrupt stored consent fails closed', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'not json at all');

    expect(readConsent()).toBeNull();
    expect(isPreferenceStorageAllowed()).toBe(false);
  });

  it('P106-CON-013 — only the optional category is gated', () => {
    // Guards the classification itself: if an auth key were ever added to
    // the preference list, declining would sign users out.
    expect(isPreferenceStorageKey(STORAGE_KEYS.theme)).toBe(true);
    expect(isPreferenceStorageKey(STORAGE_KEYS.language)).toBe(true);
    expect(isPreferenceStorageKey(STORAGE_KEYS.authTokens)).toBe(false);
    expect(isPreferenceStorageKey(STORAGE_KEYS.activeOrganization)).toBe(false);
    expect(isPreferenceStorageKey(CONSENT_STORAGE_KEY)).toBe(false);
  });
});
