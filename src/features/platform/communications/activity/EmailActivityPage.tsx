/**
 * Academy Email Activity — Platform Owner (sidebar: Email & Notifications,
 * `/dashboard/platform/email/activity`).
 *
 * Answers "what did Atlas email on behalf of this academy, and what became
 * of it?" with HONEST statuses: "Sent to provider" and "Delivered" are
 * different facts (the second needs a provider webhook), and "Not sent"
 * (preference, daily limit) is not a failure. A banner says so when no
 * delivery confirmation arrived in the window, so an empty "Delivered"
 * count is never mistaken for a delivery problem.
 *
 * Nothing here can show an email body, a code, a link, a full address or a
 * raw provider error: the API returns masked recipients and closed error
 * categories only. Filters live in the URL so a view can be shared.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Mail,
  MailX,
  SearchX,
  Send,
  X,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { StatTile } from '@components/reporting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter, useLanguage } from '@hooks';
import { formatNumber } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  useEmailActivityFeed,
  useEmailActivitySummary,
} from '../hooks/usePlatformEmailMonitoring';
import {
  EMAIL_ACTIVITY_STATUSES,
  type EmailActivityFilters,
  type EmailActivityItem,
  type EmailActivityStatus,
  type EmailActivitySummary,
} from '../services/platform-email-monitoring.types';
import {
  ACTIVITY_RANGE_DAYS,
  activityStatusTone,
  parseAllowed,
  parseAllowedNumber,
  parseUuid,
  windowStart,
} from '../shared/email-monitoring.utils';
import { MonitoringSelect } from '../shared/MonitoringSelect';
import { LoadMoreFooter } from '../shared/LoadMoreFooter';

const K = 'platformEmail:activity';
const ALL = 'all';
const KEY_PATTERN = /^[a-z0-9_.]{1,80}$/;

const BREADCRUMBS: readonly BreadcrumbItem[] = [
  {
    labelKey: 'navigation:items.platformDashboard',
    path: DASHBOARD_ROUTES.platform,
  },
  { labelKey: 'navigation:items.platformEmailActivity' },
];

function problems(byStatus: EmailActivitySummary['byStatus']): number {
  return (
    (byStatus.failed ?? 0) +
    (byStatus.bounced ?? 0) +
    (byStatus.complained ?? 0)
  );
}

export default function EmailActivityPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const [params, setParams] = useSearchParams();
  const num = (value: number) => formatNumber(value, language);

  const days = parseAllowedNumber(params.get('days'), ACTIVITY_RANGE_DAYS, 30);
  const academyId = parseUuid(params.get('academy'));
  const status = parseAllowed(params.get('status'), EMAIL_ACTIVITY_STATUSES);
  const rawKey = params.get('type');
  const key = rawKey && KEY_PATTERN.test(rawKey) ? rawKey : undefined;
  const from = useMemo(() => windowStart(days), [days]);

  const filters: EmailActivityFilters = { academyId, status, key, from };
  const feed = useEmailActivityFeed(filters);
  const summary = useEmailActivitySummary(filters);
  // Academy options always come from the unfiltered (all-academies) view.
  const overview = useEmailActivitySummary({ key, from });

  const setFilter = (name: string, value: string | undefined) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === undefined || value === ALL) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true }
    );
  };
  const hasFilters = Boolean(academyId || status || key);
  const clearFilters = () =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        ['academy', 'status', 'type'].forEach((name) => next.delete(name));
        return next;
      },
      { replace: true }
    );

  const items: readonly EmailActivityItem[] = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data]
  );

  const academyName = (id: string, name: string | null) =>
    name ?? t(`${K}.academies.unnamed`, { id: id.slice(0, 8) });

  const academyOptions = [
    { value: ALL, label: t(`${K}.filters.allAcademies`) },
    ...(overview.data?.academies ?? []).map((academy) => ({
      value: academy.academyId,
      label: academyName(academy.academyId, academy.academyName),
    })),
  ];
  if (academyId && !academyOptions.some((o) => o.value === academyId)) {
    const selected = summary.data?.academies.find(
      (a) => a.academyId === academyId
    );
    academyOptions.push({
      value: academyId,
      label: academyName(academyId, selected?.academyName ?? null),
    });
  }

  const keyOptions = useMemo(() => {
    const keys = new Set(items.map((item) => item.key));
    if (key) keys.add(key);
    return [
      { value: ALL, label: t(`${K}.filters.allTypes`) },
      ...[...keys].sort().map((value) => ({ value, label: value })),
    ];
  }, [items, key, t]);

  const renderSummary = (): JSX.Element | null => {
    if (summary.isLoading) {
      return (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          aria-busy="true"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      );
    }
    if (!summary.data) return null;
    const by = summary.data.byStatus;
    const notSent = (by.not_sent ?? 0) + (by.suppressed ?? 0);
    const problemCount = problems(by);
    return (
      <section aria-labelledby="email-activity-summary" className="space-y-3">
        <h2 id="email-activity-summary" className="sr-only">
          {t(`${K}.summary.heading`)}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            icon={Mail}
            label={t(`${K}.summary.total`)}
            value={num(summary.data.total)}
            hint={t(`${K}.summary.totalHint`)}
          />
          <StatTile
            icon={CheckCircle2}
            label={t(`${K}.summary.delivered`)}
            value={num(by.delivered ?? 0)}
            hint={t(`${K}.summary.deliveredHint`)}
          />
          <StatTile
            icon={Send}
            label={t(`${K}.summary.sent`)}
            value={num(by.sent ?? 0)}
            hint={t(`${K}.summary.sentHint`)}
          />
          <StatTile
            icon={AlertTriangle}
            label={t(`${K}.summary.problems`)}
            value={num(problemCount)}
            hint={t(`${K}.summary.problemsHint`)}
            emphasis={problemCount > 0 ? 'warning' : 'default'}
          />
          <StatTile
            icon={MailX}
            label={t(`${K}.summary.notSent`)}
            value={num(notSent)}
            hint={t(`${K}.summary.notSentHint`)}
          />
        </div>
        {!summary.data.deliveryWebhooksObserved && summary.data.total > 0 ? (
          <p
            role="note"
            className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t(`${K}.summary.deliveredUnconfirmed`)}
          </p>
        ) : null}
      </section>
    );
  };

  const renderAcademies = (): JSX.Element | null => {
    if (academyId || !summary.data || summary.data.academies.length === 0)
      return null;
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle as="h2">{t(`${K}.academies.heading`)}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(`${K}.academies.description`)}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {summary.data.academies.map((academy) => {
              const name = academyName(academy.academyId, academy.academyName);
              const issues = problems(academy.byStatus);
              return (
                <li key={academy.academyId}>
                  <button
                    type="button"
                    onClick={() => setFilter('academy', academy.academyId)}
                    aria-label={t(`${K}.academies.view`, { name })}
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span
                      className="min-w-0 truncate text-sm font-medium"
                      dir="auto"
                    >
                      {name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {t(`${K}.academies.emails`, {
                          count: academy.total,
                          formatted: num(academy.total),
                        })}
                      </span>
                      {issues > 0 ? (
                        <StatusBadge
                          tone="destructive"
                          labelKey={`${K}.academies.problems`}
                          values={{ count: issues, formatted: num(issues) }}
                        />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const statusCell = (item: EmailActivityItem) => (
    <StatusBadge
      labelKey={`${K}.statuses.${item.status}`}
      tone={activityStatusTone(item.status)}
    />
  );
  const issueText = (item: EmailActivityItem) =>
    item.errorCategory
      ? t(`${K}.errors.${item.errorCategory}`)
      : t('platformEmail:common.notAvailable');
  const recipientText = (item: EmailActivityItem) =>
    item.recipient.maskedEmail ?? t(`${K}.table.unknownRecipient`);
  const typeCell = (item: EmailActivityItem) => (
    <span className="flex flex-wrap items-center gap-1.5">
      <code className="break-all text-xs" dir="ltr">
        {item.key}
      </code>
      {item.security ? (
        <StatusBadge labelKey={`${K}.table.security`} tone="info" />
      ) : null}
    </span>
  );

  const renderList = (): JSX.Element => {
    if (feed.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={feed.error.kind}
            requestId={feed.error.requestId}
            onRetry={() => {
              void feed.refetch();
              void summary.refetch();
            }}
          />
        </div>
      );
    }
    if (feed.isLoading) {
      return (
        <div className="p-4" aria-busy="true">
          <SkeletonTable columns={6} />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="p-4">
          {hasFilters ? (
            <EmptyState
              icon={SearchX}
              titleKey={`${K}.noResults.title`}
              descriptionKey={`${K}.noResults.description`}
              primaryAction={{
                labelKey: 'platformEmail:common.clearFilters',
                onAction: clearFilters,
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={Mail}
              titleKey={`${K}.empty.title`}
              descriptionKey={`${K}.empty.description`}
            />
          )}
        </div>
      );
    }
    return (
      <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">{t(`${K}.table.caption`)}</caption>
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                {[
                  'when',
                  'academy',
                  'type',
                  'recipient',
                  'status',
                  'delivery',
                  'issue',
                ].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 text-start font-medium"
                  >
                    {t(`${K}.table.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <time dateTime={item.createdAt}>
                      {fmt.dateTime(item.createdAt)}
                    </time>
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3" dir="auto">
                    {academyName(item.academy.id, item.academy.name)}
                  </td>
                  <td className="px-4 py-3">{typeCell(item)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <span dir="ltr">{recipientText(item)}</span>
                  </td>
                  <td className="px-4 py-3">{statusCell(item)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <span dir="ltr">
                      {item.provider ?? t('platformEmail:common.notAvailable')}
                    </span>
                    <span className="block text-xs">
                      {t(`${K}.table.attempts`, { count: item.attempts })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {issueText(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul
          aria-label={t(`${K}.table.caption`)}
          className="divide-y divide-border md:hidden"
        >
          {items.map((item) => (
            <li key={item.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <span
                  className="min-w-0 truncate text-sm font-medium"
                  dir="auto"
                >
                  {academyName(item.academy.id, item.academy.name)}
                </span>
                {statusCell(item)}
              </div>
              {typeCell(item)}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span dir="ltr">{recipientText(item)}</span>
                <time dateTime={item.createdAt}>
                  {fmt.dateTime(item.createdAt)}
                </time>
              </div>
              {item.errorCategory ? (
                <p className="text-xs text-muted-foreground">
                  {issueText(item)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        <LoadMoreFooter
          hasNextPage={Boolean(feed.hasNextPage)}
          isFetchingNextPage={feed.isFetchingNextPage}
          onLoadMore={() => void feed.fetchNextPage()}
        />
      </>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}.title`}
        descriptionKey={`${K}.subtitle`}
        breadcrumbs={BREADCRUMBS}
      />

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MonitoringSelect
            label={t('platformEmail:common.range.label')}
            value={String(days)}
            options={ACTIVITY_RANGE_DAYS.map((value) => ({
              value: String(value),
              label: t(`platformEmail:common.range.${value}`),
            }))}
            onChange={(value) => setFilter('days', value)}
          />
          <MonitoringSelect
            label={t(`${K}.filters.academy`)}
            value={academyId ?? ALL}
            options={academyOptions}
            onChange={(value) => setFilter('academy', value)}
          />
          <MonitoringSelect
            label={t(`${K}.filters.status`)}
            value={status ?? ALL}
            options={[
              { value: ALL, label: t(`${K}.filters.allStatuses`) },
              ...EMAIL_ACTIVITY_STATUSES.map((value: EmailActivityStatus) => ({
                value,
                label: t(`${K}.statuses.${value}`),
              })),
            ]}
            onChange={(value) => setFilter('status', value)}
          />
          <MonitoringSelect
            label={t(`${K}.filters.type`)}
            value={key ?? ALL}
            options={keyOptions}
            onChange={(value) => setFilter('type', value)}
          />
        </div>
        {hasFilters ? (
          <div>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={clearFilters}
            >
              <X className="me-2 h-4 w-4" aria-hidden="true" />
              {t('platformEmail:common.clearFilters')}
            </Button>
          </div>
        ) : null}

        {renderSummary()}
        {renderAcademies()}

        <Card>
          <CardContent className="p-0">{renderList()}</CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          {t('platformEmail:common.privacyNote')}
        </p>
      </div>
    </PageContainer>
  );
}
