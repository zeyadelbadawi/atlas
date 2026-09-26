/**
 * Observability › Metrics.
 *
 * The catalog says which metrics exist and whether each is available; each
 * available metric's series is fetched lazily by its own card, only once
 * the card nears the viewport. An unavailable metric is shown as exactly
 * that — "not instrumented or not scraped yet" — never as an empty chart
 * that could be read as a flat zero.
 */
import { useTranslation } from 'react-i18next';
import { ChartLine, CircleSlash } from 'lucide-react';
import { EmptyState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@utils';
import { Button } from '@/components/ui/button';
import type {
  LanguageCode,
  MetricDefinition,
  MetricDomain,
  MetricRange,
} from '@types';
import {
  FreshnessIndicator,
  ObservabilityShell,
  PageSkeleton,
  QueryError,
  RangeSelect,
  SeriesChart,
  SourceNotice,
} from '../components';
import {
  REFRESH_INTERVAL_MS,
  useMetricCatalog,
  useMetricSeries,
} from '../hooks/usePlatformObservability';
import { useObservabilityRange } from '../hooks/useObservabilityRange';
import { useInView } from '../hooks/useInView';
import { formatUnitValue, translateKey } from '../utils/observability-format';

/** Display order of the domains — the contract's own order. */
const DOMAIN_ORDER: readonly MetricDomain[] = [
  'api',
  'database',
  'redis',
  'jobs',
  'video',
  'email',
  'learning',
  'commerce',
  'catalog',
  'retention',
  'process',
  'alerting',
];

function metricName(
  t: ReturnType<typeof useTranslation>['t'],
  i18n: { exists: (key: string) => boolean },
  id: string
): string {
  return translateKey(t, i18n, 'metrics.names', id);
}

function UnavailableMetricCard({
  metric,
}: {
  readonly metric: MetricDefinition;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  return (
    <article
      className="flex h-full flex-col gap-2 rounded-lg border border-dashed border-border-strong bg-muted/30 p-4"
      data-metric={metric.id}
      data-available="false"
    >
      <h3 className="font-display text-sm font-semibold text-muted-foreground">
        {metricName(t, i18n, metric.id)}
      </h3>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <CircleSlash className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">
            {t('platformObservability:metrics.unavailable.title')}
          </span>
          {' — '}
          {t('platformObservability:metrics.unavailable.body')}
        </span>
      </p>
    </article>
  );
}

function MetricCard({
  metric,
  range,
  language,
}: {
  readonly metric: MetricDefinition;
  readonly range: MetricRange;
  readonly language: LanguageCode;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const [ref, inView] = useInView<HTMLElement>();
  const query = useMetricSeries(metric.id, range, inView);
  const { data, error } = query;
  const name = metricName(t, i18n, metric.id);
  const headingId = `obs-metric-${metric.id.replace(/\W/g, '-')}`;

  const latest =
    data && data.series.length === 1
      ? ([...data.series[0].points].reverse().find((p) => p.v !== null)?.v ??
        null)
      : null;
  const latestText =
    latest !== null ? formatUnitValue(latest, metric.unit, language, t) : null;

  return (
    <article
      ref={ref}
      aria-labelledby={headingId}
      className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs"
      data-metric={metric.id}
      data-available="true"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3
            id={headingId}
            className="font-display text-sm font-semibold text-foreground"
          >
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t(`platformObservability:metrics.units.${metric.unit}`)}
          </p>
        </div>
        {latestText ? (
          <p className="text-end">
            <span className="block text-xs text-muted-foreground">
              {t('platformObservability:metrics.latest')}
            </span>
            <span
              className="text-lg font-semibold text-foreground"
              data-atlas-numeric="true"
            >
              {latestText}
            </span>
          </p>
        ) : null}
      </header>

      {!inView || query.isLoading ? (
        <Skeleton className="h-56 w-full" aria-hidden />
      ) : !data ? (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-border p-4 text-sm"
        >
          <p className="text-muted-foreground">
            {apiErrorMessage(t, i18n, error)}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            {t('common:actions.retry')}
          </Button>
        </div>
      ) : data.source !== 'ok' ? (
        <SourceNotice source="prometheus" state={data.source} />
      ) : (
        <SeriesChart
          series={data.series}
          unit={metric.unit}
          range={range}
          title={name}
          isRefreshing={query.isFetching && query.isPlaceholderData}
        />
      )}
    </article>
  );
}

export default function ObservabilityMetricsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { range, setRange } = useObservabilityRange();
  const query = useMetricCatalog();
  const { data, error, refetch } = query;

  const domains = data
    ? DOMAIN_ORDER.map((domain) => ({
        domain,
        metrics: data.metrics.filter((metric) => metric.domain === domain),
      })).filter((group) => group.metrics.length > 0)
    : [];
  // A domain the UI does not know yet still renders, after the known ones.
  const unknownDomains = data
    ? [...new Set(data.metrics.map((m) => m.domain))].filter(
        (domain) => !DOMAIN_ORDER.includes(domain)
      )
    : [];
  const groups = [
    ...domains,
    ...unknownDomains.map((domain) => ({
      domain,
      metrics: data!.metrics.filter((metric) => metric.domain === domain),
    })),
  ];

  return (
    <ObservabilityShell
      titleKey="platformObservability:metrics.title"
      descriptionKey="platformObservability:metrics.subtitle"
      actions={
        data ? (
          <FreshnessIndicator
            generatedAt={data.generatedAt}
            dataUpdatedAt={query.dataUpdatedAt}
            intervalMs={REFRESH_INTERVAL_MS.metrics}
            isFetching={query.isFetching}
            refetchFailed={query.isError}
            onRefresh={() => void refetch()}
          />
        ) : null
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {query.isLoading ? (
        <PageSkeleton tiles={0} cards={6} />
      ) : !data ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <SourceNotice
            source="prometheus"
            state={data.source}
            impactKey="platformObservability:metrics.impact"
          />
          {groups.length === 0 ? (
            <EmptyState
              icon={ChartLine}
              titleKey="platformObservability:metrics.empty.title"
              descriptionKey="platformObservability:metrics.empty.description"
            />
          ) : (
            groups.map(({ domain, metrics }) => (
              <section
                key={domain}
                aria-labelledby={`obs-domain-${domain}`}
                className="space-y-3"
              >
                <h2
                  id={`obs-domain-${domain}`}
                  className="font-display text-base font-semibold text-foreground"
                >
                  {translateKey(t, i18n, 'metrics.domains', domain)}
                </h2>
                <ul className="grid gap-4 lg:grid-cols-2">
                  {metrics.map((metric) => (
                    <li key={metric.id}>
                      {metric.available ? (
                        <MetricCard
                          metric={metric}
                          range={range}
                          language={language}
                        />
                      ) : (
                        <UnavailableMetricCard metric={metric} />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </ObservabilityShell>
  );
}
