/**
 * RevenueSummary (Phase 8) — the dashboard's revenue figure.
 *
 * This component's whole job is telling the truth about a number that is
 * easy to get subtly wrong. Atlas only records revenue for Organizations
 * collecting through Atlas Payments; an Organization using its own
 * payment gateway moves money Atlas is never a party to, so Atlas has no
 * figure at all for it. `revenue.tracked === false` means exactly that —
 * "not tracked here", NOT "you earned nothing" — and this component
 * renders an explicit explanatory state for it, never a `0`.
 *
 * When revenue IS tracked, the amount comes from the real
 * `revenue_ledger_entries` sums the backend computed, rendered per
 * currency (an organization can genuinely hold entries in more than one)
 * and converted from minor units at the last possible moment. Nothing is
 * projected, annualized, or estimated.
 *
 * B0-CPY-15 — an academy that already collects by manual transfer is never
 * asked to "set up how you collect payments".
 *
 * B0-COM-02 — for the organization owner, sales collected by manual
 * payment and approved in Atlas are shown as their own figure ("sales
 * recorded in Atlas"), per 7/30/90 days: gross amounts the academy
 * received itself, never presented as Atlas revenue.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { DashboardManualSales, DashboardRevenue } from '@types';

export interface RevenueSummaryProps {
  readonly revenue: DashboardRevenue;
}

function formatAmount(
  amountMinorUnits: number,
  currency: string,
  locale: string
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amountMinorUnits / 100);
}

function notTrackedKey(revenue: DashboardRevenue): string {
  if (revenue.paymentCollectionMode === 'organization_gateway') {
    return 'dashboard:revenue.notTracked.ownGateway';
  }
  return revenue.manualPaymentMethodsEnabled
    ? 'dashboard:revenue.notTracked.manual'
    : 'dashboard:revenue.notTracked.unconfigured';
}

const DEFAULT_WINDOW_DAYS = 30;

function ManualSalesSummary({
  manualSales,
}: {
  readonly manualSales: DashboardManualSales;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState(
    manualSales.periods.some((period) => period.days === DEFAULT_WINDOW_DAYS)
      ? DEFAULT_WINDOW_DAYS
      : (manualSales.periods[0]?.days ?? DEFAULT_WINDOW_DAYS)
  );
  const period = manualSales.periods.find((entry) => entry.days === days);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">
        {t('dashboard:revenue.manualSales.title')}
      </p>
      <div
        role="group"
        aria-label={t('dashboard:revenue.manualSales.windowLabel')}
        className="flex flex-wrap gap-1"
      >
        {manualSales.periods.map((entry) => (
          <Button
            key={entry.days}
            type="button"
            size="sm"
            variant={entry.days === days ? 'secondary' : 'ghost'}
            aria-pressed={entry.days === days}
            onClick={() => setDays(entry.days)}
          >
            {t(`dashboard:revenue.manualSales.window.${entry.days}`)}
          </Button>
        ))}
      </div>
      {period && period.totals.length > 0 ? (
        period.totals.map((total) => (
          <div key={total.currency} className="flex flex-col gap-1">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {formatAmount(
                total.amountMinorUnits,
                total.currency,
                i18n.language
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {t('dashboard:revenue.manualSales.orders', {
                count: total.count,
              })}
            </span>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(`dashboard:revenue.manualSales.empty.${days}`)}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t('dashboard:revenue.manualSales.note')}
      </p>
    </div>
  );
}

function hasManualSales(revenue: DashboardRevenue): boolean {
  if (!revenue.manualSales) return false;
  return (
    !!revenue.manualPaymentMethodsEnabled ||
    revenue.manualSales.periods.some((period) => period.totals.length > 0)
  );
}

export function RevenueSummary({ revenue }: RevenueSummaryProps): JSX.Element {
  const { t, i18n } = useTranslation();

  if (!revenue.tracked && revenue.manualSales && hasManualSales(revenue)) {
    return <ManualSalesSummary manualSales={revenue.manualSales} />;
  }

  if (!revenue.tracked) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium text-foreground">
          {t('dashboard:revenue.notTracked.title')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(notTrackedKey(revenue))}
        </p>
      </div>
    );
  }

  if (revenue.totals.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium text-foreground">
          {t('dashboard:revenue.none.title')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('dashboard:revenue.none.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {revenue.totals.map((total) => (
        <div key={total.currency} className="flex flex-col gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {formatAmount(
              total.amountMinorUnits,
              total.currency,
              i18n.language
            )}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('dashboard:revenue.netOfFees')}
          </span>
        </div>
      ))}
    </div>
  );
}
