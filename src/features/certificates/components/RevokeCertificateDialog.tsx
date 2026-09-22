/**
 * Revoke a certificate (P64 Phase 3, D6).
 *
 * Destructive and permanent: the reason is required because it is what
 * the audit trail and the learner's card will show. The dialog owns its
 * mutation so the table and the detail view share one behaviour.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { useRevokeCertificate } from '@features/learning';
import { apiErrorMessage } from '@utils';
import type { Certificate } from '@types';

export interface RevokeCertificateDialogProps {
  readonly academyId: string;
  /** `null` keeps the dialog mounted-but-closed so its close animation plays. */
  readonly certificate: Certificate | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function RevokeCertificateDialog({
  academyId,
  certificate,
  onOpenChange,
}: RevokeCertificateDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const revoke = useRevokeCertificate(academyId);
  const [reason, setReason] = useState('');
  const open = certificate !== null;

  useEffect(() => {
    if (!open) {
      setReason('');
      revoke.reset();
    }
    // `reset` is stable for the mutation's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmed = reason.trim();

  const handleConfirm = () => {
    if (!certificate || !trimmed) return;
    revoke.mutate(
      { certificateId: certificate.id, payload: { reason: trimmed } },
      {
        onSuccess: () => {
          notifySuccess('certificates:staff.revoke.success');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('certificates:staff.revoke.title', {
              serial: certificate?.serial ?? '',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('certificates:staff.revoke.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="revoke-certificate-reason">
            {t('certificates:staff.revoke.reasonLabel')}
          </Label>
          <Textarea
            id="revoke-certificate-reason"
            rows={3}
            dir="auto"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('certificates:staff.revoke.reasonPlaceholder')}
            aria-describedby="revoke-certificate-reason-hint"
          />
          <p
            id="revoke-certificate-reason-hint"
            className="text-xs text-muted-foreground"
          >
            {t('certificates:staff.revoke.reasonRequired')}
          </p>
        </div>

        {revoke.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {apiErrorMessage(t, i18n, revoke.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={revoke.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={revoke.isPending || !trimmed}
            onClick={handleConfirm}
          >
            {revoke.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('certificates:staff.revoke.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
