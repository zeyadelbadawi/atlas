/**
 * Analysis › Content delivery (P64 Phase 4).
 *
 * The Platform Owner's delivery report, fed by `GET /platform-metrics/
 * delivery`: whether learners are being let in or turned away (grants and
 * the refusal reasons), the video inventory and its processing health
 * (the detail that used to crowd the dashboard card), and retention lag.
 *
 * The retention block is worded carefully: the two numbers are rows that
 * are OLDER than their retention window and STILL in the database when
 * the figures were generated. Zero is the healthy reading; a number that
 * grows between visits means the purge job is behind, and the page says
 * exactly that rather than dressing it up as a KPI.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Film, ShieldCheck, ShieldOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@components/feedback';
import {
  PlatformVideoInventory,
  usePlatformDeliveryMetrics,
} from '@features/platform';
import { formatNumber, formatPercentage } from '@utils';
import {
  BreakdownTable,
  FigureList,
  GeneratedAt,
  ReportSection,
  StatTile,
  TruncatedNotice,
  shareOf,
  toSortedRows,
} from '@components/reporting';
import { useAnalyticsRange } from './useAnalyticsRange';
import type { LanguageCode, PlatformDeliveryMetrics } from '@types';

/** No access checks, no video, nothing past retention: the empty state, not zeros. */
function isEmptyWindow(data: PlatformDeliveryMetrics): boolean {
  return (
    data.grants.granted + data.grants.refused === 0 &&
    data.video.totalVideoAssets === 0 &&
    data.retention.contentAccessLogRowsPastWindow === 0 &&
    data.retention.quizAttemptEventsPastWindow === 0
  );
}

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function AnalyticsDeliveryPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { days } = useAnalyticsRange();
  const { data, isLoading, error, refetch } = usePlatformDeliveryMetrics(days);

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <ErrorState
        kind={error?.kind}
        requestId={error?.requestId}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isEmptyWindow(data)) {
    return (
      <EmptyState
        icon={ShieldCheck}
        titleKey="analytics:delivery.empty.title"
        descriptionKey="analytics:delivery.empty.description"
        values={{ count: data.windowDays }}
      />
    );
  }

  const num = (value: number) => formatNumber(value, language);
  const share = (ratio: number) => formatPercentage(ratio, language, 0);

  const { grants, video, retention } = data;
  const checks = grants.granted + grants.refused;
  const refusalRows = toSortedRows(grants.refusedByReason).map((row) => ({
    key: row.key,
    label: t(`analytics:delivery.grants.reasons.${row.key}`, {
      defaultValue: row.key,
    }),
    value: row.value,
  }));
  const failed = video.processing.failed;
  const pastRetention =
    retention.contentAccessLogRowsPastWindow +
    retention.quizAttemptEventsPastWindow;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={ShieldCheck}
          label={t('analytics:delivery.headline.granted')}
          value={num(grants.granted)}
          hint={t('analytics:delivery.headline.grantedHint', {
            value: share(shareOf(grants.granted, checks)),
          })}
        />
        <StatTile
          icon={ShieldOff}
          label={t('analytics:delivery.headline.refused')}
          value={num(grants.refused)}
          hint={t('analytics:delivery.headline.refusedHint', {
            value: share(shareOf(grants.refused, checks)),
          })}
        />
        <StatTile
          icon={Film}
          label={t('analytics:delivery.headline.storedMinutes')}
          value={num(video.totalStoredMinutes)}
          hint={t('analytics:delivery.headline.storedMinutesHint', {
            count: video.totalVideoAssets,
          })}
        />
        <StatTile
          icon={AlertTriangle}
          label={t('analytics:delivery.headline.failedProcessing')}
          value={num(failed)}
          hint={
            failed > 0
              ? t('analytics:delivery.headline.failedProcessingHint')
              : t('analytics:delivery.headline.failedProcessingOk')
          }
          emphasis={failed > 0 ? 'warning' : 'default'}
        />
      </div>

      <ReportSection
        title={t('analytics:delivery.grants.title')}
        description={t('analytics:delivery.grants.description', {
          count: days,
        })}
      >
        {checks === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('analytics:delivery.grants.none')}
          </p>
        ) : (
          <>
            <FigureList
              items={[
                {
                  key: 'granted',
                  label: t('analytics:delivery.grants.granted'),
                  value: num(grants.granted),
                },
                {
                  key: 'refused',
                  label: t('analytics:delivery.grants.refused'),
                  value: num(grants.refused),
                },
              ]}
            />
            {refusalRows.length > 0 ? (
              <section
                aria-labelledby="delivery-refusals-by-reason"
                className="space-y-2"
              >
                <h3
                  id="delivery-refusals-by-reason"
                  className="text-sm font-semibold text-foreground"
                >
                  {t('analytics:delivery.grants.byReason')}
                </h3>
                <BreakdownTable
                  caption={t('analytics:delivery.grants.byReason')}
                  rows={refusalRows}
                  total={grants.refused}
                  columns={{
                    label: t('analytics:delivery.grants.columns.reason'),
                    count: t('analytics:delivery.grants.columns.count'),
                    share: t('analytics:delivery.grants.columns.share'),
                  }}
                  formatNumber={num}
                  formatShare={share}
                />
              </section>
            ) : null}
            <TruncatedNotice
              show={grants.truncated}
              message={t('analytics:delivery.grants.truncated')}
            />
          </>
        )}
      </ReportSection>

      <ReportSection
        title={t('analytics:delivery.video.title')}
        description={t('analytics:delivery.video.description')}
      >
        <PlatformVideoInventory data={video} />
      </ReportSection>

      <ReportSection
        title={t('analytics:delivery.retention.title')}
        description={t('analytics:delivery.retention.description')}
      >
        <FigureList
          items={[
            {
              key: 'contentAccessLog',
              label: t('analytics:delivery.retention.contentAccessLog'),
              value: num(retention.contentAccessLogRowsPastWindow),
              hint: t('analytics:delivery.retention.rowHint'),
            },
            {
              key: 'quizAttemptEvents',
              label: t('analytics:delivery.retention.quizAttemptEvents'),
              value: num(retention.quizAttemptEventsPastWindow),
              hint: t('analytics:delivery.retention.rowHint'),
            },
          ]}
        />
        <p
          role="status"
          className={
            pastRetention > 0
              ? 'text-sm font-medium text-destructive'
              : 'text-sm text-muted-foreground'
          }
        >
          {pastRetention > 0
            ? t('analytics:delivery.retention.behind', { count: pastRetention })
            : t('analytics:delivery.retention.ok')}
        </p>
      </ReportSection>

      <GeneratedAt timestamp={data.generatedAt} language={language} />
    </div>
  );
}
