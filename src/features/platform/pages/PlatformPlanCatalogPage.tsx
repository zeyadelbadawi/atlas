/**
 * Plan/Add-on Catalog Administration — Platform Owner Console.
 *
 * PLAN MANAGEMENT (atlas-backend#112). The plan list is the Platform
 * Owner's own (`GET platform-plans`), not the customer catalog: it shows
 * every plan — listed (customers see it, at its position), hidden (not
 * offered, buyable by key only: founding price locks, for example) and
 * archived — with how many organizations each reaches (paying, trialing,
 * switching in at renewal, founding locks). Filter chips (Listed by
 * default, Hidden, Archived, All), search by key or name and paging all go
 * to the server, which orders listed plans by position, then hidden, then
 * archived.
 *
 * From here the owner creates a plan (always created hidden, then opened in
 * the editor), edits one (including whether customers see it), reads its
 * history, archives it (with the lapse consequence and the counts spelled
 * out first) or restores an archived one. The marketing pricing page is
 * pre-rendered, so the page says a new or archived plan only shows up (or
 * disappears) there after the next site deploy.
 *
 * P57 — plans are edited behind `PlatformOwnerGuard` (`platform-plans`),
 * with archive-not-delete semantics, optimistic concurrency, audited
 * before/after history and a limit-reduction impact warning. ADD-ONS stay
 * read-only here: their availability, Arabic names and prices are managed
 * on the dedicated Add-ons Management page (linked from the card), and
 * duplicating that surface would be a second control for one fact.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Info, Plus, Rocket } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { SearchInput, StatusBadge } from '@components/data-display';
import type { StatusTone } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  localizedAddOnText,
  resolvePlanDescription,
  resolvePlanName,
  useAddOnCatalog,
} from '@features/tenant';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatCurrency, formatNumber } from '@utils';
import type {
  LanguageCode,
  Plan,
  PlanVisibility,
  PlatformPlanRow,
} from '@types';
import { PlanEditorDialog } from '../components/PlanEditorDialog';
import { PlanHistoryPanel } from '../components/PlanHistoryPanel';
import { CreatePlanDialog } from '../components/CreatePlanDialog';
import { ArchivePlanDialog } from '../components/ArchivePlanDialog';
import { RestorePlanDialog } from '../components/RestorePlanDialog';
import { usePlatformPlanList } from '../hooks/usePlatformPlans';
import {
  nextListedPosition,
  planVisibility,
} from '../utils/plan-management.utils';

const PAGE_SIZE = 20;
/** The server's search limit (key or name). */
const SEARCH_MAX = 100;
/** One page holds every listed plan, for the next free position. */
const LISTED_PAGE_SIZE = 100;

type VisibilityFilter = PlanVisibility | 'all';
const FILTERS: readonly VisibilityFilter[] = [
  'listed',
  'hidden',
  'archived',
  'all',
];

const BADGE_TONE: Record<PlanVisibility, StatusTone> = {
  listed: 'success',
  hidden: 'warning',
  archived: 'neutral',
};

const C = 'platform:planCatalog';

