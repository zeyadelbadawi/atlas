/**
 * Observability › Alerts › one rule.
 *
 * THIS PATH IS A PUBLIC CONTRACT: Alertmanager's Slack "View Alert" button
 * links to `/dashboard/platform/observability/alerts/:ruleName`.
 *
 * Everything shown comes from the rule-detail response. In particular the
 * timeline lists exactly the events returned — nothing is inferred from
 * `startsAt`/`endsAt` — and affected tenants are only those the alert's
 * own labels named.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileCode2, SearchX } from 'lucide-react';
import { EmptyState } from '@components/feedback';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { MIRROR_IN_RTL, cn, formatDate, formatNumber } from '@utils';
import type {
  AffectedTenant,
  AlertRuleDetailResponse,
  LanguageCode,
  TimelineEvent,
} from '@types';
import {
  AlertDuration,
  CopyableCode,
  FreshnessIndicator,
  ObservabilityShell,
  ObservabilityStatusBadge,
  PageSkeleton,
  QueryError,
  RangeSelect,
  SeriesChart,
  SourceNotice,
} from '../components';
import {
  REFRESH_INTERVAL_MS,
  useAlertRule,
} from '../hooks/usePlatformObservability';
import { useObservabilityRange } from '../hooks/useObservabilityRange';
import { describeLabels, formatDuration } from '../utils/observability-format';

function Section({
  id,
  title,
  children,
  actions,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}): JSX.Element {
  return (
    <section
      aria-labelledby={id}
      className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          id={id}
          className="font-display text-base font-semibold text-foreground"
        >
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function LabelChips({
  labels,
}: {
  readonly labels: Readonly<Record<string, string>>;
}): JSX.Element | null {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" dir="ltr">
      {entries.map(([key, value]) => (
        <li
          key={key}
          className="rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
        >
          {key}={value}
        </li>
      ))}
    </ul>
  );
}

/** Tenants across all instances, de-duplicated, exactly as the API named them. */
function uniqueTenants(
  data: AlertRuleDetailResponse
): readonly AffectedTenant[] {
  const seen = new Map<string, AffectedTenant>();
  for (const instance of data.instances) {
    for (const tenant of instance.affectedTenants) {
      const key = `${tenant.organizationId ?? ''}|${tenant.academyId ?? ''}|${tenant.name ?? ''}`;
      if (!seen.has(key)) seen.set(key, tenant);
    }
  }
  return [...seen.values()];
}

