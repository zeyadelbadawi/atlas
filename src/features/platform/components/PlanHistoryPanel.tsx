/**
 * Administrative change history for one plan (P57).
 *
 * WHERE THIS COMES FROM. The audit log, not a `plan_price_history` table.
 * Completed money already snapshots itself (`Payment.amountMinorUnits`,
 * `Checkout.snapshot`), so editing catalog pricing can never make a past
 * charge ambiguous — which means history here is an ADMINISTRATIVE record
 * of who changed what, and that is exactly what `audit_log_entries`
 * already is.
 *
 * CURRENT vs PREVIOUS IS THE POINT. Each row renders the `{from, to}` diff
 * the backend recorded, so "what was the price before?" is answerable at a
 * glance instead of requiring the reader to diff two timestamps mentally.
 * Values are redacted server-side at write time, so nothing sensitive can
 * reach this component in the first place.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@components/feedback';
import { Pagination } from '@components/data-display';
import { useDateFormatter, usePagination } from '@hooks';
import { usePlanHistory } from '../hooks/usePlatformPlans';
import type { PlanHistoryEntry } from '@types';

const PAGE_SIZE = 5;

export interface PlanHistoryPanelProps {
  readonly planKey: string;
}

/**
 * Renders one changed field as "before → after".
 *
 * Objects (a plan's `pricing` is `{amount, currency, billingCycle}`) are
 * JSON-stringified rather than rendered field-by-field: the shape varies
 * per field, and inventing a per-shape renderer would mean guessing at
 * fields this component does not own. `dir="ltr"` because these are
 * technical values — an Arabic reader still needs `{"amount":79}` to read
 * left to right.
 */
function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ChangeRow({ field, from, to }: { field: string; from: unknown; to: unknown }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
      <span className="font-medium text-foreground">{field}</span>
      <span className="text-muted-foreground line-through" dir="ltr">
        {renderValue(from)}
      </span>
      <span className="text-muted-foreground" aria-hidden>
        →
      </span>
      <span className="text-foreground" dir="ltr">
        {renderValue(to)}
      </span>
    </li>
  );
}

export function PlanHistoryPanel({ planKey }: PlanHistoryPanelProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();

  // `totalItems` comes back from the server, so the control is driven by the
  // real count rather than a guess — the same order every other Atlas list
  // uses (fetch, then size the pager).
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems, initialPageSize: PAGE_SIZE });

  const history = usePlanHistory(planKey, {
    pagination: { page: pagination.page, pageSize: pagination.pageSize },
  });

  useEffect(() => {
    if (history.data) setTotalItems(history.data.pagination.totalItems);
  }, [history.data]);

  const renderBody = (): JSX.Element => {
    if (history.isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }
    if (history.isError) {
      return <ErrorState onRetry={() => void history.refetch()} />;
    }

    const data = history.data;
    if (!data || data.items.length === 0) {
      return (
        <EmptyState
          titleKey="platform:planAdmin.history.emptyTitle"
          descriptionKey="platform:planAdmin.history.emptyDescription"
        />
      );
    }

    return (
      <div className="space-y-4">
        <ul className="space-y-4">
          {data.items.map((entry: PlanHistoryEntry) => (
            <li
              key={entry.id}
              className="rounded-md border border-border p-3"
              data-testid={`plan-history-${entry.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {t(`platform:planAdmin.history.actions.${entry.action}`, {
                    defaultValue: entry.action,
                  })}
                </span>
                <time className="text-xs text-muted-foreground" dateTime={entry.occurredAt}>
                  {fmt.dateTime(entry.occurredAt)}
                </time>
              </div>
              <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                {t('platform:planAdmin.history.by', { name: entry.actor.name })}
              </p>

              {entry.changes && Object.keys(entry.changes).length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {Object.entries(entry.changes).map(([field, change]) => (
                    <ChangeRow
                      key={field}
                      field={field}
                      from={change.from}
                      to={change.to}
                    />
                  ))}
                </ul>
              ) : (
                // An entry written before P58 genuinely has no recorded
                // diff. Saying so is more useful than an empty area that
                // looks like a rendering failure.
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('platform:planAdmin.history.noDetail')}
                </p>
              )}
            </li>
          ))}
        </ul>

        <Pagination pagination={pagination} hidePageSize />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" aria-hidden />
          {t('platform:planAdmin.history.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );
}