export default function PlatformPlanCatalogPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  const [visibility, setVisibility] = useState<VisibilityFilter>('listed');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const searchText = search.trim().slice(0, SEARCH_MAX);
  const plansQuery = usePlatformPlanList({
    page,
    pageSize: PAGE_SIZE,
    search: searchText || undefined,
    visibility: visibility === 'all' ? undefined : visibility,
  });
  // Every listed plan, so a plan shown to customers (from the editor or a
  // restore) is offered the next free position.
  const listedQuery = usePlatformPlanList({
    page: 1,
    pageSize: LISTED_PAGE_SIZE,
    visibility: 'listed',
  });
  const nextPosition = nextListedPosition(listedQuery.data?.items ?? []);
  const addOnsQuery = useAddOnCatalog();

  /** The plan currently open in the editor, or null. */
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  /** The plan whose change history is expanded, so history is opt-in rather than N queries on mount. */
  const [historyPlanKey, setHistoryPlanKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<PlatformPlanRow | null>(null);
  const [restoring, setRestoring] = useState<PlatformPlanRow | null>(null);

  const applyVisibility = (next: VisibilityFilter): void => {
    setVisibility(next);
    setPage(1);
  };
  const applySearch = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  const n = (value: number | undefined) => formatNumber(value ?? 0, language);
  const money = (amount: number, currency: string): string => {
    try {
      return formatCurrency(amount, language, currency);
    } catch {
      return `${n(amount)} ${currency}`;
    }
  };

  const items = plansQuery.data?.items ?? [];
  const pagination = plansQuery.data?.pagination;

  const renderPrices = (plan: PlatformPlanRow): JSX.Element => {
    const pricing = plan.pricing;
    if (pricing?.amount === undefined || !pricing.currency) {
      return (
        <span className="text-sm text-muted-foreground">
          {t(`${C}.price.none`)}
        </span>
      );
    }
    const cycle = pricing.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    return (
      <span
        className="flex flex-col text-sm text-muted-foreground"
        data-atlas-numeric="true"
        data-testid={`plan-price-${plan.key}`}
      >
        <span>
          {t(`${C}.price.${cycle}`, {
            price: money(pricing.amount, pricing.currency),
          })}
        </span>
        {cycle === 'monthly' && pricing.yearlyAmount !== undefined ? (
          <span>
            {t(`${C}.price.yearly`, {
              price: money(pricing.yearlyAmount, pricing.currency),
            })}
          </span>
        ) : null}
      </span>
    );
  };

  const renderRow = (plan: PlatformPlanRow): JSX.Element => {
    const state = planVisibility(plan);
    const name = resolvePlanName(plan, language);
    const description = resolvePlanDescription(plan, language);
    return (
      <li
        key={plan.id}
        // Stacked on a phone: the price, badge and actions need ~290 px
        // and pushed the page sideways at 390 px next to the plan's name.
        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid={`plan-row-${plan.key}`}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* B8 (UX audit) V26 — the plan's name in the page's language. */}
            <p className="font-medium text-foreground" dir="auto">
              {name}
            </p>
            <code
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              dir="ltr"
              data-ltr-content
              data-testid={`plan-key-${plan.key}`}
            >
              {plan.key}
            </code>
            <span data-testid={`plan-badge-${plan.key}`}>
              <StatusBadge
                labelKey={`${C}.visibility.${state}`}
                values={
                  state === 'listed'
                    ? { position: n(plan.displayOrder) }
                    : undefined
                }
                tone={BADGE_TONE[state]}
              />
            </span>
          </div>
          {description ? (
            <p className="text-xs text-muted-foreground" dir="auto">
              {description}
            </p>
          ) : null}
          <p
            className="text-xs text-muted-foreground"
            data-testid={`plan-subscribers-${plan.key}`}
          >
            {t(`${C}.subscribers`, {
              paying: n(plan.subscribers?.paying),
              trialing: n(plan.subscribers?.trialing),
              scheduledIn: n(plan.subscribers?.scheduledIn),
              foundingLocks: n(plan.subscribers?.foundingLocks),
            })}
          </p>
          {/* W8 — the configured gift per cycle, at a glance. */}
          <p
            className="text-xs text-muted-foreground"
            data-testid={`plan-gift-summary-${plan.key}`}
          >
            {t('tenant:gift.adminPlanSummary', {
              monthly: plan.giftedDaysMonthly ?? t('tenant:gift.adminNone'),
              yearly: plan.giftedDaysYearly ?? t('tenant:gift.adminNone'),
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {renderPrices(plan)}
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid={`plan-edit-${plan.key}`}
            aria-label={t(`${C}.actions.editFor`, { plan: name })}
            onClick={() => setEditingPlan(plan)}
          >
            {t('common:actions.edit')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            data-testid={`plan-history-toggle-${plan.key}`}
            aria-label={t(`${C}.actions.historyFor`, { plan: name })}
            aria-pressed={historyPlanKey === plan.key}
            onClick={() =>
              setHistoryPlanKey((current) =>
                current === plan.key ? null : plan.key
              )
            }
          >
            {t('platform:planAdmin.history.toggle')}
          </Button>
          {state === 'archived' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid={`plan-restore-${plan.key}`}
              aria-label={t(`${C}.actions.restoreFor`, { plan: name })}
              onClick={() => setRestoring(plan)}
            >
              {t(`${C}.actions.restore`)}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              data-testid={`plan-archive-${plan.key}`}
              aria-label={t(`${C}.actions.archiveFor`, { plan: name })}
              onClick={() => setArchiving(plan)}
            >
              {t(`${C}.actions.archive`)}
            </Button>
          )}
        </div>
      </li>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${C}.title`}
        descriptionKey={`${C}.subtitle`}
        actions={
          <Button
            type="button"
            data-testid="plan-create"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" aria-hidden />
            {t(`${C}.newPlan`)}
          </Button>
        }
      />

      <div className="space-y-6">
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>{t(`${C}.boundaryTitle`)}</AlertTitle>
          <AlertDescription>{t(`${C}.boundaryDescription`)}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">{t(`${C}.plansTitle`)}</CardTitle>
            {/* The marketing pricing page is pre-rendered (owner decision). */}
            <Alert data-testid="plan-catalog-marketing-note">
              <Rocket className="size-4" aria-hidden />
              <AlertTitle>{t(`${C}.marketingNoteTitle`)}</AlertTitle>
              <AlertDescription>{t(`${C}.marketingNote`)}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onValueChange={applySearch}
                labelKey={`${C}.searchLabel`}
                placeholderKey={`${C}.searchPlaceholder`}
                className="min-w-0 sm:max-w-xs sm:flex-1"
              />
              <div
                role="group"
                aria-label={t(`${C}.filtersLabel`)}
                className="flex flex-wrap gap-1"
              >
                {FILTERS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={visibility === value ? 'default' : 'outline'}
                    aria-pressed={visibility === value}
                    data-testid={`plan-filter-${value}`}
                    onClick={() => applyVisibility(value)}
                  >
                    {t(`${C}.filters.${value}`)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {plansQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : plansQuery.error ? (
              <ErrorState onRetry={() => void plansQuery.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState
                titleKey={
                  searchText ? `${C}.empty.search` : `${C}.empty.${visibility}`
                }
              />
            ) : (
              <ul className="divide-y divide-border">{items.map(renderRow)}</ul>
            )}

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {t(`${C}.pagination.summary`, {
                    page: n(pagination.page),
                    totalPages: n(pagination.totalPages),
                    totalItems: n(pagination.totalItems),
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t(`${C}.pagination.previous`)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t(`${C}.pagination.next`)}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {historyPlanKey ? <PlanHistoryPanel planKey={historyPlanKey} /> : null}

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {t(`${C}.addOnsTitle`)}
              </CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link
                  to={DASHBOARD_ROUTES.platformAddOns}
                  data-testid="plan-catalog-addons-link"
                >
                  {t(`${C}.addOnsLink`)}
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(`${C}.addOnsNote`)}
            </p>
          </CardHeader>
          <CardContent>
            {addOnsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : addOnsQuery.error ? (
              <ErrorState onRetry={() => void addOnsQuery.refetch()} />
            ) : !addOnsQuery.data || addOnsQuery.data.length === 0 ? (
              <EmptyState titleKey={`${C}.noAddOns`} />
            ) : (
              <ul className="divide-y divide-border">
                {addOnsQuery.data.map((addOn) => (
                  <li
                    key={addOn.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground" dir="auto">
                        {localizedAddOnText(
                          t,
                          i18n,
                          addOn.key,
                          'name',
                          addOn.name,
                          addOn.nameAr
                        )}
                      </p>
                      {addOn.description ? (
                        <p className="text-xs text-muted-foreground" dir="auto">
                          {localizedAddOnText(
                            t,
                            i18n,
                            addOn.key,
                            'description',
                            addOn.description,
                            addOn.descriptionAr
                          )}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="shrink-0 text-sm text-muted-foreground"
                      data-atlas-numeric="true"
                      data-testid={`catalog-addon-price-${addOn.key}`}
                    >
                      {addOn.pricing?.amount !== undefined &&
                      addOn.pricing.currency
                        ? money(addOn.pricing.amount, addOn.pricing.currency)
                        : t(`${C}.addOnNoPrice`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <PlanEditorDialog
        plan={editingPlan}
        nextListedPosition={nextPosition}
        onOpenChange={(open) => {
          if (!open) setEditingPlan(null);
        }}
      />
      <CreatePlanDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(plan) => setEditingPlan(plan)}
      />
      <ArchivePlanDialog plan={archiving} onClose={() => setArchiving(null)} />
      <RestorePlanDialog
        plan={restoring}
        nextListedPosition={nextPosition}
        onClose={() => setRestoring(null)}
      />
    </PageContainer>
  );
}
