/**
 * The one confirmation shown when leaving an edit with unsaved changes.
 *
 * Mounted once at the router root, so every editable surface in Atlas
 * gets identical wording and identical behaviour rather than each form
 * inventing its own dialog.
 *
 * "Save and leave" appears only when EVERY dirty form registered a save
 * handler — a button that saved some forms and silently dropped the others
 * would lose exactly the work it promises to keep. It runs the forms'
 * own saves (validation and authorization included), stays open on any
 * failure, and continues to the destination the user picked exactly once.
 */
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUnsavedChangesRegistry } from './UnsavedChangesProvider';

export function NavigationBlockDialog(): JSX.Element | null {
  const { t } = useTranslation();
  const registry = useUnsavedChangesRegistry();
  const isDirty = registry?.isDirty ?? false;
  const [isSaving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Blocks only a real location change while something is dirty. A search
  // or hash change on the same path is not leaving the editor — blocking
  // those would fire the dialog on tab switches and anchor links.
  // Blocks only a real location change while something is dirty. A search
  // or hash change on the same path is not leaving the editor — blocking
  // those would fire the dialog on tab switches and anchor links.
  //
  // `isDirtyNow()` reads the registry's live set, not the rendered
  // `isDirty`: a form that saves, calls `markSaved()` and navigates in the
  // same tick must not be stopped by the state it has just saved.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (registry?.isDirtyNow() ?? false) &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // `proceed()` must run once per blocked navigation: "Save and leave"
  // proceeds itself, and clearing the dirt also triggers the effect below —
  // a second `proceed()` is an invalid blocker transition in the router.
  const proceededRef = useRef(false);
  const savingRef = useRef(false);
  const proceedOnce = () => {
    if (proceededRef.current || blocker.state !== 'blocked') return;
    proceededRef.current = true;
    blocker.proceed();
  };
  // Re-armed only when a NEW navigation is blocked. Resetting when the
  // blocker went back to unblocked let a save that had already been
  // overtaken (the form marked itself clean, the effect below proceeded)
  // call proceed() again on an unblocked blocker.
  useEffect(() => {
    if (blocker.state === 'blocked') proceededRef.current = false;
  }, [blocker.state]);

  // If the last dirty form saves or unmounts while the dialog is open, the
  // reason for blocking is gone — let the navigation through rather than
  // stranding the user behind a question about changes that no longer exist.
  useEffect(() => {
    if (!isDirty && blocker.state === 'blocked') proceedOnce();
  });

  if (blocker.state !== 'blocked') return null;

  const handleLeave = () => {
    registry?.discardAll();
    proceedOnce();
  };

  const handleSave = async () => {
    // A ref, not `isSaving`: state is stale inside the same tick, so a
    // double click used to start two saves — and the second resolved after
    // navigation had finished, then tried to proceed a blocker that was no
    // longer blocked.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const saved = (await registry?.saveAll()) ?? false;
    savingRef.current = false;
    setSaving(false);
    // Only leave if the save actually worked. A failed save that navigated
    // away anyway would destroy exactly the work this dialog exists to
    // protect; the form keeps its edits and shows its own error.
    if (saved) {
      registry?.discardAll();
      proceedOnce();
    } else {
      setSaveFailed(true);
    }
  };

  const canSave = registry?.canSaveAll ?? false;

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('common:unsavedChanges.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('common:unsavedChanges.description')}
          </AlertDialogDescription>
          {saveFailed ? (
            <p
              role="alert"
              data-testid="unsaved-save-failed"
              className="text-sm text-destructive"
            >
              {t('common:unsavedChanges.saveFailed')}
            </p>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            disabled={isSaving}
            data-testid="unsaved-stay"
            onClick={() => {
              setSaveFailed(false);
              blocker.reset?.();
            }}
          >
            {t('common:unsavedChanges.stay')}
          </Button>
          <Button
            variant="ghost"
            disabled={isSaving}
            data-testid="unsaved-leave"
            onClick={handleLeave}
          >
            {t('common:unsavedChanges.leave')}
          </Button>
          {canSave ? (
            <Button
              disabled={isSaving}
              data-testid="unsaved-save"
              onClick={() => void handleSave()}
            >
              {isSaving
                ? t('common:unsavedChanges.saving')
                : t('common:unsavedChanges.save')}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
