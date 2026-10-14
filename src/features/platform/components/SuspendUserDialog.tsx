/**
 * B0-SEC-07 — the Platform Owner suspends or reinstates an account.
 *
 * Suspending signs the person out everywhere at once and refuses sign-in
 * until reinstated; nothing is deleted. A reason is required to suspend
 * (it is written to the audit log) and optional to reinstate. The server
 * refuses the operator's own account and other Platform Owners, and that
 * refusal is shown here in plain words.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@hooks';
import { apiErrorMessage } from '@utils';
import { useUserSuspension } from '../hooks';

const MAX_REASON_LENGTH = 500;

export interface SuspendUserDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'suspend' | 'unsuspend';
  readonly userId: string;
  readonly userEmail: string;
  readonly userName: string;
}

export function SuspendUserDialog({
  open,
  onOpenChange,
  mode,
  userId,
  userEmail,
  userName,
}: SuspendUserDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const suspension = useUserSuspension();
  const [reason, setReason] = useState('');
  const suspending = mode === 'suspend';

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const canConfirm =
    !suspension.isPending && (!suspending || reason.trim().length > 0);

  const confirm = (): void => {
    suspension.mutate(
      { userId, action: mode, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast({
            title: t(
              suspending
                ? 'platform:users.suspend.suspended'
                : 'platform:users.suspend.reinstated'
            ),
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: t('platform:users.suspend.failed'),
            description: apiErrorMessage(t, i18n, error),
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(
              suspending
                ? 'platform:users.suspend.title'
                : 'platform:users.suspend.reinstateTitle'
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              suspending
                ? 'platform:users.suspend.description'
                : 'platform:users.suspend.reinstateDescription',
              { name: userName, email: userEmail }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="suspension-reason">
            {t('platform:users.suspend.reasonLabel')}
          </Label>
          <Textarea
            id="suspension-reason"
            value={reason}
            maxLength={MAX_REASON_LENGTH}
            required={suspending}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby="suspension-reason-hint"
          />
          <p
            id="suspension-reason-hint"
            className="text-xs text-muted-foreground"
          >
            {t(
              suspending
                ? 'platform:users.suspend.reasonHint'
                : 'platform:users.suspend.reasonOptionalHint'
            )}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('platform:users.suspend.cancel')}
          </Button>
          <Button
            type="button"
            variant={suspending ? 'destructive' : 'default'}
            disabled={!canConfirm}
            onClick={confirm}
          >
            {suspension.isPending ? (
              <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
            ) : null}
            {t(
              suspending
                ? 'platform:users.suspend.confirm'
                : 'platform:users.suspend.reinstateConfirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
