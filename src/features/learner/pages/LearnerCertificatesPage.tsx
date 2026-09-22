/**
 * `/my/certificates` — the learner's certificates (P64 Phase 3 §E.6, D6/D7).
 *
 * Three honest states, in order of how much the academy has done:
 *   - the academy is not issuing certificates (`enabled: false`) — said
 *     plainly, so an empty list never reads as "you have earned none";
 *   - issuing, none earned yet — the empty state names the next action;
 *   - a list of cards, one per certificate, revoked ones included with
 *     their reason (the fact that it was withdrawn is part of the record).
 *
 * A download is never a stored URL. "Download PDF" asks the server for a
 * fresh one-hour link on click and opens it; the card then says until
 * when the link is good, with the link itself visible in case the browser
 * refused the new tab. Nothing here pretends to know the render state
 * better than the server: `pending` shows "Preparing…" with a Refresh,
 * `failed` says so and offers no download.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { useCopyToClipboard, useDateFormatter } from '@hooks';
import {
  useMyCertificateDownload,
  useMyCertificates,
} from '@features/learning';
import { apiErrorMessage, isolateNumericExpression } from '@utils';
import type { Certificate, CertificateDownload } from '@types';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { readErrorKind } from '../utils/read-error-kind';

/** Unprefixed on purpose: a shared link should not carry the sharer's language. */
function verifyUrl(verificationCode: string): string {
  return `${window.location.origin}/verify/${encodeURIComponent(verificationCode)}`;
}

interface CopyButtonProps {
  readonly text: string;
  readonly labelKey: string;
  readonly icon: typeof Copy;
  readonly onFailure: () => void;
}

function CopyButton({
  text,
  labelKey,
  icon: Icon,
  onFailure,
}: CopyButtonProps): JSX.Element {
  const { t } = useTranslation();
  const { hasCopied, copy } = useCopyToClipboard();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        void copy(text).then((ok) => {
          if (!ok) onFailure();
        });
      }}
    >
      {hasCopied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Icon className="size-4" aria-hidden />
      )}
      {hasCopied ? t('certificates:learner.card.copied') : t(labelKey)}
    </Button>
  );
}

interface CertificateCardProps {
  readonly certificate: Certificate;
  readonly onRefresh: () => void;
}

