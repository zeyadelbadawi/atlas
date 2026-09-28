/**
 * Google Identity — what the page that started a Google flow remembers for
 * the return page, across the round trip to Google.
 *
 * `sessionStorage`: per tab and per origin, which is exactly the scope of a
 * flow (it starts and ends on the same origin, in the same tab). It holds
 * no secret — the handoff arrives in the return URL's fragment and the
 * binder is an HttpOnly cookie — only where to go back to and the
 * invitation code the sign-up link carried. Storage can throw (private
 * mode, blocked site data): the flow then simply falls back to defaults.
 */
import { STORAGE_KEYS } from '@constants';
import type { AuthMethod, GoogleIntent, SignInSurface } from '@types';

const FLOW_STORAGE_KEY = 'atlas:google-flow';

/** A flow context older than this is ignored (the flow itself lives 10 minutes). */
const FLOW_CONTEXT_MAX_AGE_MS = 30 * 60 * 1000;

/** Mirrors the backend's `organizationName` limit; anything longer is dropped. */
const SIGNUP_ORGANIZATION_NAME_MAX = 120;

/**
 * What the Atlas sign-up page already had when Google was chosen — restored
 * on the return page's create step so nothing is typed or chosen twice.
 * Only a pre-fill: the person confirms it there, and the server validates
 * the organization name and plan exactly as for the password sign-up.
 */
export interface GoogleSignupDraft {
  readonly organizationName?: string;
  /** The plan picked in the form. */
  readonly planId?: string;
  /** The plan the visitor arrived for (`?plan=` / the pricing page hand-off). */
  readonly planKey?: string;
}

export interface GoogleFlowContext {
  readonly intent: GoogleIntent;
  readonly surface: SignInSurface;
  readonly academyId?: string;
  /** The on-site path (with its query) the flow started from — "back" and the retry target. */
  readonly from: string;
  /** Where a new session goes, when the backend names no `returnPath`. */
  readonly next?: string;
  /** An `invite`-policy academy's sign-up code (`?invite=`). */
  readonly inviteToken?: string;
  /** Academy website locale — its return URL carries no `/ar` prefix. */
  readonly locale?: 'en' | 'ar';
  /** Atlas sign-up: the organization/plan the page already had. */
  readonly signup?: GoogleSignupDraft;
  readonly startedAt: number;
}

export function saveGoogleFlowContext(
  context: Omit<GoogleFlowContext, 'startedAt'>
): void {
  try {
    window.sessionStorage.setItem(
      FLOW_STORAGE_KEY,
      JSON.stringify({ ...context, startedAt: Date.now() })
    );
  } catch {
    // Unavailable storage: the return page uses its defaults.
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readSignupDraft(value: unknown): GoogleSignupDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const organizationName = readString(raw.organizationName);
  const planId = readString(raw.planId);
  const planKey = readString(raw.planKey);
  const draft: GoogleSignupDraft = {
    ...(organizationName &&
    organizationName.length <= SIGNUP_ORGANIZATION_NAME_MAX
      ? { organizationName }
      : {}),
    ...(planId ? { planId } : {}),
    ...(planKey ? { planKey } : {}),
  };
  return Object.keys(draft).length > 0 ? draft : undefined;
}

/** Parsed defensively — the stored value is only ever trusted as a hint. */
export function readGoogleFlowContext(): GoogleFlowContext | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(FLOW_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const intent = parsed.intent;
    const surface = parsed.surface;
    const from = readString(parsed.from);
    const startedAt = parsed.startedAt;
    if (
      (intent !== 'sign_in' &&
        intent !== 'sign_up' &&
        intent !== 'link' &&
        intent !== 'setup') ||
      (surface !== 'management' && surface !== 'academy') ||
      !from ||
      !isOnSitePath(from) ||
      typeof startedAt !== 'number' ||
      Date.now() - startedAt > FLOW_CONTEXT_MAX_AGE_MS
    ) {
      return null;
    }
    const next = readString(parsed.next);
    const signup = readSignupDraft(parsed.signup);
    return {
      intent,
      surface,
      from,
      startedAt,
      academyId: readString(parsed.academyId),
      next: next && isOnSitePath(next) ? next : undefined,
      inviteToken: readString(parsed.inviteToken),
      locale:
        parsed.locale === 'ar'
          ? 'ar'
          : parsed.locale === 'en'
            ? 'en'
            : undefined,
      ...(signup ? { signup } : {}),
    };
  } catch {
    return null;
  }
}

export function clearGoogleFlowContext(): void {
  try {
    window.sessionStorage.removeItem(FLOW_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Same-site relative path only — never `//host`, a scheme or a backslash trick. */
export function isOnSitePath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    ![...path].some((ch) => ch.charCodeAt(0) < 0x20)
  );
}

/** The "Last used" hint: the first factor of the latest session this browser was given. */
export function readLastAuthMethod(): AuthMethod | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.lastAuthMethod);
    return value === 'google' || value === 'password' ? value : null;
  } catch {
    return null;
  }
}

/**
 * The return URL's fragment: `h=<handoff>` or `error=cancelled|failed`.
 * Read once, then removed from the address bar so a handoff never sits in
 * history, a bookmark or a screenshot.
 */
export function takeReturnFragment(): {
  readonly handoff?: string;
  readonly error?: 'cancelled' | 'failed';
} {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.length > 0) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search
    );
  }
  const params = new URLSearchParams(hash);
  const handoff = readString(params.get('h'));
  const error = params.get('error');
  return {
    ...(handoff ? { handoff } : {}),
    ...(error === 'cancelled' ? { error: 'cancelled' as const } : {}),
    ...(error && error !== 'cancelled' ? { error: 'failed' as const } : {}),
  };
}
