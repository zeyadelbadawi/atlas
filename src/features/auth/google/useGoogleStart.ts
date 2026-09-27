/**
 * Google Identity — starts a Google flow from any page.
 *
 * Remembers where the flow came from (see `google-flow.storage.ts`), asks
 * the backend for the authorization URL — which also sets the binder
 * cookie that ties this browser to the completion — and leaves for
 * Google. While that is in flight a second click does nothing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { GoogleIntent, SignInSurface } from '@types';
import { saveGoogleFlowContext } from './google-flow.storage';

export interface GoogleStartInput {
  readonly intent: GoogleIntent;
  readonly surface: SignInSurface;
  readonly academyId?: string;
  /** Defaults to the current path and query. */
  readonly from?: string;
  readonly next?: string;
  readonly inviteToken?: string;
  readonly locale?: 'en' | 'ar';
  /** `link` only — the signed-in person re-proves the account. */
  readonly currentPassword?: string;
  /** `setup` only — the emailed setup token. */
  readonly setupToken?: string;
}

export interface UseGoogleStartResult {
  readonly start: (input: GoogleStartInput) => Promise<void>;
  readonly isStarting: boolean;
  readonly error: ApiError | null;
  readonly clearError: () => void;
}

export function useGoogleStart(): UseGoogleStartResult {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);

  // "Back" from Google can restore this page from the back/forward cache
  // exactly as it was left — mid-start, button disabled. Reset it.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      inFlight.current = false;
      setIsStarting(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const start = useCallback(async (input: GoogleStartInput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsStarting(true);
    setError(null);
    const from =
      input.from ?? window.location.pathname + window.location.search;
    saveGoogleFlowContext({
      intent: input.intent,
      surface: input.surface,
      from,
      ...(input.academyId ? { academyId: input.academyId } : {}),
      ...(input.next ? { next: input.next } : {}),
      ...(input.inviteToken ? { inviteToken: input.inviteToken } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
    });
    try {
      const { authorizationUrl } = await authenticationService.googleAuthorize({
        intent: input.intent,
        returnTo: from,
        ...(input.academyId ? { academyId: input.academyId } : {}),
        ...(input.currentPassword
          ? { currentPassword: input.currentPassword }
          : {}),
        ...(input.setupToken ? { setupToken: input.setupToken } : {}),
      });
      // Stays "starting" while the browser leaves: the page is going away.
      window.location.assign(authorizationUrl);
    } catch (caught) {
      inFlight.current = false;
      setIsStarting(false);
      setError(caught as ApiError);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { start, isStarting, error, clearError };
}
