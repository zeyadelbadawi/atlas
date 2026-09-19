/**
 * "You are already learning on another device" (§E.4).
 *
 * EXPLICIT CONFIRMATION, AND IT NAMES THE OTHER DEVICE. The backend's 409
 * carries `details.deviceLabel` and `details.since` for exactly this
 * dialog: a learner cannot meaningfully agree to end a session they
 * cannot identify, and "end your other session?" with no other session
 * named is the kind of dialog people click through and then complain
 * about. When the label is genuinely unknown — the server sends `null`
 * when it cannot name the device — the dialog says so rather than
 * inventing one.
 *
 * TAKEOVER IS NOT A RETRY. Confirming here revokes the other session's
 * refresh token so it cannot take the lease straight back, and writes
 * `DEVICE_SESSION_TAKEOVER` naming both sides. That is a real consequence
 * on a real device the learner may be holding, which is why it is a
 * decision put to them and never something the player does on its own
 * after a failed grant.
 *
 * THE CANCEL PATH IS A REAL CHOICE. "Keep learning there" closes the
 * dialog and leaves the player showing the conflict state — the learner
 * has decided, and the player must not quietly try again.
 */
import { useTranslation } from 'react-i18next';
import { Loader2, MonitorSmartphone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDateFormatter } from '@hooks';
import type { SessionConflictDetails } from '@types';

export interface SessionTakeoverDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly conflict: SessionConflictDetails | undefined;
  readonly onConfirm: () => void;
  readonly isPending?: boolean;
  /** Shown in place of the description when the takeover itself failed. */
  readonly errorMessage?: string;
}

export function SessionTakeoverDialog({
  open,
  onOpenChange,
  conflict,
  onConfirm,
  isPending,
  errorMessage,
}: SessionTakeoverDialogProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();

  const deviceLabel =
    conflict?.deviceLabel ?? t('learning:player.takeover.unknownDevice');
  const since = conflict?.since ? fmt.dateTime(conflict.since) : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-5" aria-hidden />
            {t('learning:player.takeover.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {since
              ? t('learning:player.takeover.descriptionSince', {
                  device: deviceLabel,
                  since,
                })
              : t('learning:player.takeover.description', {
                  device: deviceLabel,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('learning:player.takeover.cancel')}
          </AlertDialogCancel>
          {/*
            `onSelect` is not used to keep the dialog open on failure —
            `AlertDialogAction` closes on click by design, and a takeover
            that fails re-opens with the message above rather than
            fighting the primitive's own behaviour.
          */}
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
            {t('learning:player.takeover.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
