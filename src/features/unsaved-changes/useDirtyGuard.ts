/**
 * useDirtyGuard — unsaved-changes protection for MODALS and DRAWERS.
 *
 * WHY THIS EXISTS SEPARATELY FROM `useUnsavedChanges`. A route-level form
 * loses work through navigation, which `useBlocker` intercepts. A modal
 * loses work through its own close affordances — the X button, an outside
 * click, the Escape key — none of which are navigations, so the blocker
 * never sees them. This wraps those instead.
 *
 * Usage is one line at the close site:
 *
 *     const guard = useDirtyGuard(form.formState.isDirty);
 *     <Dialog onOpenChange={(open) => { if (!open) void guard.requestClose(close); }}>
 *
 * `requestClose` runs the close callback immediately when nothing is
 * dirty, so a clean modal never asks a pointless question.
 *
 * It reuses the app's existing `useConfirmDialog` rather than rendering
 * its own — the wording comes from the same `common:unsavedChanges` keys
 * the route-level dialog uses, so a user sees one consistent message
 * wherever they are about to lose work.
 */
import { useCallback } from 'react';
import { useConfirmDialog } from '@app/providers';

export interface DirtyGuard {
  /**
   * Asks for confirmation if dirty, then runs `close`. Returns whether the
   * close actually happened, for callers that need to know.
   */
  readonly requestClose: (close: () => void) => Promise<boolean>;
  /** The confirmation on its own, for callers that manage closing themselves. */
  readonly confirmDiscard: () => Promise<boolean>;
}

export function useDirtyGuard(isDirty: boolean): DirtyGuard {
  const { confirm } = useConfirmDialog();

  const confirmDiscard = useCallback(async () => {
    if (!isDirty) return true;
    return confirm({
      titleKey: 'common:unsavedChanges.title',
      descriptionKey: 'common:unsavedChanges.description',
      confirmLabelKey: 'common:unsavedChanges.leave',
      cancelLabelKey: 'common:unsavedChanges.stay',
      intent: 'destructive',
    });
  }, [confirm, isDirty]);

  const requestClose = useCallback(
    async (close: () => void) => {
      if (!(await confirmDiscard())) return false;
      close();
      return true;
    },
    [confirmDiscard]
  );

  return { requestClose, confirmDiscard };
}
