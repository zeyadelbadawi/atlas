/**
 * Analysis › Communications (P64 Communications C7).
 *
 * The Platform Owner's answer to one question: **is mail actually going
 * out right now?**
 *
 * That question needs a page rather than a tile because the honest answer
 * is not a single number. A dead dispatcher and a quiet week produce
 * identical totals — zero sent, zero failed — and the only thing that
 * separates them is how long the oldest DUE message has been waiting.
 * So the queue-age reading leads, in words, and the rest of the page
 * exists to explain it: which provider is actually accepting mail, how
 * much of its daily allowance is gone, and who has been blocked.
 *
 * Nothing here can render a real person's address. The backend returns
 * aggregates, and the suppression list is hashed — an operator needs the
 * count, the reason, and the ability to lift a block, none of which
 * requires showing the address.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mailbox,
  ShieldBan,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@components/feedback';
import {
  useCommunicationSuppressions,
  useCommunicationsHealth,
  useUnsuppressAddress,
} from '@features/platform';
import { formatNumber, formatPercentage } from '@utils';
import {
  BreakdownTable,
  GeneratedAt,
  ReportSection,
  StatTile,
  shareOf,
  toSortedRows,
} from '../components/AnalyticsReportPrimitives';
import { useAnalyticsRange } from './useAnalyticsRange';
import type { LanguageCode, PlatformCommunicationsHealth } from '@types';

/**
 * A due message waiting longer than this is not busy, it is stuck. Matches
 * `COMMUNICATIONS_OVERDUE_AFTER_SECONDS` on the server; the page states
 * the verdict in words so it never depends on the reader noticing a colour.
 */
const OVERDUE_AFTER_SECONDS = 15 * 60;

type QueueVerdict = 'idle' | 'flowing' | 'stalled';

function queueVerdict(health: PlatformCommunicationsHealth): QueueVerdict {
  const waiting = health.outbox.oldestPendingSeconds;
  if (waiting === null) return 'idle';
  return waiting >= OVERDUE_AFTER_SECONDS ? 'stalled' : 'flowing';
}

