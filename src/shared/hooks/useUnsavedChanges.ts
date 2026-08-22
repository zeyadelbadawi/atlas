/**
 * useUnsavedChanges hook.
 *
 * Warns the user when navigating away from a dirty form. Integrates with the
 * existing dialog provider to show a confirmation dialog.
 */
import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import type { Blocker } from 'react-router-dom';
import { useConfirmDialog } from '@app/providers';

export interface UseUnsavedChangesOptions {
  /** Whether the form has unsaved changes. */
  readonly isDirty: boolean;

  /** Translation key for the confirmation message. */
  readonly messageKey?: string;
}

export function useUnsavedChanges({
  isDirty,
  messageKey = 'validation:unsavedChanges.message',
}: UseUnsavedChangesOptions): void {
  const { confirm } = useConfirmDialog();

  const blocker: Blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const handleConfirm = useCallback(async () => {
    const confirmed = await confirm({
      titleKey: 'validation:unsavedChanges.title',
      descriptionKey: messageKey,
      confirmLabelKey: 'common:actions.leave',
      cancelLabelKey: 'common:actions.stay',
      intent: 'default',
    });

    if (confirmed && blocker.state === 'blocked') {
      blocker.proceed();
    } else if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [confirm, messageKey, blocker]);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      void handleConfirm();
    }
  }, [blocker.state, handleConfirm]);
}