/**
 * Observability › System health.
 *
 * An overall banner, the active alert counts (each a link into the Alerts
 * Center, pre-filtered), and one card per component with its live probe
 * result and details.
 *
 * Honesty rules this page holds to:
 *   - Alert counts are shown ONLY when Alertmanager answered. Otherwise the
 *     tiles are replaced by a notice — never three zeros.
 *   - `unknown` / `not_configured` components get a neutral dashed badge and
 *     a sentence saying why; they are never rendered as healthy.
 *   - A missing latency or detail value reads "Not reported", not 0.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { EmptyState } from '@components/feedback';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { cn, formatDate, formatNumber, formatRelativeTime } from '@utils';
import type {
  ComponentHealth,
  LanguageCode,
  SystemHealthResponse,
} from '@types';
import {
  FreshnessIndicator,
  ObservabilityShell,
  ObservabilityStatusBadge,
  PageSkeleton,
  QueryError,
  SourceNotice,
} from '../components';
import { badgeSpec, toneClass } from '../utils/status-tones';
import {
  REFRESH_INTERVAL_MS,
  useSystemHealth,
} from '../hooks/usePlatformObservability';
import {
  formatDetailValue,
  formatUnitValue,
  translateKey,
} from '../utils/observability-format';

const SEVERITIES = ['critical', 'warning', 'info'] as const;

function OverallBanner({
  data,
  language,
}: {
  readonly data: SystemHealthResponse;
  readonly language: LanguageCode;
}): JSX.Element {
  const { t } = useTranslation();
  const spec = badgeSpec({ kind: 'overall', value: data.overall });
  const Icon = spec.icon;
  return (
    <section
      aria-labelledby="obs-overall-title"
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        toneClass(spec.tone)
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-6 shrink-0" strokeWidth={2} aria-hidden />
        <div className="space-y-1">
          <h2
            id="obs-overall-title"
            className="font-display text-lg font-semibold text-foreground"
          >
            {t(`platformObservability:health.overall.${data.overall}`)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              `platformObservability:health.overallDescription.${data.overall}`
            )}
          </p>
        </div>
      </div>
      {/* Announces a change of overall state without making the heading a live region. */}
      <p role="status" aria-live="polite" className="sr-only">
        {t(`platformObservability:health.overall.${data.overall}`)}
      </p>
      <p className="text-sm text-muted-foreground">
        {t('platformObservability:health.lastChecked', {
          time: formatDate(data.generatedAt, language, 'dateTime'),
        })}
      </p>
    </section>
  );
}

function AlertCounts({
  alerts,
  language,
}: {
  readonly alerts: SystemHealthResponse['alerts'];
  readonly language: LanguageCode;
}): JSX.Element {
  const { t } = useTranslation();
  if (alerts.source !== 'ok') {
    return (
      <SourceNotice
        source="alertmanager"
        state={alerts.source}
        impactKey="platformObservability:health.alertCountsImpact"
      />
    );
  }
  return (
    <section aria-labelledby="obs-alert-counts" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="obs-alert-counts"
          className="font-display text-base font-semibold text-foreground"
        >
          {t('platformObservability:health.activeAlerts.title')}
        </h2>
        <Link
          to={`${DASHBOARD_ROUTES.platformObservabilityAlerts}?status=active`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('platformObservability:health.activeAlerts.viewAll', {
            count: alerts.active,
          })}
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {SEVERITIES.map((severity) => {
          const count = alerts[severity];
          const spec = badgeSpec({ kind: 'severity', value: severity });
          const Icon = spec.icon;
          return (
            <li key={severity}>
              <Link
                to={`${DASHBOARD_ROUTES.platformObservabilityAlerts}?status=active&severity=${severity}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t(
                  'platformObservability:health.activeAlerts.tileLabel',
                  {
                    count,
                    severity: t(spec.labelKey),
                  }
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md',
                      count > 0
                        ? toneClass(spec.tone)
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="size-4" strokeWidth={2} aria-hidden />
                  </span>
                  {t(spec.labelKey)}
                </span>
                <span className="font-display text-2xl font-semibold text-foreground">
                  {formatNumber(count, language)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ComponentCard({
  component,
  language,
}: {
  readonly component: ComponentHealth;
  readonly language: LanguageCode;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const notReported = t('platformObservability:values.notReported');
  const name = translateKey(t, i18n, 'components', component.key);
  const unverified =
    component.status === 'unknown' || component.status === 'not_configured';
  const latency = formatUnitValue(component.latencyMs, 'ms', language, t);
  const headingId = `obs-component-${component.key}`;

  return (
    <li>
      <article
        aria-labelledby={headingId}
        className={cn(
          'flex h-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs',
          unverified ? 'border-dashed border-border-strong' : 'border-border'
        )}
        data-component={component.key}
        data-status={component.status}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <h3
              id={headingId}
              className="font-display text-sm font-semibold text-foreground"
            >
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('platformObservability:health.checkedAt', {
                time: formatRelativeTime(component.checkedAt, language),
              })}
            </p>
          </div>
          <ObservabilityStatusBadge kind="component" value={component.status} />
        </header>

        {unverified ? (
          <p className="text-sm text-muted-foreground">
            {t(`platformObservability:health.unverified.${component.status}`)}
          </p>
        ) : null}

        {component.reason ? (
          <p className="text-sm font-medium text-foreground">
            {translateKey(t, i18n, 'reasons', component.reason)}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {component.latencyMs !== null || !unverified ? (
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">
                {t('platformObservability:health.probeLatency')}
              </dt>
              <dd
                className="font-medium tabular-nums text-foreground"
                data-atlas-numeric="true"
              >
                {latency ?? notReported}
              </dd>
            </div>
          ) : null}
          {component.details.map((detail) => (
            <div key={detail.key} className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">
                {translateKey(t, i18n, 'details', detail.key)}
              </dt>
              <dd
                className="font-medium tabular-nums text-foreground"
                data-atlas-numeric="true"
              >
                {formatDetailValue(detail.value, detail.unit, language, t) ??
                  notReported}
              </dd>
            </div>
          ))}
        </dl>
      </article>
    </li>
  );
}

export default function ObservabilityHealthPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const query = useSystemHealth();
  const { data, error, refetch } = query;

  return (
    <ObservabilityShell
      titleKey="platformObservability:health.title"
      descriptionKey="platformObservability:health.subtitle"
      actions={
        data ? (
          <FreshnessIndicator
            generatedAt={data.generatedAt}
            dataUpdatedAt={query.dataUpdatedAt}
            intervalMs={REFRESH_INTERVAL_MS.health}
            isFetching={query.isFetching}
            refetchFailed={query.isError}
            onRefresh={() => void refetch()}
          />
        ) : null
      }
    >
      {query.isLoading ? (
        <PageSkeleton />
      ) : !data ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <OverallBanner data={data} language={language} />
          <AlertCounts alerts={data.alerts} language={language} />
          <section aria-labelledby="obs-components" className="space-y-3">
            <h2
              id="obs-components"
              className="font-display text-base font-semibold text-foreground"
            >
              {t('platformObservability:health.componentsTitle')}
            </h2>
            {data.components.length === 0 ? (
              <EmptyState
                icon={Activity}
                titleKey="platformObservability:health.noComponents.title"
                descriptionKey="platformObservability:health.noComponents.description"
              />
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.components.map((component) => (
                  <ComponentCard
                    key={component.key}
                    component={component}
                    language={language}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </ObservabilityShell>
  );
}
