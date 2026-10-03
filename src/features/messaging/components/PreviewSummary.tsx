/**
 * W3-compose — what a send would do, from the server's preview: who is
 * reached, how many emails and in-app notifications, and who is left out
 * of the email and why. Announced politely to screen readers when it
 * changes.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BellRing, Mail, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatNumber } from '@utils';
import type { LanguageCode } from '@types';
import type { CampaignChannels, CampaignPreview } from '../messaging.types';

export interface PreviewSummaryProps {
  readonly preview: CampaignPreview;
  readonly channels: CampaignChannels;
  readonly showLearnerExclusions?: boolean;
}

export function PreviewSummary({
  preview,
  channels,
  showLearnerExclusions = false,
}: PreviewSummaryProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const n = (value: number) => formatNumber(value, language);
  const exclusions = [
    channels.email && preview.excluded.optedOut > 0
      ? t('messaging:preview.optedOut', {
          count: preview.excluded.optedOut,
          formatted: n(preview.excluded.optedOut),
        })
      : null,
    channels.email && preview.excluded.suppressed > 0
      ? t('messaging:preview.suppressed', {
          count: preview.excluded.suppressed,
          formatted: n(preview.excluded.suppressed),
        })
      : null,
    showLearnerExclusions && preview.excluded.blocked > 0
      ? t('messaging:preview.blocked', {
          count: preview.excluded.blocked,
          formatted: n(preview.excluded.blocked),
        })
      : null,
    showLearnerExclusions && preview.excluded.pending > 0
      ? t('messaging:preview.pending', {
          count: preview.excluded.pending,
          formatted: n(preview.excluded.pending),
        })
      : null,
  ].filter((line): line is string => line !== null);

  return (
    <section
      aria-live="polite"
      aria-labelledby="message-preview-heading"
      className="space-y-3 rounded-md border border-border bg-muted/40 p-4"
      data-testid="message-preview"
    >
      <h3 id="message-preview-heading" className="text-sm font-semibold">
        {t('messaging:preview.title')}
      </h3>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <dt className="text-sm text-muted-foreground">
            {t('messaging:preview.recipients')}
          </dt>
          <dd
            className="ms-auto text-sm font-semibold sm:ms-0"
            data-testid="preview-recipients"
          >
            {n(preview.recipientCount)}
          </dd>
        </div>
        {channels.email ? (
          <div className="flex items-center gap-2">
            <Mail
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <dt className="text-sm text-muted-foreground">
              {t('messaging:preview.emails')}
            </dt>
            <dd
              className="ms-auto text-sm font-semibold sm:ms-0"
              data-testid="preview-emails"
            >
              {n(preview.emailCount)}
            </dd>
          </div>
        ) : null}
        {channels.inApp ? (
          <div className="flex items-center gap-2">
            <BellRing
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <dt className="text-sm text-muted-foreground">
              {t('messaging:preview.inApp')}
            </dt>
            <dd
              className="ms-auto text-sm font-semibold sm:ms-0"
              data-testid="preview-in-app"
            >
              {n(preview.inAppCount)}
            </dd>
          </div>
        ) : null}
      </dl>
      {exclusions.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t('messaging:preview.notEmailed')}
          </p>
          <ul className="list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">
            {exclusions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.recipientCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('messaging:preview.nobody')}
        </p>
      ) : null}
      {channels.email && preview.overBy > 0 && preview.quota ? (
        <Alert variant="destructive" data-testid="preview-over-quota">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t('messaging:preview.overQuotaTitle')}</AlertTitle>
          <AlertDescription>
            {t('messaging:preview.overQuota', {
              emails: n(preview.emailCount),
              remaining: n(preview.quota.remaining ?? 0),
            })}
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
