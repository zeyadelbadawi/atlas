/**
 * Regenerate a certificate (P64 Phase 3, D7).
 *
 * Explicit and versioned: the serial and the verification code stay the
 * same, a new snapshot and PDF are produced under a new version. The
 * dialog says exactly that, because "regenerate" on its own reads as
 * "re-score", which it never is.
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
import { useRegenerateCertificate } from '@features/learning';
import { apiErrorMessage } from '@utils';
import type { Certificate } from '@types';

export interface RegenerateCertificateDialogProps {
  readonly academyId: string;
  readonly certificate: Certificate | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function RegenerateCertificateDialog({
  academyId,
  certificate,
  onOpenChange,
}: RegenerateCertificateDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const regenerate = useRegenerateCertificate(academyId);
  const [reason, setReason] = useState('');
  const open = certificate !== null;

  useEffect(() => {
    if (!open) {
      setReason('');
      regenerate.reset();
    }
    // `reset` is stable for the mutation's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    if (!certificate) return;
    const trimmed = reason.trim();
    regenerate.mutate(
      {
        certificateId: certificate.id,
        payload: trimmed ? { reason: trimmed } : {},
      },
      {
        onSuccess: (updated) => {
          notifySuccess(
            'certificates:staff.regenerate.success',
            'certificates:staff.regenerate.successDescription',
            { version: updated.version }
          );
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
            {t('certificates:staff.regenerate.title', {
              serial: certificate?.serial ?? '',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('certificates:staff.regenerate.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="regenerate-certificate-reason">
            {t('certificates:staff.regenerate.reasonLabel')}
          </Label>
          <Textarea
            id="regenerate-certificate-reason"
            rows={3}
            dir="auto"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('certificates:staff.regenerate.reasonPlaceholder')}
          />
        </div>

        {regenerate.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {apiErrorMessage(t, i18n, regenerate.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={regenerate.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            disabled={regenerate.isPending}
            onClick={handleConfirm}
          >
            {regenerate.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('certificates:staff.regenerate.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
