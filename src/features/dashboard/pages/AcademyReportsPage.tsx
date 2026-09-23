/**
 * Owner Reports page (P64 Phase 4 §E.5) — three reports for the academy
 * named in the route, over one selectable trailing window.
 *
 *   1. Integrity — quiz integrity events across the academy's attempts.
 *   2. Sharing — lesson-access grants versus refusals (account-sharing and
 *      device-limit signals).
 *   3. Quota — the organization's plan usage, REUSED from the tenant feature
 *      (`useTenantUsage` + `entitlement.utils`). Nothing here recomputes a
 *      limit or a percentage; the same functions the Usage page uses decide.
 *
 * Presentation rules that follow from the backend contract:
 *
 *   - The window is 7 / 30 / 90 days, all inside the backend's 1–90 range,
 *     so the page can never provoke the 400 the endpoint returns outside it.
 *   - A 403 (a member who is not owner/admin/manager of THIS academy) is a
 *     real state with its own copy, never a blank page or a generic error.
 *   - `truncated` means a LIST was capped, not a headline figure; the notice
 *     says exactly that and nothing more.
 *   - Event types and refusal reasons are open string maps owned by the
 *     backend. Known keys get a translated label; an unknown one renders as
 *     its raw key rather than being dropped.
 *   - Colour never carries a meaning on its own: every bar has its number
 *     beside it, every status has its badge text.
 *
 * Mirrors `StudentAnalyticsPage`'s composition (PageContainer / PageHeader /
 * SectionCard / MetricCard / EmptyState / ErrorState) so the two management
 * analytics pages read as one surface.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  Info,
  KeyRound,
  ListChecks,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Users,
  UserX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { MetricCard, StatusBadge } from '@components/data-display';
import type { StatusTone } from '@components/data-display';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
// Through the tenant feature's public barrel, the same way
// `DashboardOverviewPage` and `features/billing` depend on it — a feature
// never reaches into another feature's files.
import {
  STORAGE_LIMIT_KEYS,
  USAGE_METRIC_KEYS,
  formatLimitValue,
  getUsageMetricStatus,
  getUsagePercentage,
  useTenantUsage,
} from '@features/tenant';
import {
  useAcademyIntegrityReport,
  useAcademySharingReport,
} from '../hooks/useAcademyReports';
import { REPORT_WINDOW_DEFAULT_DAYS } from '../services/AcademyReportsService';
import type { ApiError } from '@api';
import type { ResourceLimitStatus } from '@types';

/** The windows offered. Every value is inside the backend's 1–90 range. */
const WINDOW_OPTIONS = [7, 30, 90] as const;
type WindowDays = (typeof WINDOW_OPTIONS)[number];

const DEFAULT_WINDOW: WindowDays = REPORT_WINDOW_DEFAULT_DAYS;

/** The same status → tone mapping `TenantUsagePage` uses, so a reached limit looks the same everywhere. */
const USAGE_STATUS_TONE: Record<ResourceLimitStatus, StatusTone> = {
  allowed: 'neutral',
  limitReached: 'destructive',
  unlimited: 'info',
  unknown: 'neutral',
};

const WINDOW_SELECT_ID = 'academy-reports-window';

