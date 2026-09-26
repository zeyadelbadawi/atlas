/**
 * Observability › Alerts.
 *
 * Every filter lives in the URL and is sent to the server; nothing is
 * filtered in the browser. Rows link to the rule detail page — the same
 * page Slack's "View Alert" button opens.
 *
 * Two different "nothing to show" states, deliberately distinct:
 *   - the sources answered and there were no alerts → "No alerts in this
 *     period" (a good outcome);
 *   - the sources did not answer → "Alert history unavailable" (we do not
 *     know), which must never be mistaken for the first.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { BellOff, History, X } from 'lucide-react';
import { EmptyState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useDebounce } from '@hooks';
import { cn, formatDate, formatNumber } from '@utils';
import type { AlertItem, AlertsResponse, LanguageCode } from '@types';
import {
  AlertDuration,
  FilterSelect,
  FreshnessIndicator,
  ObservabilityShell,
  ObservabilityStatusBadge,
  PageSkeleton,
  QueryError,
  RangeSelect,
  SourceNotice,
} from '../components';
import {
  REFRESH_INTERVAL_MS,
  useAlerts,
} from '../hooks/usePlatformObservability';
import { useAlertFilters } from '../hooks/useAlertFilters';
import type { MetricRange } from '@types';

function ruleLink(rule: string): string {
  return buildPath(DASHBOARD_ROUTES.platformObservabilityAlertRule, {
    ruleName: rule,
  });
}

function RuleFilterInput({
  value,
  onCommit,
}: {
  readonly value: string;
  readonly onCommit: (next: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const id = useId();
  const [draft, setDraft] = useState(value);
  const debounced = useDebounce(draft, 400);

  // The URL is the source of truth: a Health-page link or a "clear" resets
  // the box to whatever the URL now says.
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (debounced.trim() !== value) onCommit(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {t('platformObservability:alerts.filters.rule')}
      </label>
      <Input
        id={id}
        type="search"
        dir="ltr"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onCommit(draft.trim());
        }}
        placeholder={t('platformObservability:alerts.filters.rulePlaceholder')}
        className="w-full font-mono sm:w-56"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

function TenantCount({ alert }: { readonly alert: AlertItem }): JSX.Element {
  const { t, i18n } = useTranslation();
  const count = alert.affectedTenants.length;
  return (
    <span className="tabular-nums">
      {count === 0
        ? t('platformObservability:alerts.noTenants')
        : t('platformObservability:alerts.tenantCount', {
            count,
            formatted: formatNumber(count, i18n.language as LanguageCode),
          })}
    </span>
  );
}

function AlertsTable({
  items,
  language,
}: {
  readonly items: readonly AlertItem[];
  readonly language: LanguageCode;
}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const none = t('platformObservability:values.none');
  const col = (key: string) => t(`platformObservability:alerts.columns.${key}`);

  return (
    <>
      {/* Tablet and desktop: a real table. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            {t('platformObservability:alerts.tableCaption')}
          </caption>
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              {[
                'rule',
                'severity',
                'status',
                'service',
                'started',
                'duration',
                'tenants',
              ].map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="px-4 py-3 text-start font-medium"
                >
                  {col(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((alert) => (
              <tr
                key={alert.id}
                className="cursor-pointer transition-colors hover:bg-accent/40"
                onClick={(event) => {
                  // Let the link itself (and modified clicks) behave natively.
                  if ((event.target as HTMLElement).closest('a')) return;
                  navigate(ruleLink(alert.rule));
                }}
              >
                <th scope="row" className="px-4 py-3 text-start font-medium">
                  <Link
                    to={ruleLink(alert.rule)}
                    className="font-mono text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    dir="ltr"
                  >
                    {alert.rule}
                  </Link>
                  {alert.summary ? (
                    <p className="mt-0.5 line-clamp-1 text-xs font-normal text-muted-foreground">
                      {alert.summary}
                    </p>
                  ) : null}
                </th>
                <td className="px-4 py-3">
                  <ObservabilityStatusBadge
                    kind="severity"
                    value={alert.severity}
                  />
                </td>
                <td className="px-4 py-3">
                  <ObservabilityStatusBadge
                    kind="alertStatus"
                    value={alert.status}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {alert.service ?? none}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                  <time dateTime={alert.startsAt}>
                    {formatDate(alert.startsAt, language, 'dateTime')}
                  </time>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  <AlertDuration alert={alert} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <TenantCount alert={alert} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per alert. */}
      <ul className="space-y-3 md:hidden">
        {items.map((alert) => (
          <li key={alert.id}>
            <Link
              to={ruleLink(alert.rule)}
              className="block space-y-2 rounded-lg border border-border bg-card p-4 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="font-mono text-sm font-medium text-primary"
                  dir="ltr"
                >
                  {alert.rule}
                </span>
                <ObservabilityStatusBadge
                  kind="severity"
                  value={alert.severity}
                />
                <ObservabilityStatusBadge
                  kind="alertStatus"
                  value={alert.status}
                />
              </div>
              {alert.summary ? (
                <p className="text-sm text-muted-foreground">{alert.summary}</p>
              ) : null}
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">{col('service')}</dt>
                  <dd className="text-foreground">{alert.service ?? none}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{col('started')}</dt>
                  <dd className="tabular-nums text-foreground">
                    {formatDate(alert.startsAt, language, 'dateTime')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{col('duration')}</dt>
                  <dd className="text-foreground">
                    <AlertDuration alert={alert} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{col('tenants')}</dt>
                  <dd className="text-foreground">
                    <TenantCount alert={alert} />
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function AlertsBody({
  data,
  language,
  isRefreshing,
}: {
  readonly data: AlertsResponse;
  readonly language: LanguageCode;
  readonly isRefreshing: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const { alertmanager, prometheus } = data.sources;
  const noSource = alertmanager !== 'ok' && prometheus !== 'ok';

  return (
    <div
      className={cn(
        'space-y-4',
        isRefreshing && 'opacity-60 transition-opacity'
      )}
    >
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <History className="size-3.5" aria-hidden />
        {t('platformObservability:alerts.historyFrom', {
          time: formatDate(data.historyFrom, language, 'dateTime'),
        })}
      </p>
      <SourceNotice
        source="alertmanager"
        state={alertmanager}
        impactKey="platformObservability:alerts.impact.alertmanager"
      />
      <SourceNotice
        source="prometheus"
        state={prometheus}
        impactKey="platformObservability:alerts.impact.prometheus"
      />
      {data.items.length > 0 ? (
        <>
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {t('platformObservability:alerts.count', {
              count: data.items.length,
            })}
          </p>
          <AlertsTable items={data.items} language={language} />
        </>
      ) : noSource ? (
        <div data-testid="alerts-unavailable">
          <EmptyState
            icon={History}
            titleKey="platformObservability:alerts.unavailable.title"
            descriptionKey="platformObservability:alerts.unavailable.description"
          />
        </div>
      ) : (
        <div data-testid="alerts-empty" role="status">
          <EmptyState
            icon={BellOff}
            titleKey="platformObservability:alerts.empty.title"
            descriptionKey="platformObservability:alerts.empty.description"
          />
        </div>
      )}
    </div>
  );
}

export default function ObservabilityAlertsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { filters, setFilter, clear } = useAlertFilters();
  const query = useAlerts(filters);
  const { data, error, refetch } = query;
  const hasFilters =
    filters.status !== 'all' ||
    Boolean(filters.severity) ||
    Boolean(filters.rule);

  return (
    <ObservabilityShell
      titleKey="platformObservability:alerts.title"
      descriptionKey="platformObservability:alerts.subtitle"
      actions={
        data ? (
          <FreshnessIndicator
            generatedAt={data.generatedAt}
            dataUpdatedAt={query.dataUpdatedAt}
            intervalMs={REFRESH_INTERVAL_MS.alerts}
            isFetching={query.isFetching}
            refetchFailed={query.isError}
            onRefresh={() => void refetch()}
          />
        ) : null
      }
    >
      <form
        role="search"
        aria-label={t('platformObservability:alerts.filters.label')}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(event) => event.preventDefault()}
      >
        <RangeSelect
          value={filters.range}
          onChange={(next: MetricRange) => setFilter('range', next)}
        />
        <FilterSelect
          label={t('platformObservability:alerts.filters.status')}
          value={filters.status}
          onChange={(next) =>
            setFilter('status', next === 'all' ? undefined : next)
          }
          options={(['all', 'active', 'resolved'] as const).map((value) => ({
            value,
            label: t(
              `platformObservability:alerts.filters.statusOptions.${value}`
            ),
          }))}
        />
        <FilterSelect
          label={t('platformObservability:alerts.filters.severity')}
          value={filters.severity ?? 'any'}
          onChange={(next) =>
            setFilter('severity', next === 'any' ? undefined : next)
          }
          options={[
            {
              value: 'any',
              label: t('platformObservability:alerts.filters.anySeverity'),
            },
            ...(['critical', 'warning', 'info'] as const).map((value) => ({
              value,
              label: t(`platformObservability:badges.severity.${value}`),
            })),
          ]}
        />
        <RuleFilterInput
          value={filters.rule ?? ''}
          onCommit={(next) => setFilter('rule', next)}
        />
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            onClick={clear}
            className="gap-1.5"
          >
            <X className="size-4" aria-hidden />
            {t('platformObservability:alerts.filters.clear')}
          </Button>
        ) : null}
      </form>

      {query.isLoading ? (
        <PageSkeleton tiles={0} cards={3} />
      ) : !data ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <AlertsBody
          data={data}
          language={language}
          isRefreshing={query.isFetching && query.isPlaceholderData}
        />
      )}
    </ObservabilityShell>
  );
}
