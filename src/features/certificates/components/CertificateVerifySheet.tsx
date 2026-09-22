/**
 * The public certificate fact sheet (P64 Phase 3, D6).
 *
 * Read-only, no session, identical on the platform host and on every
 * academy host — the only identity it shows is the academy name the server
 * returns, so a certificate from academy A can never be dressed as B's.
 *
 * `valid: false` is a neutral notice, not an error: an unknown code and a
 * malformed one look identical by design (enumeration resistance), and
 * the most common cause is a mistyped character. Only a transport failure
 * — the service did not answer — is rendered with the error tone.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2, SearchX, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { useDateFormatter } from '@hooks';
import { useVerifyCertificate } from '@features/learning';
import { isolateNumericExpression } from '@utils';
import {
  certificateStatusLabelKey,
  certificateStatusTone,
} from '../utils/certificate.utils';

export interface CertificateVerifySheetProps {
  /** The code from the URL, exactly as the visitor arrived with it. */
  readonly code: string;
}

export function CertificateVerifySheet({
  code,
}: CertificateVerifySheetProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { data, isLoading, error, refetch } = useVerifyCertificate(code);

  if (isLoading) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-live="polite"
        data-testid="certificate-verify-loading"
      >
        <span className="sr-only">{t('certificates:verify.loading')}</span>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        kind={error?.kind === 'rateLimited' ? 'rateLimited' : 'unknown'}
        titleKey="certificates:verify.error.title"
        descriptionKey="certificates:verify.error.description"
        requestId={error?.requestId}
        onRetry={() => void refetch()}
      />
    );
  }

  // The server answers `valid: false` for BOTH an unknown code and a revoked
  // certificate; only the revoked one carries a status and its facts. A
  // revoked certificate is a real record the visitor should see as revoked
  // — never "does not match" (production validation, 22 Sep 2026).
  const isRevoked = data.status === 'revoked';

  if (!data.valid && !isRevoked) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-10 text-center"
        role="status"
        data-testid="certificate-verify-invalid"
      >
        <span className="flex size-12 items-center justify-center rounded-pill bg-muted text-muted-foreground">
          <SearchX className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h2 className="font-display text-base font-semibold text-foreground">
            {t('certificates:verify.invalid.title')}
          </h2>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            {t('certificates:verify.invalid.description')}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('certificates:verify.codeLabel')}:{' '}
          <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-foreground">
            {isolateNumericExpression(code)}
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="certificate-verify-valid">
      {isRevoked ? (
        <Alert
          className="border-warning/50 bg-warning-surface text-foreground [&>svg]:text-warning"
          data-testid="certificate-verify-revoked"
        >
          <ShieldAlert className="size-4" aria-hidden />
          <AlertTitle>
            {t('certificates:verify.revoked.title', {
              date: data.revokedAt ? fmt.date(data.revokedAt) : '—',
            })}
          </AlertTitle>
          <AlertDescription>
            {t('certificates:verify.revoked.description')}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-success/50 bg-success-surface text-foreground [&>svg]:text-success">
          <CheckCircle2 className="size-4" aria-hidden />
          <AlertTitle>{t('certificates:verify.valid.title')}</AlertTitle>
          <AlertDescription>
            {t('certificates:verify.valid.description')}
          </AlertDescription>
        </Alert>
      )}

      <section
        aria-labelledby="certificate-facts-heading"
        className="rounded-lg border border-border bg-card p-5"
      >
        <h2
          id="certificate-facts-heading"
          className="font-display text-sm font-semibold text-foreground"
        >
          {t('certificates:verify.facts.title')}
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.issuedTo')}
          </dt>
          <dd className="font-medium text-foreground" dir="auto">
            {data.issuedTo ?? '—'}
          </dd>

          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.course')}
          </dt>
          <dd className="text-foreground" dir="auto">
            {data.courseTitle ?? '—'}
          </dd>

          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.academy')}
          </dt>
          <dd className="text-foreground" dir="auto">
            {data.academyName ?? '—'}
          </dd>

          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.issuedOn')}
          </dt>
          <dd className="text-foreground">
            {data.issuedAt ? fmt.date(data.issuedAt) : '—'}
          </dd>

          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.completedOn')}
          </dt>
          <dd className="text-foreground">
            {data.completedAt ? fmt.date(data.completedAt) : '—'}
          </dd>

          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.serial')}
          </dt>
          <dd className="font-mono text-foreground">
            {data.serial ? isolateNumericExpression(data.serial) : '—'}
          </dd>

          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.version')}
          </dt>
          <dd className="tabular-nums text-foreground">
            {data.version ?? '—'}
          </dd>

          <dt className="text-muted-foreground">
            {t('certificates:verify.facts.status')}
          </dt>
          <dd>
            {data.status ? (
              <StatusBadge
                labelKey={certificateStatusLabelKey(data.status)}
                tone={certificateStatusTone(data.status)}
              />
            ) : (
              '—'
            )}
          </dd>
        </dl>
      </section>
    </div>
  );
}