/** Share of `value` within `total`, guarding the empty case so 0 of 0 reads 0% rather than NaN. */
function share(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function isWindowDays(value: number): value is WindowDays {
  return (WINDOW_OPTIONS as readonly number[]).includes(value);
}

/** `Record<string, number>` → rows sorted by count, largest first, ties by key for a stable order. */
function toSortedRows(
  map: Readonly<Record<string, number>>
): readonly { readonly key: string; readonly value: number }[] {
  return Object.entries(map)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------
// Small presentational pieces, local to this page.
// ---------------------------------------------------------------------------

interface BreakdownListProps {
  readonly rows: readonly { readonly key: string; readonly value: number }[];
  readonly total: number;
  readonly labelFor: (key: string) => string;
  readonly formatNumber: (value: number) => string;
  readonly ariaLabel: string;
}

/** A compact "label · count · bar" list. The number is always printed; the bar only restates it. */
function BreakdownList({
  rows,
  total,
  labelFor,
  formatNumber,
  ariaLabel,
}: BreakdownListProps): JSX.Element {
  return (
    <ul className="flex flex-col gap-3" aria-label={ariaLabel}>
      {rows.map(({ key, value }) => (
        <li key={key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {labelFor(key)}
            </span>
            <span
              className="shrink-0 text-sm tabular-nums text-muted-foreground"
              data-atlas-numeric="true"
            >
              {formatNumber(value)}
              <span className="ms-1 text-xs">({share(value, total)}%)</span>
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${share(value, total)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface TruncatedNoticeProps {
  readonly show: boolean;
}

/** Says a list was capped. Rendered as a status so assistive tech announces it once. */
function TruncatedNotice({ show }: TruncatedNoticeProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
    >
      <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span>{t('dashboard:reports.truncated')}</span>
    </p>
  );
}

interface SectionStateProps {
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly onRetry: () => void;
  readonly children: () => JSX.Element;
}

/** Loading → skeleton; 403 → permission state; other errors → retry; else the content. */
function SectionState({
  isLoading,
  error,
  onRetry,
  children,
}: SectionStateProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (error?.kind === 'forbidden') {
    return <PermissionState />;
  }
  if (error) {
    return (
      <ErrorState
        kind={error.kind}
        titleKey="dashboard:reports.error.title"
        descriptionKey="dashboard:reports.error.description"
        requestId={error.requestId}
        onRetry={onRetry}
      />
    );
  }
  return children();
}

/** The 403 state: this member may not read reports for this academy. */
function PermissionState(): JSX.Element {
  return (
    <EmptyState
      icon={ShieldOff}
      titleKey="dashboard:reports.forbidden.title"
      descriptionKey="dashboard:reports.forbidden.description"
    />
  );
}

interface HeadlineProps {
  readonly labelKey: string;
  readonly value: string;
  readonly icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// The page.
// ---------------------------------------------------------------------------

export default function AcademyReportsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const [days, setDays] = useState<WindowDays>(DEFAULT_WINDOW);

  const integrity = useAcademyIntegrityReport(academyId, days);
  const sharing = useAcademySharingReport(academyId, days);
  const usage = useTenantUsage();

  const formatNumber = (value: number): string =>
    new Intl.NumberFormat(i18n.language).format(value);

  const headline = ({ labelKey, value, icon }: HeadlineProps): JSX.Element => (
    <MetricCard labelKey={labelKey} value={value} icon={icon} />
  );

  /** Known keys get copy; an unknown key from the backend renders as itself, never as a missing-translation string. */
  const labelFor =
    (prefix: string) =>
    (key: string): string =>
      t(`${prefix}.${key}`, { defaultValue: key });

  if (!academyId) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="dashboard:reports.title"
          descriptionKey="dashboard:reports.description"
        />
        <SectionCard>
          <EmptyState
            icon={Users}
            titleKey="dashboard:overview.noScope.title"
            descriptionKey="dashboard:overview.noScope.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  const onWindowChange = (value: string): void => {
    const parsed = Number(value);
    if (isWindowDays(parsed)) setDays(parsed);
  };

  // One permission state in place of BOTH report sections when either
  // endpoint refused the caller: the two reports share one authorization
  // rule server-side, so two identical notices would only be noise. The
  // quota card is a different read with its own rule and keeps its own state.
  const reportsForbidden =
    integrity.error?.kind === 'forbidden' ||
    sharing.error?.kind === 'forbidden';

  return (
    <PageContainer>
      <PageHeader
        titleKey="dashboard:reports.title"
        descriptionKey="dashboard:reports.description"
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor={WINDOW_SELECT_ID} className="whitespace-nowrap">
              {t('dashboard:reports.window.label')}
            </Label>
            <Select value={String(days)} onValueChange={onWindowChange}>
              <SelectTrigger id={WINDOW_SELECT_ID} className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {t('dashboard:reports.window.days', { count: option })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {reportsForbidden ? (
        <SectionCard>
          <PermissionState />
        </SectionCard>
      ) : (
        <>
          {/* ---------------------------------------------------------- */}
          {/* 1. Integrity                                                */}
          {/* ---------------------------------------------------------- */}
          <SectionCard
            titleKey="dashboard:reports.integrity.title"
            descriptionKey="dashboard:reports.integrity.description"
          >
            <SectionState
              isLoading={integrity.isLoading}
              error={integrity.error}
              onRetry={() => void integrity.refetch()}
            >
              {() => {
                const data = integrity.data;
                if (!data || data.totalEvents === 0) {
                  return (
                    <EmptyState
                      icon={ShieldCheck}
                      titleKey="dashboard:reports.integrity.empty.title"
                      descriptionKey="dashboard:reports.integrity.empty.description"
                    />
                  );
                }
                const byType = toSortedRows(data.byType);
                return (
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {headline({
                        labelKey: 'dashboard:reports.integrity.totalEvents',
                        value: formatNumber(data.totalEvents),
                        icon: ShieldAlert,
                      })}
                      {headline({
                        labelKey: 'dashboard:reports.integrity.countedEvents',
                        value: formatNumber(data.countedEvents),
                        icon: ListChecks,
                      })}
                      {headline({
                        labelKey:
                          'dashboard:reports.integrity.attemptsWithEvents',
                        value: formatNumber(data.attemptsWithEvents),
                        icon: Users,
                      })}
                    </div>

                    {byType.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t('dashboard:reports.integrity.byType')}
                        </h3>
                        <BreakdownList
                          rows={byType}
                          total={data.totalEvents}
                          labelFor={labelFor(
                            'dashboard:reports.integrity.types'
                          )}
                          formatNumber={formatNumber}
                          ariaLabel={t('dashboard:reports.integrity.byType')}
                        />
                      </div>
                    ) : null}

                    {data.topCourses.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t('dashboard:reports.integrity.topCourses')}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[28rem] text-sm">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th
                                  scope="col"
                                  className="py-2 text-start font-medium"
                                >
                                  {t('dashboard:reports.columns.course')}
                                </th>
                                <th
                                  scope="col"
                                  className="py-2 text-end font-medium"
                                >
                                  {t('dashboard:reports.columns.events')}
                                </th>
                                <th
                                  scope="col"
                                  className="py-2 text-end font-medium"
                                >
                                  {t('dashboard:reports.columns.attempts')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {data.topCourses.map((course) => (
                                <tr key={course.courseId}>
                                  <th
                                    scope="row"
                                    className="py-3 text-start font-normal text-foreground"
                                  >
                                    {course.courseTitle}
                                  </th>
                                  <td
                                    className="py-3 text-end tabular-nums text-foreground"
                                    data-atlas-numeric="true"
                                  >
                                    {formatNumber(course.events)}
                                  </td>
                                  <td
                                    className="py-3 text-end tabular-nums text-foreground"
                                    data-atlas-numeric="true"
                                  >
                                    {formatNumber(course.attemptsWithEvents)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    <TruncatedNotice show={data.truncated} />
                  </div>
                );
              }}
            </SectionState>
          </SectionCard>

          {/* ---------------------------------------------------------- */}
          {/* 2. Sharing                                                  */}
          {/* ---------------------------------------------------------- */}
          <SectionCard
            titleKey="dashboard:reports.sharing.title"
            descriptionKey="dashboard:reports.sharing.description"
          >
            <SectionState
              isLoading={sharing.isLoading}
              error={sharing.error}
              onRetry={() => void sharing.refetch()}
            >
              {() => {
                const data = sharing.data;
                if (!data || data.granted + data.refused === 0) {
                  return (
                    <EmptyState
                      icon={KeyRound}
                      titleKey="dashboard:reports.sharing.empty.title"
                      descriptionKey="dashboard:reports.sharing.empty.description"
                    />
                  );
                }
                const byReason = toSortedRows(data.refusedByReason);
                const total = data.granted + data.refused;
                return (
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {headline({
                        labelKey: 'dashboard:reports.sharing.granted',
                        value: formatNumber(data.granted),
                        icon: KeyRound,
                      })}
                      {headline({
                        labelKey: 'dashboard:reports.sharing.refused',
                        value: formatNumber(data.refused),
                        icon: Ban,
                      })}
                      {headline({
                        labelKey:
                          'dashboard:reports.sharing.distinctUsersRefused',
                        value: formatNumber(data.distinctUsersRefused),
                        icon: UserX,
                      })}
                      {headline({
                        labelKey:
                          'dashboard:reports.sharing.distinctDevicesRefused',
                        value: formatNumber(data.distinctDevicesRefused),
                        icon: MonitorSmartphone,
                      })}
                    </div>

                    {/* Granted vs refused as one two-segment bar, with both
                        numbers printed beside it — the colours only echo them. */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-foreground">
                          {t('dashboard:reports.sharing.grantedShare', {
                            share: share(data.granted, total),
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          {t('dashboard:reports.sharing.refusedShare', {
                            share: share(data.refused, total),
                          })}
                        </span>
                      </div>
                      <div
                        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
                        role="presentation"
                      >
                        <div
                          className="h-full bg-success"
                          style={{ width: `${share(data.granted, total)}%` }}
                        />
                        <div
                          className="h-full bg-destructive"
                          style={{ width: `${share(data.refused, total)}%` }}
                        />
                      </div>
                    </div>

                    {byReason.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t('dashboard:reports.sharing.byReason')}
                        </h3>
                        <BreakdownList
                          rows={byReason}
                          total={data.refused}
                          labelFor={labelFor(
                            'dashboard:reports.sharing.reasons'
                          )}
                          formatNumber={formatNumber}
                          ariaLabel={t('dashboard:reports.sharing.byReason')}
                        />
                      </div>
                    ) : null}

                    <div className="grid gap-6 lg:grid-cols-2">
                      {data.topCourses.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          <h3 className="text-sm font-semibold text-foreground">
                            {t('dashboard:reports.sharing.topCourses')}
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th
                                    scope="col"
                                    className="py-2 text-start font-medium"
                                  >
                                    {t('dashboard:reports.columns.course')}
                                  </th>
                                  <th
                                    scope="col"
                                    className="py-2 text-end font-medium"
                                  >
                                    {t('dashboard:reports.columns.refusals')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {data.topCourses.map((course) => (
                                  <tr key={course.courseId}>
                                    <th
                                      scope="row"
                                      className="py-3 text-start font-normal text-foreground"
                                    >
                                      {course.courseTitle}
                                    </th>
                                    <td
                                      className="py-3 text-end tabular-nums text-foreground"
                                      data-atlas-numeric="true"
                                    >
                                      {formatNumber(course.refusals)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}

                      {data.topUsers.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          <h3 className="text-sm font-semibold text-foreground">
                            {t('dashboard:reports.sharing.topUsers')}
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th
                                    scope="col"
                                    className="py-2 text-start font-medium"
                                  >
                                    {t('dashboard:reports.columns.user')}
                                  </th>
                                  <th
                                    scope="col"
                                    className="py-2 text-end font-medium"
                                  >
                                    {t('dashboard:reports.columns.refusals')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {data.topUsers.map((user) => (
                                  <tr key={user.userId}>
                                    {/* Name only — the id is a key, never copy. */}
                                    <th
                                      scope="row"
                                      className="py-3 text-start font-normal text-foreground"
                                    >
                                      {user.userName ??
                                        t(
                                          'dashboard:reports.sharing.unnamedUser'
                                        )}
                                    </th>
                                    <td
                                      className="py-3 text-end tabular-nums text-foreground"
                                      data-atlas-numeric="true"
                                    >
                                      {formatNumber(user.refusals)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <TruncatedNotice show={data.truncated} />
                  </div>
                );
              }}
            </SectionState>
          </SectionCard>
        </>
      )}

      {/* ------------------------------------------------------------ */}
      {/* 3. Quota — the organization's plan usage, reused verbatim.    */}
      {/* ------------------------------------------------------------ */}
      <SectionCard
        titleKey="dashboard:reports.quota.title"
        descriptionKey="dashboard:reports.quota.description"
      >
        {usage.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {USAGE_METRIC_KEYS.map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : usage.error?.kind === 'forbidden' ? (
          <PermissionState />
        ) : usage.error?.kind === 'notFound' ? (
          // Usage is a computed row a worker fills shortly after a
          // subscription activates — see `TenantUsagePage`'s identical
          // branch. Expected for a fresh subscription, not a failure.
          <EmptyState
            titleKey="dashboard:usage.unavailable.title"
            descriptionKey="dashboard:usage.unavailable.description"
          />
        ) : usage.error || !usage.data ? (
          <ErrorState
            kind={usage.error?.kind}
            onRetry={() => void usage.refetch()}
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {USAGE_METRIC_KEYS.map((limitKey) => {
              const metric = usage.data[limitKey];
              const status = getUsageMetricStatus(metric);
              const percentage = getUsagePercentage(metric);
              const isStorage = STORAGE_LIMIT_KEYS.includes(limitKey);
              const label = t(`tenant:common.limits.${limitKey}`);
              return (
                <li key={limitKey} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm tabular-nums text-muted-foreground"
                        data-atlas-numeric="true"
                      >
                        {isStorage
                          ? `${formatNumber(metric.used)} GB`
                          : formatNumber(metric.used)}{' '}
                        /{' '}
                        {formatLimitValue(
                          metric.limit,
                          isStorage,
                          t('tenant:common.unlimited')
                        )}
                      </span>
                      <StatusBadge
                        labelKey={`tenant:common.usageStatus.${status}`}
                        tone={USAGE_STATUS_TONE[status]}
                      />
                    </div>
                  </div>
                  {percentage !== null ? (
                    <Progress value={percentage} aria-label={label} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