function Timeline({
  events,
  language,
}: {
  readonly events: readonly TimelineEvent[];
  readonly language: LanguageCode;
}): JSX.Element {
  const { t } = useTranslation();
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="timeline-empty">
        {t('platformObservability:rule.timeline.empty')}
      </p>
    );
  }
  const ordered = [...events].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at)
  );
  return (
    <ol
      className="space-y-3 border-s border-border ps-4"
      data-testid="timeline"
    >
      {ordered.map((event, index) => (
        <li
          key={`${event.alertId}-${event.at}-${index}`}
          className="relative space-y-1"
        >
          <span
            aria-hidden
            className={cn(
              'absolute -start-[1.3rem] top-1.5 size-2.5 rounded-full border-2 border-card',
              event.kind === 'triggered'
                ? 'bg-destructive'
                : event.kind === 'pending'
                  ? 'bg-warning'
                  : 'bg-muted-foreground'
            )}
          />
          <p className="text-sm font-medium text-foreground">
            {t(`platformObservability:rule.timeline.kinds.${event.kind}`)}
          </p>
          <p className="text-xs text-muted-foreground">
            <time dateTime={event.at}>
              {formatDate(event.at, language, 'dateTime')}
            </time>
            {' · '}
            <span className="font-mono" dir="ltr">
              {event.alertId}
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function RuleDetail({
  data,
  language,
  isRefreshing,
}: {
  readonly data: AlertRuleDetailResponse;
  readonly language: LanguageCode;
  readonly isRefreshing: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const { range, setRange } = useObservabilityRange();
  const { rule } = data;
  const none = t('platformObservability:values.none');
  const notReported = t('platformObservability:values.notReported');
  const when = (value: string | null) =>
    value ? formatDate(value, language, 'dateTime') : none;
  const tenants = uniqueTenants(data);

  return (
    <div className="space-y-4">
      <SourceNotice
        source="prometheus"
        state={data.sources.prometheus}
        impactKey="platformObservability:rule.impact.prometheus"
      />
      <SourceNotice
        source="alertmanager"
        state={data.sources.alertmanager}
        impactKey="platformObservability:rule.impact.alertmanager"
      />

      <Section
        id="obs-rule-overview"
        title={t('platformObservability:rule.sections.overview')}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ObservabilityStatusBadge kind="severity" value={rule.severity} />
          <ObservabilityStatusBadge kind="ruleState" value={rule.state} />
          <ObservabilityStatusBadge kind="ruleHealth" value={rule.health} />
          <span className="inline-flex items-center gap-1 rounded-pill border border-border px-2 py-0.5 text-xs text-muted-foreground">
            <FileCode2 className="size-3.5" aria-hidden />
            {t('platformObservability:rule.managedInCode')}
          </span>
        </div>
        {rule.summary ? (
          <p className="text-sm font-medium text-foreground">{rule.summary}</p>
        ) : null}
        {rule.description ? (
          <p className="text-sm text-muted-foreground">{rule.description}</p>
        ) : null}
        {rule.health === 'err' && rule.lastError ? (
          <p
            role="alert"
            className="rounded-md bg-destructive-surface px-3 py-2 text-sm text-destructive"
          >
            {t('platformObservability:rule.lastError', {
              error: rule.lastError,
            })}
          </p>
        ) : null}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('platformObservability:rule.fields.threshold')}>
            {rule.threshold ?? t('platformObservability:rule.noThreshold')}
          </Field>
          <Field label={t('platformObservability:rule.fields.forDuration')}>
            {rule.forSeconds > 0
              ? formatDuration(rule.forSeconds, t)
              : t('platformObservability:rule.immediately')}
          </Field>
          <Field label={t('platformObservability:rule.fields.group')}>
            <span className="font-mono" dir="ltr">
              {rule.group}
            </span>
          </Field>
          <Field label={t('platformObservability:rule.fields.service')}>
            {rule.service ?? none}
          </Field>
          <Field label={t('platformObservability:rule.fields.lastEvaluation')}>
            {when(rule.lastEvaluation)}
          </Field>
          <Field label={t('platformObservability:rule.fields.lastTriggered')}>
            {when(rule.lastTriggeredAt)}
          </Field>
          <Field label={t('platformObservability:rule.fields.lastResolved')}>
            {when(rule.lastResolvedAt)}
          </Field>
        </dl>
        <div className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t('platformObservability:rule.fields.expression')}
          </h3>
          <CopyableCode
            code={rule.expression}
            label={t('platformObservability:rule.fields.expression')}
          />
        </div>
      </Section>

      <Section
        id="obs-rule-current"
        title={t('platformObservability:rule.sections.currentValues')}
      >
        {data.sources.prometheus !== 'ok' ? (
          <p className="text-sm text-muted-foreground">
            {t('platformObservability:rule.prometheusRequired')}
          </p>
        ) : data.currentValues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('platformObservability:rule.noCurrentValues')}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.currentValues.map((entry, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span
                  className="min-w-0 break-all font-mono text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {describeLabels(entry.labels) ||
                    t('platformObservability:rule.noLabels')}
                </span>
                <span
                  className="font-semibold tabular-nums text-foreground"
                  data-atlas-numeric="true"
                >
                  {entry.value === null || !Number.isFinite(entry.value)
                    ? notReported
                    : formatNumber(entry.value, language, {
                        maximumFractionDigits: 4,
                      })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="obs-rule-chart"
        title={t('platformObservability:rule.sections.chart')}
        actions={<RangeSelect value={range} onChange={setRange} />}
      >
        {data.sources.prometheus !== 'ok' ? (
          <p className="text-sm text-muted-foreground">
            {t('platformObservability:rule.prometheusRequired')}
          </p>
        ) : (
          <SeriesChart
            series={data.expressionSeries}
            unit="text"
            range={range}
            title={t('platformObservability:rule.chartTitle', {
              rule: rule.name,
            })}
            isRefreshing={isRefreshing}
          />
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          id="obs-rule-instances"
          title={t('platformObservability:rule.sections.instances')}
        >
          {data.instances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('platformObservability:rule.noInstances')}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.instances.map((instance) => (
                <li
                  key={instance.id}
                  className="space-y-2 rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ObservabilityStatusBadge
                      kind="alertStatus"
                      value={instance.status}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('platformObservability:rule.startedAt', {
                        time: formatDate(
                          instance.startsAt,
                          language,
                          'dateTime'
                        ),
                      })}
                      {' · '}
                      <AlertDuration alert={instance} />
                    </span>
                  </div>
                  {instance.summary ? (
                    <p className="text-sm text-foreground">
                      {instance.summary}
                    </p>
                  ) : null}
                  <LabelChips labels={instance.labels} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="obs-rule-tenants"
          title={t('platformObservability:rule.sections.tenants')}
        >
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('platformObservability:rule.noTenants')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tenants.map((tenant, index) => (
                <li key={index} className="space-y-0.5 py-2">
                  <p className="text-sm font-medium text-foreground">
                    {tenant.name ??
                      t('platformObservability:rule.unnamedTenant')}
                  </p>
                  <p
                    className="font-mono text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {[tenant.organizationId, tenant.academyId]
                      .filter(Boolean)
                      .join(' / ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section
        id="obs-rule-timeline"
        title={t('platformObservability:rule.sections.timeline')}
      >
        <Timeline events={data.timeline} language={language} />
      </Section>
    </div>
  );
}

export default function ObservabilityAlertRulePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { ruleName } = useParams<{ ruleName: string }>();
  const { range } = useObservabilityRange();
  const query = useAlertRule(ruleName, range);
  const { data, error, refetch } = query;

  const breadcrumbs = [
    {
      labelKey: 'navigation:items.platformObservability',
      path: DASHBOARD_ROUTES.platformObservabilityHealth,
    },
    {
      labelKey: 'navigation:items.platformObservabilityAlerts',
      path: DASHBOARD_ROUTES.platformObservabilityAlerts,
    },
    { labelKey: 'platformObservability:rule.breadcrumb', label: ruleName },
  ];

  return (
    <ObservabilityShell
      titleKey="platformObservability:rule.title"
      title={ruleName}
      descriptionKey="platformObservability:rule.subtitle"
      breadcrumbs={breadcrumbs}
      actions={
        data ? (
          <FreshnessIndicator
            generatedAt={data.generatedAt}
            dataUpdatedAt={query.dataUpdatedAt}
            intervalMs={REFRESH_INTERVAL_MS.alertRule}
            isFetching={query.isFetching}
            refetchFailed={query.isError}
            onRefresh={() => void refetch()}
          />
        ) : null
      }
    >
      {query.isLoading ? (
        <PageSkeleton tiles={0} cards={2} />
      ) : !data && error?.kind === 'notFound' ? (
        <div className="space-y-3">
          <EmptyState
            icon={SearchX}
            titleKey="platformObservability:rule.notFound.title"
            descriptionKey="platformObservability:rule.notFound.description"
            values={{ rule: ruleName ?? '' }}
          />
          <p className="text-center">
            <Link
              to={DASHBOARD_ROUTES.platformObservabilityAlerts}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
              {t('platformObservability:rule.backToAlerts')}
            </Link>
          </p>
        </div>
      ) : !data ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <RuleDetail
          data={data}
          language={language}
          isRefreshing={query.isFetching && query.isPlaceholderData}
        />
      )}
    </ObservabilityShell>
  );
}
