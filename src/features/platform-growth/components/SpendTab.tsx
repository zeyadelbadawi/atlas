/**
 * G1 — Spend tab: the marketing cash ledger, grouped by month (newest
 * first) with a total per month. Add / edit in a dialog, delete after a
 * confirmation; a 409 means someone else changed the entry first (the list
 * reloads and says so).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { EmptyState, ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@app/providers';
import { useLanguage } from '@hooks';
import { toErrorsNamespaceKey } from '@utils';
import type { ApiError } from '@api';
import {
  useCreateSpend,
  useDeleteSpend,
  useGrowthSpend,
  useUpdateSpend,
} from '../hooks/usePlatformGrowth';
import type { MonthRange, SpendEntry, SpendWritePayload } from '../types';
import {
  K,
  defaultSpendRange,
  formatMoney,
  formatMonth,
  isStaleError,
} from '../utils/growth.utils';
import { ConfirmDialog } from './ConfirmDialog';
import { MonthRangePicker } from './MonthRangePicker';
import { SpendEntryDialog } from './SpendEntryDialog';
import { useChannelLabel } from './parts';

/** Entries grouped by month, newest month first (the API's order is kept inside a month). */
export function groupByMonth(
  items: readonly SpendEntry[]
): { month: string; entries: SpendEntry[]; totalMinorUnits: number }[] {
  const groups = new Map<string, SpendEntry[]>();
  for (const item of items) {
    const list = groups.get(item.month) ?? [];
    list.push(item);
    groups.set(item.month, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([month, entries]) => ({
      month,
      entries,
      totalMinorUnits: entries.reduce(
        (sum, entry) => sum + entry.amountMinorUnits,
        0
      ),
    }));
}

export function SpendTab(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const channelLabel = useChannelLabel();
  const { notifySuccess, notifyError } = useToast();
  const [range, setRange] = useState<MonthRange>(() => defaultSpendRange());
  const spend = useGrowthSpend(range);
  const create = useCreateSpend();
  const update = useUpdateSpend();
  const remove = useDeleteSpend();
  const [dialog, setDialog] = useState<{ entry: SpendEntry | null } | null>(
    null
  );
  const [toDelete, setToDelete] = useState<SpendEntry | null>(null);

  const groups = useMemo(
    () => groupByMonth(spend.data?.items ?? []),
    [spend.data?.items]
  );
  const money = (minor: number) => formatMoney(minor, language);

  const fail = (error: ApiError) => {
    if (isStaleError(error) || error.status === 404) {
      notifyError(`${K}common.conflictTitle`, `${K}spend.conflictBody`);
      setDialog(null);
      setToDelete(null);
      void spend.refetch();
      return;
    }
    notifyError(
      `${K}common.failed`,
      error.messageKey ? toErrorsNamespaceKey(error.messageKey) : undefined
    );
  };

  const submit = (payload: SpendWritePayload) => {
    if (!dialog) return;
    if (dialog.entry) {
      update.mutate(
        {
          id: dialog.entry.id,
          payload: { ...payload, version: dialog.entry.version },
        },
        {
          onSuccess: () => {
            notifySuccess(`${K}spend.toasts.saved`);
            setDialog(null);
          },
          onError: fail,
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          notifySuccess(`${K}spend.toasts.added`);
          setDialog(null);
        },
        onError: fail,
      });
    }
  };

  const entryName = (entry: SpendEntry) =>
    t(`${K}spend.entryName`, {
      channel: channelLabel(entry.channel),
      month: formatMonth(entry.month, language),
    });

  const renderBody = () => {
    if (spend.error) {
      return (
        <ErrorState
          kind={spend.error.kind}
          onRetry={() => void spend.refetch()}
        />
      );
    }
    if (spend.isLoading || !spend.data) {
      return (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }
    if (groups.length === 0) {
      return (
        <EmptyState
          icon={Wallet}
          headingLevel="h2"
          titleKey={`${K}spend.empty.title`}
          descriptionKey={`${K}spend.empty.description`}
          primaryAction={{
            labelKey: `${K}spend.add`,
            onAction: () => setDialog({ entry: null }),
            icon: Plus,
          }}
        />
      );
    }
    return (
      <div className="space-y-4">
        {groups.map((group) => {
          const title = formatMonth(group.month, language);
          const headingId = `spend-month-${group.month}`;
          return (
            <Card key={group.month} aria-labelledby={headingId} role="region">
              <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2 space-y-0 pb-2">
                <CardTitle id={headingId} className="text-base">
                  {title}
                </CardTitle>
                <p
                  className="text-sm font-medium tabular-nums text-muted-foreground"
                  data-atlas-numeric="true"
                >
                  {t(`${K}spend.monthTotal`, {
                    amount: money(group.totalMinorUnits),
                  })}
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                <ul className="divide-y divide-border">
                  {group.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-2 sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {channelLabel(entry.channel)}
                        </p>
                        {entry.description ? (
                          <p
                            className="truncate text-sm text-muted-foreground"
                            dir="auto"
                          >
                            {entry.description}
                          </p>
                        ) : null}
                      </div>
                      <p
                        className="shrink-0 font-semibold tabular-nums text-foreground"
                        data-atlas-numeric="true"
                      >
                        {money(entry.amountMinorUnits)}
                      </p>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11"
                          onClick={() => setDialog({ entry })}
                          aria-label={t(`${K}spend.edit`, {
                            name: entryName(entry),
                          })}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 text-destructive hover:text-destructive"
                          onClick={() => setToDelete(entry)}
                          aria-label={t(`${K}spend.delete`, {
                            name: entryName(entry),
                          })}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <MonthRangePicker idPrefix="spend" value={range} onChange={setRange} />
        <Button
          type="button"
          className="min-h-11"
          onClick={() => setDialog({ entry: null })}
        >
          <Plus className="size-4" aria-hidden />
          {t(`${K}spend.add`)}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t(`${K}spend.intro`)}</p>
      {renderBody()}

      <SpendEntryDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        entry={dialog?.entry ?? null}
        pending={create.isPending || update.isPending}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={t(`${K}spend.confirmDelete.title`)}
        description={t(`${K}spend.confirmDelete.body`, {
          name: toDelete ? entryName(toDelete) : '',
          amount: toDelete ? money(toDelete.amountMinorUnits) : '',
        })}
        confirmLabel={t(`${K}common.delete`)}
        destructive
        pending={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              notifySuccess(`${K}spend.toasts.deleted`);
              setToDelete(null);
            },
            onError: fail,
          });
        }}
      />
    </div>
  );
}
