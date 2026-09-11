/**
 * Cookie / browser-storage consent for Atlas.
 *
 * WHY THIS LIVES IN THE SHARED LAYER RATHER THAN THE LEGAL FEATURE. The
 * consent decision has to be enforced by `writeStoredValue`, which is the
 * single point every preference write in the application goes through.
 * A shared utility cannot import from a feature, and gating five
 * individual call sites instead would mean the sixth one added later
 * silently ignores consent. The React surfaces (banner, dialog, footer
 * button) remain in `@features/legal`; only the model is here.
 *
 * THE CATEGORIES HERE ARE THE ONES ATLAS ACTUALLY HAS. The frontend was
 * audited for analytics, tracking, marketing pixels and third-party
 * scripts before this was written, and there are none: no Google
 * Analytics, no tag manager, no Hotjar, no Mixpanel, no Segment, no
 * PostHog, no advertising pixel, and no browser-side error reporting.
 * `index.html` loads exactly one script — the application itself.
 *
 * So this offers two categories, not four. Presenting an "Analytics" or
 * "Marketing" toggle that controls nothing would be a lie told in a
 * consent dialog, which is the worst possible place to tell one.
 *
 * IT ALSO DOES NOT CALL EVERYTHING A COOKIE. Atlas's authentication
 * tokens and workspace selection live in localStorage; only the sidebar
 * state is a real cookie. The UI says "cookies and similar technologies"
 * and the policy explains the difference.
 *
 * WHAT CONSENT ACTUALLY CONTROLS. Declining preferences is not cosmetic:
 * `applyConsent` removes the stored preference values and the sidebar
 * cookie, and `isPreferenceStorageAllowed` gates future writes. Strictly
 * necessary storage is untouched — blocking it would sign the user out,
 * which is not a consent choice anyone is offering.
 */
import { STORAGE_KEYS } from '@constants/storage.constants';

/** Where the consent decision itself is stored. Deliberately not one of the categories it governs. */
export const CONSENT_STORAGE_KEY = 'atlas:cookie-consent';

/** Bumped only if the categories change meaningfully, which re-asks for consent. */
export const CONSENT_VERSION = 1;

export interface CookieConsent {
  readonly version: number;
  /** Always true. Present for completeness of the record, never togglable. */
  readonly necessary: true;
  readonly preferences: boolean;
  /** ISO timestamp of the decision — the only thing recorded besides the choice itself. */
  readonly decidedAt: string;
}

/**
 * Preference-category storage. Everything here is genuinely optional:
 * Atlas works without it, it just forgets how you like things.
 *
 * `authTokens`, `activeOrganization` and `activeAcademy` are deliberately
 * ABSENT — they are strictly necessary, and clearing them would sign the
 * user out.
 */
const PREFERENCE_STORAGE_KEYS: readonly string[] = [
  STORAGE_KEYS.theme,
  STORAGE_KEYS.language,
  STORAGE_KEYS.sidebarCollapsed,
  STORAGE_KEYS.userPreferences,
  STORAGE_KEYS.featureFlags,
];

/** The one real cookie Atlas sets, from the sidebar component. */
const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export function readConsent(): CookieConsent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    // A stored decision from an older category set is not a decision
    // about the current one — ask again rather than assume.
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    // Unparseable or storage unavailable — treat as undecided rather than
    // assuming consent.
    return null;
  }
}

export function writeConsent(preferences: boolean): CookieConsent {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    necessary: true,
    preferences,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Storage refused (private mode, quota). The choice still applies for
    // this page load via `applyConsent`; it simply will not persist.
  }
  applyConsent(consent);
  return consent;
}

/**
 * Makes the decision real.
 *
 * On a decline this removes preference values that are already stored,
 * so declining takes effect immediately rather than only preventing
 * future writes. Without this, "Reject" would leave everything already
 * saved exactly where it was — the visible-banner-only behaviour that
 * makes consent meaningless.
 */
export function applyConsent(consent: CookieConsent): void {
  if (consent.preferences) return;

  try {
    for (const key of PREFERENCE_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    // Expire the sidebar cookie rather than leaving it to age out.
    document.cookie = `${SIDEBAR_COOKIE_NAME}=; path=/; max-age=0`;
  } catch {
    // Nothing further to do — the gate below still prevents new writes.
  }
}

/**
 * Whether preference-category storage may be written.
 *
 * Undecided is treated as NOT allowed: consent must be given, not
 * assumed from silence.
 */
export function isPreferenceStorageAllowed(): boolean {
  return readConsent()?.preferences === true;
}

/**
 * Whether `key` belongs to the optional Preferences category.
 *
 * Used by `writeStoredValue` to decide what consent governs. Keys not
 * listed here — auth tokens, active organization, active academy, and the
 * consent record itself — are strictly necessary and are never gated.
 */
export function isPreferenceStorageKey(key: string): boolean {
  return PREFERENCE_STORAGE_KEYS.includes(key);
}
