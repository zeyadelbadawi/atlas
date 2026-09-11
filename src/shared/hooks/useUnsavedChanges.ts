/**
 * useUnsavedChanges hook.
 *
 * Protects unsaved work in BOTH directions a user can lose it:
 *
 *   1. Leaving the app entirely — tab close, refresh, external URL — via
 *      the standards-based `beforeunload` prompt. The browser supplies its
 *      own generic wording and ignores any string a page provides.
 *   2. Navigating WITHIN the app — clicking a sidebar item mid-edit — via
 *      the shared registry that `NavigationBlockDialog` blocks on, which
 *      shows Atlas's own translated Stay / Leave / Save dialog.
 *
 * HISTORY, BECAUSE IT EXPLAINS THE SHAPE. This hook originally used
 * `useBlocker` for case 2, which throws "useBlocker must be used within a
 * data router" on EVERY render under the classic `<BrowserRouter>` this
 * app used. That crashed all ~10 consumers into a section error boundary,
 * so the protection never worked for anyone. It was then reduced to
 * `beforeunload` only, which worked but silently gave up case 2 — the
 * common case, since most lost work is lost by clicking a nav link, not
 * by closing the tab.
 *
 * `src/App.tsx` now mounts a data router, so case 2 is available again.
 * This hook reports dirtiness to the registry instead of calling
 * `useBlocker` itself: several editable surfaces can be mounted at once
 * (a modal over a page editor), and navigation must be blocked if ANY of
 * them is dirty.
 *
 * `messageKey` is still accepted so no call site had to change, and is
 * still unused — browsers ignore custom `beforeunload` text, and the
 * in-app dialog is deliberately worded identically everywhere.
 */
import { useEffect, useId, useRef } from 'react';
import { useUnsavedChangesRegistry } from '@features/unsaved-changes';

export interface UseUnsavedChangesOptions {
  /** Whether the form has unsaved changes. */
  readonly isDirty: boolean;

  /**
   * Translation key for the confirmation message. Retained for call-site
   * compatibility; unused (see the note above).
   */
  readonly messageKey?: string;

  /**
   * Optional save used by the dialog's "Save changes" button. Resolve
   * true on success and false on failure — returning true after a failed
   * save would navigate away and destroy the work.
   */
  readonly onSave?: () => Promise<boolean>;
}

export function useUnsavedChanges({
  isDirty,
  onSave,
}: UseUnsavedChangesOptions): void {
  const registry = useUnsavedChangesRegistry();
  // Stable per mounted component, so two instances of the same form
  // (a list row editor, say) never collide in the registry.
  const id = useId();

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      // Chrome requires `returnValue` for the native prompt to appear; the
      // value itself is ignored by every modern browser.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    registry?.setDirty(id, isDirty, onSave ? { save: onSave } : undefined);
  }, [registry, id, isDirty, onSave]);

  // Deregister on unmount. Without this, navigating away from a dirty form
  // via the dialog's "Leave" would leave its id in the registry and block
  // the NEXT navigation too, with nothing on screen to explain why.
  //
  // THE REF IS NOT INCIDENTAL. Depending on `registry` here would make the
  // cleanup fire every time the context value changed identity — which is
  // exactly when a form becomes dirty — so it would clear the id, that
  // would change the value again, and the effect above would re-set it: an
  // infinite render loop triggered by typing one character into any
  // guarded form. Reading the registry through a ref keeps the dependency
  // list to `[id]`, so cleanup runs on real unmount and nothing else.
  const registryRef = useRef(registry);
  registryRef.current = registry;
  useEffect(() => () => registryRef.current?.clear(id), [id]);
}
