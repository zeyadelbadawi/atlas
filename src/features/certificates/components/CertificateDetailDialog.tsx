/**
 * One certificate, every recorded fact (P64 Phase 3, D6/D7).
 *
 * Reads the staff detail endpoint, which carries a fresh one-hour signed
 * link when the PDF is ready. The facts are the issuance snapshot: they do
 * not move when the learner retakes a quiz, and the dialog says so.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { useDateFormatter } from '@hooks';
import { useAcademyCertificate } from '@features/learning';
import { isolateNumericExpression } from '@utils';
import {
  certificateRenderLabelKey,
  certificateRenderTone,
  certificateStatusLabelKey,
  certificateStatusTone,
} from '../utils/certificate.utils';

export interface CertificateDetailDialogProps {
  readonly academyId: string;
  /** `null` keeps the dialog mounted-but-closed so its close animation plays. */
  readonly certificateId: string | null;
  readonly onOpenChange: (open: boolean) => void;
}

function Fact({
  label,
  children,
  mono = false,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly mono?: boolean;
}): JSX.Element {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={mono ? 'font-mono text-foreground' : 'text-foreground'}
        dir="auto"
      >
        {children}
      </dd>
    </>
  );
}

export function CertificateDetailDialog({
  academyId,
  certificateId,
  onOpenChange,
}: CertificateDetailDialogProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const open = certificateId !== null;
  const { data, isLoading, error, refetch } = useAcademyCertificate(
    academyId,
    certificateId ?? undefined,
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('certificates:staff.detail.title', {
              serial: data?.serial ?? '…',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('certificates:staff.detail.description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error || !data ? (
          <ErrorState kind={error?.kind} onRetry={() => void refetch()} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                labelKey={certificateStatusLabelKey(data.status)}
                tone={certificateStatusTone(data.status)}
              />
              <StatusBadge
                labelKey={certificateRenderLabelKey(data.renderStatus)}
                tone={certificateRenderTone(data.renderStatus)}
              />
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
              <Fact label={t('certificates:staff.detail.learner')}>
                {data.studentName}
                {data.studentEmail ? (
                  <span className="block text-xs text-muted-foreground">
                    {data.studentEmail}
                  </span>
                ) : null}
              </Fact>
              <Fact label={t('certificates:staff.detail.nameOnCertificate')}>
                {data.learnerNameOnCertificate}
              </Fact>
              <Fact label={t('certificates:staff.detail.course')}>
                {data.courseTitle}
              </Fact>
              <Fact label={t('certificates:staff.table.serial')} mono>
                {isolateNumericExpression(data.serial)}
              </Fact>
              <Fact label={t('certificates:staff.detail.code')} mono>
                {isolateNumericExpression(data.verificationCodeDisplay)}
              </Fact>
              <Fact label={t('certificates:staff.detail.issuedOn')}>
                {fmt.dateTime(data.issuedAt)}
              </Fact>
              <Fact label={t('certificates:staff.detail.completedOn')}>
                {data.completedAt ? fmt.date(data.completedAt) : '—'}
              </Fact>
              <Fact label={t('certificates:staff.detail.score')}>
                {data.overallScore !== null
                  ? isolateNumericExpression(
                      `${Math.round(data.overallScore)}%`
                    )
                  : '—'}
              </Fact>
              <Fact label={t('certificates:staff.detail.issuedBy')}>
                {t(
                  data.issuedManually
                    ? 'certificates:staff.detail.manual'
                    : 'certificates:staff.detail.automatic'
                )}
              </Fact>
              <Fact label={t('certificates:staff.detail.locale')}>
                {data.locale.toUpperCase()}
              </Fact>
              <Fact label={t('certificates:staff.detail.version')}>
                {data.version}
              </Fact>
              <Fact label={t('certificates:staff.detail.renderedAt')}>
                {data.renderedAt ? fmt.dateTime(data.renderedAt) : '—'}
              </Fact>
              {data.revokedAt ? (
                <>
                  <Fact label={t('certificates:staff.detail.revokedOn')}>
                    {fmt.dateTime(data.revokedAt)}
                  </Fact>
                  <Fact label={t('certificates:staff.detail.revokeReason')}>
                    {data.revokeReason ?? '—'}
                  </Fact>
                </>
              ) : null}
            </dl>

            <DialogFooter className="items-center gap-2 sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {data.download
                  ? t('certificates:staff.detail.downloadHint')
                  : t('certificates:staff.detail.noDownload')}
              </p>
              {data.download ? (
                <Button asChild>
                  <a
                    href={data.download.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={data.download.fileName}
                  >
                    <Download className="size-4" aria-hidden />
                    {t('certificates:staff.actions.download')}
                  </a>
                </Button>
              ) : null}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
