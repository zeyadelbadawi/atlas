/**
 * B3 — Launch checklist (`/dashboard/platform/launch-checklist`).
 *
 * Items grouped by section, in their saved order, with a progress bar.
 * Ticking an item is optimistic (rolled back on failure); the server stamps
 * who ticked it and when. Reordering is by the Move up / Move down buttons
 * on each item (keyboard and single-pointer operable, WCAG 2.5.7): the move
 * is announced and the full new order is sent to `/reorder`.
 *
 * The route guard hides the page; `PlatformOwnerGuard` + RLS on the API are
 * the actual control.
 */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@app/providers';
import { useDateFormatter, useLanguage } from '@hooks';
import { cn, formatNumber, toErrorsNamespaceKey } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useLaunchChecklist,
  useReorderChecklist,
  useUpdateChecklistItem,
} from '../hooks/useLaunchChecklist';
import {
  CHECKLIST_SECTIONS,
  type ChecklistItemWritePayload,
  type ChecklistSection,
  type LaunchChecklistItem,
} from '../types';
import { K, isStaleError } from '../utils/launch.utils';
import { ProgressBar } from '../components/fields';
import { ChecklistItemDialog } from '../components/ChecklistItemDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';

/** Items in saved order. */
function ordered(items: readonly LaunchChecklistItem[]): LaunchChecklistItem[] {
  return [...items].sort((a, b) => a.position - b.position);
}

/**
 * The full id order after moving `id` one step within its section
 * (swapping with the nearest item of the same section).
 */
export function moveWithinSection(
  items: readonly LaunchChecklistItem[],
  id: string,
  direction: -1 | 1
): string[] | null {
  const list = ordered(items);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const section = list[index].section;
  let target = index + direction;
  while (
    target >= 0 &&
    target < list.length &&
    list[target].section !== section
  )
    target += direction;
  if (target < 0 || target >= list.length) return null;
  const ids = list.map((item) => item.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
}

/** Internal links stay in the app; anything else opens a new tab. */
function ItemLink({
  href,
  label,
  accessibleName,
}: {
  href: string;
  label: string;
  accessibleName: string;
}) {
  const className =
    'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline';
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className} aria-label={accessibleName}>
        {label}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={accessibleName}
    >
      {label}
      <ExternalLink className="size-3.5 rtl:-scale-x-100" aria-hidden />
    </a>
  );
}

export default function PlatformLaunchChecklistPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { notifySuccess, notifyError } = useToast();
  const checklist = useLaunchChecklist();
  const create = useCreateChecklistItem();
  const update = useUpdateChecklistItem();
  const remove = useDeleteChecklistItem();
  const reorder = useReorderChecklist();

  const [dialog, setDialog] = useState<{
    readonly item: LaunchChecklistItem | null;
    readonly section: ChecklistSection;
  } | null>(null);
  const [toDelete, setToDelete] = useState<LaunchChecklistItem | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const moveButtons = useRef(new Map<string, HTMLButtonElement | null>());

  const items = useMemo(
    () => ordered(checklist.data?.items ?? []),
    [checklist.data?.items]
  );
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const n = (value: number) => formatNumber(value, language);

  const fail = (error: { messageKey?: string; status?: number }) => {
    if (isStaleError(error)) {
      notifyError(`${K}common.conflictTitle`, `${K}common.conflictBody`);
      void checklist.refetch();
      return;
    }
    notifyError(
      `${K}common.toasts.failed`,
      error.messageKey ? toErrorsNamespaceKey(error.messageKey) : undefined
    );
  };

  const toggle = (item: LaunchChecklistItem, next: boolean) =>
    update.mutate(
      { id: item.id, payload: { done: next, version: item.version } },
      { onError: fail }
    );

  const move = (item: LaunchChecklistItem, direction: -1 | 1) => {
    const ids = moveWithinSection(items, item.id, direction);
    if (!ids) return;
    const sectionIds = ids.filter(
      (id) => items.find((entry) => entry.id === id)?.section === item.section
    );
    setAnnouncement(
      t(`${K}checklist.item.moved`, {
        title: item.title,
        position: n(sectionIds.indexOf(item.id) + 1),
      })
    );
    reorder.mutate(ids, {
      onError: () => notifyError(`${K}checklist.toasts.reorderFailed`),
    });
    // Keep focus on the control the user pressed (it moved with its row).
    requestAnimationFrame(() =>
      moveButtons.current.get(`${item.id}:${direction}`)?.focus()
    );
  };

  const submitDialog = (payload: ChecklistItemWritePayload) => {
    if (!dialog) return;
    if (dialog.item) {
      update.mutate(
        {
          id: dialog.item.id,
          payload: { ...payload, version: dialog.item.version },
        },
        {
          onSuccess: () => {
            notifySuccess(`${K}checklist.toasts.saved`);
            setDialog(null);
          },
          onError: fail,
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          notifySuccess(`${K}checklist.toasts.added`);
          setDialog(null);
        },
        onError: fail,
      });
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformLaunch',
      path: DASHBOARD_ROUTES.platformLaunch,
    },
    { labelKey: `${K}checklist.title` },
  ];

  const renderItem = (
    item: LaunchChecklistItem,
    index: number,
    sectionItems: readonly LaunchChecklistItem[]
  ) => {
    const checkboxId = `checklist-${item.id}`;
    return (
      <li key={item.id} className="flex gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-h-11 items-center">
          <Checkbox
            id={checkboxId}
            checked={item.done}
            onCheckedChange={(value) => toggle(item, value === true)}
            aria-label={t(`${K}checklist.item.markDone`, { title: item.title })}
            className="size-5"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1 py-2">
          <label
            htmlFor={checkboxId}
            className={cn(
              'block cursor-pointer font-medium leading-snug text-foreground',
              item.done && 'text-muted-foreground line-through decoration-1'
            )}
            dir="auto"
          >
            {item.title}
          </label>
          {item.description ? (
            <p className="text-sm text-muted-foreground" dir="auto">
              {item.description}
            </p>
          ) : null}
          {item.done && item.doneAt ? (
            <p className="text-xs text-success">
              {item.doneByName
                ? t(`${K}checklist.item.doneBy`, {
                    date: fmt.dateTime(item.doneAt),
                    name: item.doneByName,
                  })
                : t(`${K}checklist.item.doneAt`, {
                    date: fmt.dateTime(item.doneAt),
                  })}
            </p>
          ) : null}
          {item.notes ? (
            <p
              className="whitespace-pre-line rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground"
              dir="auto"
            >
              <span className="sr-only">{t(`${K}checklist.item.notes`)}: </span>
              {item.notes}
            </p>
          ) : null}
          {item.linkUrl ? (
            <ItemLink
              href={item.linkUrl}
              label={t(`${K}checklist.item.open`)}
              accessibleName={t(`${K}checklist.item.openNamed`, {
                title: item.title,
              })}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-0.5 sm:flex-nowrap">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            ref={(node) => moveButtons.current.set(`${item.id}:-1`, node)}
            disabled={index === 0 || reorder.isPending}
            onClick={() => move(item, -1)}
            aria-label={t(`${K}checklist.item.moveUp`, { title: item.title })}
          >
            <ArrowUp className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            ref={(node) => moveButtons.current.set(`${item.id}:1`, node)}
            disabled={index === sectionItems.length - 1 || reorder.isPending}
            onClick={() => move(item, 1)}
            aria-label={t(`${K}checklist.item.moveDown`, { title: item.title })}
          >
            <ArrowDown className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => setDialog({ item, section: item.section })}
            aria-label={t(`${K}checklist.item.edit`, { title: item.title })}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 text-destructive hover:text-destructive"
            onClick={() => setToDelete(item)}
            aria-label={t(`${K}checklist.item.delete`, { title: item.title })}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </li>
    );
  };

  const renderBody = () => {
    if (checklist.error) {
      return (
        <ErrorState
          kind={checklist.error.kind}
          onRetry={() => void checklist.refetch()}
        />
      );
    }
    if (checklist.isLoading) {
      return (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          icon={ListChecks}
          titleKey={`${K}checklist.empty.title`}
          descriptionKey={`${K}checklist.empty.description`}
          primaryAction={{
            labelKey: `${K}checklist.add`,
            onAction: () => setDialog({ item: null, section: 'product' }),
            icon: Plus,
          }}
        />
      );
    }
    return (
      <div className="space-y-6">
        {CHECKLIST_SECTIONS.map((section) => {
          const sectionItems = items.filter((item) => item.section === section);
          if (sectionItems.length === 0) return null;
          const sectionDone = sectionItems.filter((item) => item.done).length;
          const headingId = `checklist-section-${section}`;
          return (
            <section key={section} aria-labelledby={headingId}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2
                  id={headingId}
                  className="font-display text-base font-semibold text-foreground"
                >
                  {t(`${K}checklist.sections.${section}`)}
                </h2>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {t(`${K}checklist.progress`, {
                    done: n(sectionDone),
                    total: n(sectionItems.length),
                  })}
                </span>
              </div>
              <Card>
                <ul className="divide-y divide-border">
                  {sectionItems.map((item, index) =>
                    renderItem(item, index, sectionItems)
                  )}
                </ul>
              </Card>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}checklist.title`}
        descriptionKey={`${K}checklist.subtitle`}
        breadcrumbs={breadcrumbs}
        actions={
          <Button
            type="button"
            onClick={() => setDialog({ item: null, section: 'product' })}
          >
            <Plus className="size-4" aria-hidden />
            {t(`${K}checklist.add`)}
          </Button>
        }
      />
      <div className="space-y-6">
        {total > 0 ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {t(`${K}checklist.progressLabel`)}
                </p>
                <p
                  className="text-2xl font-semibold tabular-nums text-foreground"
                  data-atlas-numeric="true"
                >
                  {t(`${K}checklist.progress`, {
                    done: n(done),
                    total: n(total),
                  })}
                </p>
              </div>
              <ProgressBar
                value={done}
                max={total}
                label={t(`${K}checklist.progressLabel`)}
                valueText={t(`${K}checklist.progress`, {
                  done: n(done),
                  total: n(total),
                })}
              />
            </CardContent>
          </Card>
        ) : null}
        {renderBody()}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <ChecklistItemDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        item={dialog?.item ?? null}
        defaultSection={dialog?.section}
        pending={create.isPending || update.isPending}
        onSubmit={submitDialog}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={t(`${K}checklist.confirmDelete.title`)}
        description={t(`${K}checklist.confirmDelete.body`, {
          title: toDelete?.title ?? '',
        })}
        confirmLabel={t(`${K}common.delete`)}
        destructive
        pending={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              notifySuccess(`${K}checklist.toasts.deleted`);
              setToDelete(null);
            },
            onError: fail,
          });
        }}
      />
    </PageContainer>
  );
}
