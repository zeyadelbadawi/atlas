/**
 * What an editor sees when their save lost a race.
 *
 * THE HARD PART IS THE SECOND BUTTON. "Reload" is easy and always safe.
 * "Keep my changes" is where this kind of feature usually goes wrong: the
 * obvious implementation force-writes the local copy, which is precisely
 * the silent data loss the whole mechanism exists to prevent, just moved
 * behind a button the user was nudged into clicking.
 *
 * So taking over here does NOT mean overwriting. It re-bases: the next save
 * is sent with the version the server just reported, so it lands on top of
 * the colleague's committed work rather than erasing it. The wording says
 * so plainly, and the colleague's version is never destroyed without the
 * person having been told whose work it was and when it landed.
 *
 * The destructive-looking option is therefore the SECONDARY one, and
 * reloading is primary — the safe action is the easy one.
 */
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SaveConflict } from '../utils/save-conflict.utils';

export interface SaveConflictDialogProps {
  readonly conflict: SaveConflict | null;
  readonly onReload: () => void;
  readonly onKeepMine: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly isSaving: boolean;
}

export function SaveConflictDialog({
  conflict,
  onReload,
  onKeepMine,
  onOpenChange,
  isSaving,
}: SaveConflictDialogProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Dialog open={conflict !== null} onOpenChange={onOpenChange}>
      <DialogContent data-testid="save-conflict-dialog">
        <DialogHeader>
          <DialogTitle>{t('website:conflict.title')}</DialogTitle>
          <DialogDescription>
            {conflict?.lastEditedByName
              ? t('website:conflict.descriptionNamed', {
                  name: conflict.lastEditedByName,
                })
              : t('website:conflict.description')}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t('website:conflict.explainer')}
        </p>

        <DialogFooter>
          {/*
            Secondary, and honestly labelled: it re-applies this editor's
            changes ON TOP of the newer version, it does not discard it.
          */}
          <Button variant="outline" onClick={onKeepMine} disabled={isSaving}>
            {t('website:conflict.keepMine')}
          </Button>
          <Button onClick={onReload} disabled={isSaving}>
            {t('website:conflict.reload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