/** Whole units, largest first — "4m 12s" reads faster than "252 seconds". */
function formatDuration(
  seconds: number,
  t: ReturnType<typeof useTranslation>['t']
): string {
  if (seconds < 60)
    return t('analytics:communications.duration.seconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return t('analytics:communications.duration.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return t('analytics:communications.duration.hours', { count: hours });
  return t('analytics:communications.duration.days', {
    count: Math.floor(hours / 24),
  });
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
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function AnalyticsCommunicationsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { days } = useAnalyticsRange();
  const { data, isLoading, error, refetch } = useCommunicationsHealth(days);
  const suppressions = useCommunicationSuppressions();
  const unsuppress = useUnsuppressAddress();
  const [confirming, setConfirming] = useState<string | null>(null);

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

  const num = (value: number) => formatNumber(value, language);
  const share = (ratio: number) => formatPercentage(ratio, language, 0);

  const verdict = queueVerdict(data);
  const waiting = data.outbox.oldestPendingSeconds;
  const primary = data.providers[0];
  const sending = data.providers.filter((p) => p.provider !== 'stub');

  const outboxTotal = Object.values(data.outbox.byState).reduce(
    (a, b) => a + b,
    0
  );
  const deliveryTotal = Object.values(data.deliveries.byStatus).reduce(
    (a, b) => a + b,
    0
  );

  const outboxRows = toSortedRows(data.outbox.byState).map((row) => ({
    key: row.key,
    label: t(`analytics:communications.outboxStates.${row.key}`, {
      defaultValue: row.key,
    }),
    value: row.value,
  }));
  const deliveryRows = toSortedRows(data.deliveries.byStatus).map((row) => ({
    key: row.key,
    label: t(`analytics:communications.deliveryStatuses.${row.key}`, {
      defaultValue: row.key,
    }),
    value: row.value,
  }));
  const suppressionRows = toSortedRows(data.suppressions.byReason).map(
    (row) => ({
      key: row.key,
      label: t(`analytics:communications.suppressionReasons.${row.key}`, {
        defaultValue: row.key,
      }),
      value: row.value,
    })
  );

  return (
    <div className="space-y-4">
      {/*
        The queue verdict is announced politely rather than shown only as
        a tile: an operator who leaves this page open while the poll runs
        should hear that the queue stalled, not have to re-read it.
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {t(`analytics:communications.queue.${verdict}.announcement`, {
          duration: waiting === null ? '' : formatDuration(waiting, t),
        })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={verdict === 'stalled' ? AlertTriangle : Clock}
          emphasis={verdict === 'stalled' ? 'warning' : 'default'}
          label={t('analytics:communications.headline.queue')}
          value={
            waiting === null
              ? t('analytics:communications.queue.idle.value')
              : formatDuration(waiting, t)
          }
          hint={t(`analytics:communications.queue.${verdict}.hint`)}
        />
        <StatTile
          icon={Mailbox}
          label={t('analytics:communications.headline.sending')}
          value={
            primary
              ? t(`analytics:communications.providers.${primary.provider}`, {
                  defaultValue: primary.provider,
                })
              : t('analytics:communications.providers.none')
          }
          hint={
            sending.length === 0
              ? t('analytics:communications.headline.sendingStubHint')
              : t('analytics:communications.headline.sendingHint', {
                  count: sending.length,
                })
          }
          emphasis={sending.length === 0 ? 'warning' : 'default'}
        />
        <StatTile
          icon={data.outbox.failed > 0 ? AlertTriangle : CheckCircle2}
          emphasis={data.outbox.failed > 0 ? 'warning' : 'default'}
          label={t('analytics:communications.headline.failed')}
          value={num(data.outbox.failed)}
          hint={
            data.outbox.failed > 0
              ? t('analytics:communications.headline.failedHint')
              : t('analytics:communications.headline.failedNoneHint')
          }
        />
        <StatTile
          icon={ShieldBan}
          label={t('analytics:communications.headline.suppressed')}
          value={num(data.suppressions.total)}
          hint={t('analytics:communications.headline.suppressedHint')}
        />
      </div>

      <ReportSection
        title={t('analytics:communications.providerSection.title')}
        description={t('analytics:communications.providerSection.description')}
      >
        {data.providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('analytics:communications.providerSection.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {t('analytics:communications.providerSection.caption')}
              </caption>
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="py-2 text-start font-medium">
                    {t(
                      'analytics:communications.providerSection.columns.provider'
                    )}
                  </th>
                  <th scope="col" className="py-2 text-end font-medium">
                    {t(
                      'analytics:communications.providerSection.columns.daily'
                    )}
                  </th>
                  <th scope="col" className="py-2 text-end font-medium">
                    {t(
                      'analytics:communications.providerSection.columns.monthly'
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.providers.map((provider) => (
                  <tr
                    key={provider.provider}
                    className="border-b border-border/60"
                  >
                    <th scope="row" className="py-2 text-start font-normal">
                      {t(
                        `analytics:communications.providers.${provider.provider}`,
                        {
                          defaultValue: provider.provider,
                        }
                      )}
                      <span className="ms-2 text-xs text-muted-foreground">
                        {provider.position === 0
                          ? t(
                              'analytics:communications.providerSection.primary'
                            )
                          : t(
                              'analytics:communications.providerSection.fallback',
                              {
                                position: provider.position,
                              }
                            )}
                      </span>
                    </th>
                    <td className="py-2 text-end tabular-nums">
                      {provider.dailyLimit === null
                        ? num(provider.dailyUsed)
                        : t('analytics:communications.providerSection.used', {
                            used: num(provider.dailyUsed),
                            limit: num(provider.dailyLimit),
                          })}
                    </td>
                    <td className="py-2 text-end tabular-nums">
                      {provider.monthlyLimit === null
                        ? num(provider.monthlyUsed)
                        : t('analytics:communications.providerSection.used', {
                            used: num(provider.monthlyUsed),
                            limit: num(provider.monthlyLimit),
                          })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection
        title={t('analytics:communications.pipelineSection.title')}
        description={t('analytics:communications.pipelineSection.description', {
          count: data.windowDays,
        })}
      >
        <BreakdownTable
          caption={t('analytics:communications.pipelineSection.outboxCaption')}
          rows={outboxRows}
          total={outboxTotal}
          columns={{
            label: t('analytics:communications.pipelineSection.columns.state'),
            count: t('analytics:communications.pipelineSection.columns.count'),
            share: t('analytics:communications.pipelineSection.columns.share'),
          }}
          formatNumber={num}
          formatShare={share}
          warningKeys={['failed']}
        />
        <BreakdownTable
          caption={t(
            'analytics:communications.pipelineSection.deliveryCaption'
          )}
          rows={deliveryRows}
          total={deliveryTotal}
          columns={{
            label: t('analytics:communications.pipelineSection.columns.status'),
            count: t('analytics:communications.pipelineSection.columns.count'),
            share: t('analytics:communications.pipelineSection.columns.share'),
          }}
          formatNumber={num}
          formatShare={share}
          warningKeys={['bounced', 'complained', 'failed']}
        />
        <p className="text-sm text-muted-foreground">
          {t('analytics:communications.pipelineSection.failureRatio', {
            value: share(data.deliveries.failureRatio),
          })}
        </p>
      </ReportSection>

      <ReportSection
        title={t('analytics:communications.suppressions.title')}
        description={t('analytics:communications.suppressions.description')}
      >
        {data.suppressions.total === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            titleKey="analytics:communications.suppressions.empty.title"
            descriptionKey="analytics:communications.suppressions.empty.description"
          />
        ) : (
          <>
            <BreakdownTable
              caption={t('analytics:communications.suppressions.reasonCaption')}
              rows={suppressionRows}
              total={data.suppressions.total}
              columns={{
                label: t(
                  'analytics:communications.suppressions.columns.reason'
                ),
                count: t('analytics:communications.suppressions.columns.count'),
                share: t('analytics:communications.suppressions.columns.share'),
              }}
              formatNumber={num}
              formatShare={share}
              warningKeys={['hard_bounce', 'complaint']}
            />

            {suppressions.data && suppressions.data.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    {t('analytics:communications.suppressions.listCaption')}
                  </caption>
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th scope="col" className="py-2 text-start font-medium">
                        {t(
                          'analytics:communications.suppressions.columns.address'
                        )}
                      </th>
                      <th scope="col" className="py-2 text-start font-medium">
                        {t(
                          'analytics:communications.suppressions.columns.reason'
                        )}
                      </th>
                      <th scope="col" className="py-2 text-end font-medium">
                        {t(
                          'analytics:communications.suppressions.columns.action'
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppressions.data.items.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <th
                          scope="row"
                          className="py-2 text-start font-mono text-xs font-normal [overflow-wrap:anywhere]"
                        >
                          {row.emailHash.slice(0, 16)}…
                        </th>
                        <td className="py-2">
                          {t(
                            `analytics:communications.suppressionReasons.${row.reason}`,
                            { defaultValue: row.reason }
                          )}
                        </td>
                        <td className="py-2 text-end">
                          <span className="text-xs text-muted-foreground">
                            {t(
                              'analytics:communications.suppressions.hashedOnly'
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/*
              Lifting a block is typed, not picked from a list, because the
              server only ever stored a hash — and because re-enabling mail
              to an address that hard-bounced costs sender reputation, so
              making the operator name it is the confirmation step.
            */}
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                const value = confirming?.trim();
                if (value) unsuppress.mutate(value);
                setConfirming(null);
              }}
            >
              <div className="flex-1">
                <label
                  htmlFor="unsuppress-email"
                  className="mb-1 block text-sm font-medium"
                >
                  {t('analytics:communications.suppressions.liftLabel')}
                </label>
                <input
                  id="unsuppress-email"
                  type="email"
                  autoComplete="off"
                  value={confirming ?? ''}
                  onChange={(event) => setConfirming(event.target.value)}
                  aria-describedby="unsuppress-help"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p
                  id="unsuppress-help"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  {t('analytics:communications.suppressions.liftHelp')}
                </p>
              </div>
              <Button
                type="submit"
                variant="outline"
                className="h-11"
                disabled={!confirming?.trim() || unsuppress.isPending}
              >
                {unsuppress.isPending
                  ? t('analytics:communications.suppressions.lifting')
                  : t('analytics:communications.suppressions.lift')}
              </Button>
            </form>
          </>
        )}
      </ReportSection>

      <GeneratedAt timestamp={data.generatedAt} language={language} />
    </div>
  );
}
