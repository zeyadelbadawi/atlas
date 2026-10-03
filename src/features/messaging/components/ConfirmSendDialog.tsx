/**
 * W3-compose — the confirmation step before anything is sent.
 *
 * Restates exactly what will happen (recipients, emails, in-app, quota
 * after the send). An audience of 1,000 or more needs an explicit tick,
 * which the server also requires (`confirmLargeAudience`). The send button
 * is disabled while the request is in flight — a double click cannot send
 * twice, and a retry after an error reuses the same idempotency key.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNumber } from '@utils';
import type { LanguageCode } from '@types';
import type { CampaignChannels, CampaignPreview } from '../messaging.types';
import { LARGE_AUDIENCE } from '../messaging.types';

export interface ConfirmSendDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly preview: CampaignPreview;
  readonly channels: CampaignChannels;
  readonly subject: string;
  readonly isSending: boolean;
  readonly onConfirm: (confirmLargeAudience: boolean) => void;
}

export function ConfirmSendDialog({
  open,
  onOpenChange,
  preview,
  channels,
  subject,
  isSending,
  onConfirm,
}: ConfirmSendDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const n = (value: number) => formatNumber(value, language);
  const large = preview.recipientCount >= LARGE_AUDIENCE;
  const [acknowledged, setAcknowledged] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  const remainingAfter =
    preview.quota && preview.quota.remaining !== null && channels.email
      ? Math.max(0, preview.quota.remaining - preview.emailCount)
      : null;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isSending && onOpenChange(next)}>
      <AlertDialogContent data-testid="confirm-send-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('messaging:confirm.title')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{t('messaging:confirm.subject')}</span>{' '}
                <span dir="auto">{subject}</span>
              </p>
              <ul className="list-disc space-y-1 ps-5">
                <li>{t('messaging:confirm.recipients', { count: preview.recipientCount, formatted: n(preview.recipientCount) })}</li>
                {channels.email ? (
                  <li>{t('messaging:confirm.emails', { count: preview.emailCount, formatted: n(preview.emailCount) })}</li>
                ) : null}
                {channels.inApp ? (
                  <li>{t('messaging:confirm.inApp', { count: preview.inAppCount, formatted: n(preview.inAppCount) })}</li>
                ) : null}
                {remainingAfter !== null ? (
                  <li>{t('messaging:confirm.quotaAfter', { count: remainingAfter, formatted: n(remainingAfter) })}</li>
                ) : null}
              </ul>
              <p className="text-muted-foreground">{t('messaging:confirm.irreversible')}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {large ? (
          <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
            <Checkbox
              id={checkboxId}
              checked={acknowledged}
              onCheckedChange={(value) => setAcknowledged(value === true)}
              className="mt-0.5 h-5 w-5"
              data-testid="confirm-large-audience"
            />
            <label htmlFor={checkboxId} className="text-sm">
              {t('messaging:confirm.largeAudience', { formatted: n(preview.recipientCount) })}
            </label>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11" disabled={isSending}>
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <Button
            type="button"
            className="min-h-11"
            disabled={isSending || (large && !acknowledged)}
            aria-busy={isSending}
            data-testid="confirm-send"
            onClick={() => onConfirm(large && acknowledged)}
          >
            {isSending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('messaging:confirm.sending')}
              </>
            ) : (
              t('messaging:confirm.send')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
