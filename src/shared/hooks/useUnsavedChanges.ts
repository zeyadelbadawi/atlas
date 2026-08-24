/**
 * useUnsavedChanges hook.
 *
 * Warns the user before they lose unsaved changes by closing the tab,
 * refreshing, or navigating to an external URL — the one form of
 * "unsaved changes" protection actually achievable under this app's
 * routing architecture.
 *
 * Fix history: this hook previously used react-router-dom's `useBlocker`
 * to intercept in-app SPA navigation with a custom, translated
 * confirmation dialog. `useBlocker` requires a *data router*
 * (`createBrowserRouter` + `<RouterProvider>`) — this app uses the classic
 * `<BrowserRouter>` (`src/App.tsx`), under which `useBlocker` throws
 * `"useBlocker must be used within a data router"` unconditionally, on
 * every render, regardless of whether the form is actually dirty. That
 * crashed every one of this hook's ~10 consumers (Profile, Course Editor,
 * Website Page Editor, Blog Editor, Academy Branding/Settings/Profile,
 * Platform Trial Policy/Domain Settings, Instructor Submission Review) —
 * caught only by a section-level error boundary, so the unsaved-changes
 * protection was never actually working for anyone.
 *
 * react-router-dom v6.30 (the version in this repo) has no in-app
 * navigation-blocking API outside a data router — `unstable_usePrompt` is
 * itself a thin wrapper around `useBlocker` with the identical
 * requirement. Migrating the whole app to a data router just to support
 * this one hook would be a far larger, higher-risk architectural change
 * than the protection itself justifies (98+ routes, every layout/guard
 * re-verified). `window.beforeunload` is the standards-based mechanism
 * that works under *any* router choice, and is what's used here — this is
 * a genuinely different implementation of the same intent (master plan:
 * "preserve the intended behavior... unless the existing architecture
 * genuinely requires a different implementation"), not a removal of the
 * protection. What's lost versus the original design: a custom, styled,
 * translated confirmation when navigating *within* the app (e.g. clicking
 * a different sidebar item mid-edit) — not recoverable without a data
 * router. What's preserved and, unlike before, now actually works: a
 * warning on tab close, page refresh, and navigating to a URL outside the
 * app.
 */
import { useEffect } from 'react';

export interface UseUnsavedChangesOptions {
  /** Whether the form has unsaved changes. */
  readonly isDirty: boolean;

  /**
   * Translation key for the confirmation message. Kept for call-site
   * compatibility (every consumer already passes one) but unused — modern
   * browsers show their own generic, un-customizable `beforeunload`
   * prompt and ignore any string a page supplies.
   */
  readonly messageKey?: string;
}

export function useUnsavedChanges({ isDirty }: UseUnsavedChangesOptions): void {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      // Chrome requires `returnValue` to be set for the native prompt to
      // appear; the value itself is ignored by every modern browser.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