function CertificateCard({
  certificate,
  onRefresh,
}: CertificateCardProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const download = useMyCertificateDownload();
  const [link, setLink] = useState<CertificateDownload | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const isRevoked = certificate.status === 'revoked';
  const canDownload = !isRevoked && certificate.renderStatus === 'ready';

  const fetchAndOpen = () => {
    download.mutate(certificate.id, {
      onSuccess: (fresh) => {
        setLink(fresh);
        // `noopener` keeps the signed URL's tab from reaching this one.
        window.open(fresh.url, '_blank', 'noopener,noreferrer');
      },
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3
              className="font-display text-base font-semibold text-foreground"
              dir="auto"
            >
              {certificate.courseTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('certificates:learner.card.serial')}:{' '}
              <span className="font-mono text-foreground">
                {isolateNumericExpression(certificate.serial)}
              </span>
              {' · '}
              {t('certificates:learner.card.issuedOn', {
                date: fmt.date(certificate.issuedAt),
              })}
              {certificate.overallScore !== null ? (
                <>
                  {' · '}
                  {t('certificates:learner.card.score', {
                    score: Math.round(certificate.overallScore),
                  })}
                </>
              ) : null}
            </p>
          </div>
          <StatusBadge
            labelKey={`certificates:status.${certificate.status}`}
            tone={isRevoked ? 'destructive' : 'success'}
          />
        </div>

        {isRevoked ? (
          <p className="text-sm text-muted-foreground">
            {certificate.revokedAt
              ? t('certificates:learner.card.revokedOn', {
                  date: fmt.date(certificate.revokedAt),
                })
              : null}
            {certificate.revokeReason ? (
              <>
                {' · '}
                <span dir="auto">
                  {t('certificates:learner.card.revokeReason', {
                    reason: certificate.revokeReason,
                  })}
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        {/* Verification: the code as it is printed, and the two copies. */}
        <div className="space-y-2 rounded-lg border border-border bg-surface/40 p-3">
          <p className="text-xs text-muted-foreground">
            {t('certificates:learner.card.code')}
          </p>
          <p className="font-mono text-lg tracking-wider text-foreground">
            {isolateNumericExpression(certificate.verificationCodeDisplay)}
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton
              text={certificate.verificationCodeDisplay}
              labelKey="certificates:learner.card.copyCode"
              icon={Copy}
              onFailure={() => setCopyFailed(true)}
            />
            <CopyButton
              text={verifyUrl(certificate.verificationCode)}
              labelKey="certificates:learner.card.copyLink"
              icon={Link2}
              onFailure={() => setCopyFailed(true)}
            />
          </div>
          {copyFailed ? (
            <p className="text-xs text-muted-foreground" role="status">
              {t('certificates:learner.card.copyFailed')}
            </p>
          ) : null}
        </div>

        {/* The one primary action, or the reason there is none. */}
        {isRevoked ? (
          <p className="text-sm text-muted-foreground">
            {t('certificates:learner.card.revokedNoDownload')}
          </p>
        ) : certificate.renderStatus === 'pending' ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
              <span>
                {t('certificates:learner.card.preparing')}
                <span className="block text-xs text-muted-foreground">
                  {t('certificates:learner.card.preparingHint')}
                </span>
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRefresh}
            >
              <RefreshCw className="size-4" aria-hidden />
              {t('certificates:learner.card.refresh')}
            </Button>
          </div>
        ) : certificate.renderStatus === 'failed' ? (
          <Alert variant="destructive">
            <AlertDescription>
              {t('certificates:learner.card.failed')}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={!canDownload || download.isPending}
                onClick={fetchAndOpen}
              >
                {download.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                {download.isPending
                  ? t('certificates:learner.card.downloading')
                  : t('certificates:learner.card.download')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canDownload || download.isPending}
                onClick={fetchAndOpen}
              >
                <Printer className="size-4" aria-hidden />
                {t('certificates:learner.card.print')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {link
                ? t('certificates:learner.card.linkValidUntil', {
                    time: fmt.dateTime(link.expiresAt),
                  })
                : t('certificates:learner.card.downloadHint')}
              {link ? (
                <>
                  {' · '}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground underline underline-offset-2"
                  >
                    {t('certificates:learner.card.openPdf')}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </>
              ) : null}
            </p>
            {download.error ? (
              <p className="text-sm text-destructive" role="alert">
                {apiErrorMessage(t, i18n, download.error)}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LearnerCertificatesPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useLearnerSurface();
  const { data, isLoading, error, refetch } = useMyCertificates(academyId);

  const header = (
    <LearnerPageHeader
      section="certificates"
      titleKey="learning:learnerDashboard.certificates.title"
      descriptionKey="learning:learnerDashboard.certificates.subtitle"
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorState
          kind={readErrorKind(error)}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (isLoading || !data) {
    return (
      <>
        {header}
        <div className="space-y-4" role="status" aria-live="polite">
          <span className="sr-only">{t('certificates:learner.loading')}</span>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  if (!data.enabled) {
    return (
      <>
        {header}
        <LearnerSectionPlaceholder
          icon={Award}
          titleKey="certificates:learner.notIssued.title"
          descriptionKey="certificates:learner.notIssued.description"
        />
      </>
    );
  }

  if (data.items.length === 0) {
    return (
      <>
        {header}
        <LearnerSectionPlaceholder
          icon={Award}
          titleKey="certificates:learner.empty.title"
          descriptionKey="certificates:learner.empty.description"
        />
      </>
    );
  }

  return (
    <>
      {header}
      <ul className="space-y-4" role="list">
        {data.items.map((certificate) => (
          <li key={certificate.id}>
            <CertificateCard
              certificate={certificate}
              onRefresh={() => void refetch()}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
