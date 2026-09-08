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
 */
import { useTranslation } from "react-i18next";
import type { DashboardRevenue } from "@types";

export interface RevenueSummaryProps {
  readonly revenue: DashboardRevenue;
}

function formatAmount(
  amountMinorUnits: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinorUnits / 100);
}

export function RevenueSummary({ revenue }: RevenueSummaryProps): JSX.Element {
  const { t, i18n } = useTranslation();

  if (!revenue.tracked) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium text-foreground">
          {t("dashboard:revenue.notTracked.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(
            revenue.paymentCollectionMode === "organization_gateway"
              ? "dashboard:revenue.notTracked.ownGateway"
              : "dashboard:revenue.notTracked.unconfigured",
          )}
        </p>
      </div>
    );
  }

  if (revenue.totals.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium text-foreground">
          {t("dashboard:revenue.none.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard:revenue.none.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {revenue.totals.map((total) => (
        <div key={total.currency} className="flex flex-col gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {formatAmount(total.amountMinorUnits, total.currency, i18n.language)}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("dashboard:revenue.netOfFees")}
          </span>
        </div>
      ))}
    </div>
  );
}
