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
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
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
   * The save used by the dialog's "Save and leave". It must run the form's
   * normal validation and persistence WITHOUT navigating (the dialog
   * continues to the destination the user picked), and resolve true only
   * when the save succeeded — true after a failure would navigate away
   * and destroy the work. Omit it and the dialog offers only Stay/Leave.
   */
  readonly onSave?: () => Promise<boolean>;
}

export interface UnsavedChangesControls {
  /**
   * Call after a successful save, BEFORE navigating or closing. Marks the
   * form clean synchronously, so a `navigate()` in the same tick is not
   * blocked by the dirt that was just saved (the `isDirty` prop only
   * catches up after the next render). Protection re-arms by itself the
   * next time the form reports dirty after having reported clean.
   */
  readonly markSaved: () => void;
}

export function useUnsavedChanges({
  isDirty,
  onSave,
}: UseUnsavedChangesOptions): UnsavedChangesControls {
  const registry = useUnsavedChangesRegistry();
  // Stable per mounted component, so two instances of the same form
  // (a list row editor, say) never collide in the registry.
  const id = useId();

  // After `markSaved`, a still-true `isDirty` is the saved state not yet
  // re-rendered, not new work: ignore it until the form reports clean.
  const savedRef = useRef(false);
  if (!isDirty) savedRef.current = false;
  const effectiveDirty = isDirty && !savedRef.current;

  useEffect(() => {
    if (!effectiveDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      // Chrome requires `returnValue` for the native prompt to appear; the
      // value itself is ignored by every modern browser.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [effectiveDirty]);

  // The registry holds one stable wrapper that calls the latest `onSave`,
  // so a form re-creating its save callback on every render does not
  // re-register on every render.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const hasSave = Boolean(onSave);
  const handlers = useMemo(
    () =>
      hasSave
        ? { save: () => onSaveRef.current?.() ?? Promise.resolve(false) }
        : undefined,
    [hasSave]
  );

  useEffect(() => {
    registry?.setDirty(id, effectiveDirty, handlers);
  }, [registry, id, effectiveDirty, handlers]);

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

  const markSaved = useCallback(() => {
    savedRef.current = true;
    registryRef.current?.setDirty(id, false);
  }, [id]);

  return useMemo(() => ({ markSaved }), [markSaved]);
}
