/**
 * Issue a certificate by hand for one enrollment (P64 Phase 3, D6).
 *
 * Opened from the roster drawer. Owns its mutation, its toast and its
 * error copy: the error the backend names (`errors.certificate.*`) is
 * rendered through `apiErrorMessage`, never as "Unexpected error" when
 * the application knows what happened. On success the serial is shown
 * inside the dialog as well as toasted, so a manager who blinks still
 * has it.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useIssueCertificate } from '@features/learning';
import { apiErrorMessage, isolateNumericExpression } from '@utils';

export interface IssueCertificateTarget {
  readonly enrollmentId: string;
  readonly courseTitle: string;
  readonly studentName: string;
}

export interface IssueCertificateDialogProps {
  readonly academyId: string;
  /** `null` keeps the dialog mounted-but-closed so its close animation plays. */
  readonly target: IssueCertificateTarget | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function IssueCertificateDialog({
  academyId,
  target,
  onOpenChange,
}: IssueCertificateDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const issue = useIssueCertificate(academyId);
  const [reason, setReason] = useState('');
  const [force, setForce] = useState(false);
  const [issuedSerial, setIssuedSerial] = useState<string | null>(null);
  const open = target !== null;

  useEffect(() => {
    if (!open) {
      setReason('');
      setForce(false);
      setIssuedSerial(null);
      issue.reset();
    }
    // `reset` is stable for the mutation's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = async () => {
    if (!target) return;
    const trimmed = reason.trim();
    try {
      const certificate = await issue.mutateAsync({
        enrollmentId: target.enrollmentId,
        payload: {
          ...(trimmed ? { reason: trimmed } : {}),
          ...(force ? { force: true } : {}),
        },
      });
      setIssuedSerial(certificate.serial);
      notifySuccess(
        'certificates:issue.success',
        'certificates:issue.successDescription',
        { serial: certificate.serial }
      );
    } catch {
      // Rendered below from `issue.error`.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('certificates:issue.title')}</DialogTitle>
          <DialogDescription>
            {t('certificates:issue.description', {
              course: target?.courseTitle ?? '',
              name: target?.studentName ?? '',
            })}
          </DialogDescription>
        </DialogHeader>

        {issuedSerial ? (
          <div
            className="flex items-start gap-3 rounded-lg border border-success/50 bg-success-surface p-4 text-sm"
            role="status"
          >
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden
            />
            <div>
              <p className="font-medium text-foreground">
                {t('certificates:issue.success')}
              </p>
              <p className="font-mono text-foreground">
                {t('certificates:issue.issued', {
                  serial: isolateNumericExpression(issuedSerial),
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issue-certificate-reason">
                {t('certificates:issue.reasonLabel')}
              </Label>
              <Textarea
                id="issue-certificate-reason"
                rows={3}
                dir="auto"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('certificates:issue.reasonPlaceholder')}
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="issue-certificate-force"
                checked={force}
                onCheckedChange={(value) => setForce(value === true)}
                aria-describedby="issue-certificate-force-hint"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="issue-certificate-force"
                  className="font-normal"
                >
                  {t('certificates:issue.force')}
                </Label>
                <p
                  id="issue-certificate-force-hint"
                  className="text-xs text-muted-foreground"
                >
                  {t('certificates:issue.forceHint')}
                </p>
              </div>
            </div>

            {issue.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {apiErrorMessage(t, i18n, issue.error)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {issuedSerial ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              {t('common:actions.close')}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={issue.isPending}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="button"
                disabled={issue.isPending}
                onClick={() => void handleConfirm()}
              >
                {issue.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Award className="size-4" aria-hidden />
                )}
                {t('certificates:issue.confirm')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
