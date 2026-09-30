/**
 * Consent state, shared by the banner and by the "Cookie preferences"
 * link in the footer.
 *
 * WHY A PROVIDER AND NOT A HOOK PER COMPONENT. The banner and the
 * preferences dialog must agree: saving from the dialog has to dismiss the
 * banner, and re-opening preferences from the footer has to show the
 * choice that is actually in force. Two independent `useState`s reading
 * localStorage would drift apart the moment either one wrote.
 *
 * WHY THE DECISION IS READ ONCE, EAGERLY. `readConsent` runs in the
 * initialiser rather than in an effect, so the first paint already knows
 * whether a decision exists. Reading it in an effect makes the banner
 * flash on every page load for users who decided months ago.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  readConsent,
  syncConsentDecidedCookie,
  writeConsent,
  type CookieConsent,
} from '@utils';
import { useHydrationSnapshot } from '@hooks';

interface CookieConsentContextValue {
  /** The decision in force, or null if the user has not decided. */
  readonly consent: CookieConsent | null;
  /** True when the banner should be visible — i.e. no decision yet. */
  readonly needsDecision: boolean;
  /** True while the preferences dialog is open. */
  readonly isPreferencesOpen: boolean;
  readonly openPreferences: () => void;
  readonly closePreferences: () => void;
  /** Records a decision, applies it immediately, and closes both surfaces. */
  readonly decide: (allowPreferences: boolean) => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null
);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(() =>
    readConsent()
  );
  const [isPreferencesOpen, setPreferencesOpen] = useState(false);

  // A server-rendered public page decided the banner from the consent
  // cookie; the first render must show the same, then the stored decision
  // takes over (and the cookie is brought in line with it for next time).
  // Without a snapshot (every other page) this is exactly as before.
  const snapshot = useHydrationSnapshot();
  const [hydrating, setHydrating] = useState(snapshot !== null);
  useEffect(() => {
    setHydrating(false);
    syncConsentDecidedCookie(readConsent() !== null);
  }, []);

  const decide = useCallback((allowPreferences: boolean) => {
    // `writeConsent` also calls `applyConsent`, so declining clears
    // stored preference values here and not merely on the next load.
    setConsent(writeConsent(allowPreferences));
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      needsDecision:
        hydrating && snapshot ? !snapshot.consentDecided : consent === null,
      isPreferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      decide,
    }),
    [consent, isPreferencesOpen, decide, hydrating, snapshot]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

/**
 * Throws outside the provider rather than returning a silent default.
 * A consent control that quietly does nothing because it was mounted in
 * the wrong tree is precisely the failure this feature must not have.
 */
export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error(
      'useCookieConsent must be used within a CookieConsentProvider.'
    );
  }
  return context;
}
