/**
 * Smart back navigation.
 *
 * Backs the dashboard's global back button. Prefers replaying real in-app
 * history — `navigate(-1)` — whenever the user actually arrived at the
 * current page by navigating forward during this session, since that
 * preserves the previous page's scroll position, filters, and any in-memory
 * state exactly as a browser back button would. Falls back to the logical
 * parent derived from the URL's own hierarchy (`resolveDashboardBackPath`)
 * whenever there is no such history — a fresh deep link, a hard refresh, or
 * a newly opened tab — so the control is never a dead end and never leaves
 * the dashboard.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { resolveDashboardBackPath } from '@app/routes/dashboard-navigation';

export interface SmartBackResult {
  /** Whether a sensible "back" destination exists — hide the control when false. */
  readonly canGoBack: boolean;
  /** Navigates to the best available previous page. */
  readonly goBack: () => void;
}

export function useSmartBack(): SmartBackResult {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();

  // Pathnames pushed during this SPA session. Reset on a hard refresh by
  // design: history from before a refresh may lead outside the dashboard
  // (sign-in, an external referrer), so the URL-derived fallback is the
  // safer default once that in-memory trail is gone.
  const stackRef = useRef<string[]>([location.pathname]);

  useEffect(() => {
    const stack = stackRef.current;
    const top = stack[stack.length - 1];

    if (navigationType === 'POP') {
      // A single step back (ours or the browser's own control) — mirror it
      // by popping one entry. If we're already at the base of our tracked
      // trail, just relabel it rather than guessing further back.
      if (stack.length > 1) stack.pop();
      else stack[0] = location.pathname;
      return;
    }

    if (navigationType === 'REPLACE') {
      stack[stack.length - 1] = location.pathname;
      return;
    }

    if (location.pathname !== top) stack.push(location.pathname);
  }, [location.pathname, navigationType]);

  const hasInAppHistory = stackRef.current.length > 1;
  const fallbackTarget = resolveDashboardBackPath(location.pathname);

  return {
    canGoBack: hasInAppHistory || fallbackTarget !== null,
    goBack: () => {
      if (stackRef.current.length > 1) {
        navigate(-1);
        return;
      }
      if (fallbackTarget) navigate(fallbackTarget);
    },
  };
}
