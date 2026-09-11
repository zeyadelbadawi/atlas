/**
 * The one confirmation shown when leaving an edit with unsaved changes.
 *
 * Mounted once at the router root, so every editable surface in Atlas
 * gets identical wording and identical behaviour rather than each form
 * inventing its own dialog.
 *
 * "Save changes" appears only when at least one dirty form actually
 * registered a save handler — offering a Save button that cannot save
 * would be worse than not offering one.
 */
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
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

  // Blocks only a real location change while something is dirty. A search
  // or hash change on the same path is not leaving the editor — blocking
  // those would fire the dialog on tab switches and anchor links.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // If the last dirty form saves or unmounts while the dialog is open, the
  // reason for blocking is gone — let the navigation through rather than
  // stranding the user behind a question about changes that no longer exist.
  useEffect(() => {
    if (!isDirty && blocker.state === 'blocked') blocker.proceed();
  }, [isDirty, blocker]);

  if (blocker.state !== 'blocked') return null;

  const handleLeave = () => {
    registry?.discardAll();
    blocker.proceed();
  };

  const handleSave = async () => {
    setSaving(true);
    const saved = await registry?.saveAll();
    setSaving(false);
    // Only leave if the save actually worked. A failed save that navigated
    // away anyway would destroy exactly the work this dialog exists to
    // protect.
    if (saved) {
      registry?.discardAll();
      blocker.proceed();
    }
  };

  const canSave = Boolean(registry?.saveAll);

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
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            disabled={isSaving}
            data-testid="unsaved-stay"
            onClick={() => blocker.reset?.()}
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
