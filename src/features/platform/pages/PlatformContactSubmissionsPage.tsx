/**
 * Platform Contact Submissions Page — the Platform Owner's inbox for the
 * Atlas marketing homepage's contact form (TASK 7,
 * `/dashboard/platform/contact-submissions`).
 *
 * Every enquiry a visitor sends from `MarketingContactSection` is stored
 * server-side (`platform_contact_submissions`) and readable here only by a
 * Platform Owner — the route guard hides the page, the API's guard stack
 * and RLS are the actual control.
 *
 * ALL FILTERING IS SERVER-SIDE and lives in the URL
 * (`usePlatformContactSubmissionFilters`); the counts come from the
 * separate, filter-independent summary endpoint.
 *
 * Opening a `new` enquiry marks it read (one PATCH). Archive is reversible
 * (Undo toast, no confirmation); Delete is permanent and always confirmed
 * first in an alert dialog. Every status change and delete is audited
 * server-side. After a delete, focus moves to the results card (the row
 * that opened the sheet is gone) instead of falling back to the body.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Inbox, SearchX, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Pagination, StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@app/providers';
import { useDateFormatter, useLanguage, usePagination } from '@hooks';
import { cn, formatNumber } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  toPlatformContactListQuery,
  usePlatformContactSubmissionFilters,
} from '../hooks/usePlatformContactSubmissionFilters';
import {
  useDeletePlatformContactSubmission,
  usePlatformContactSubmissionSummary,
  usePlatformContactSubmissions,
  useUpdatePlatformContactSubmissionStatus,
} from '../hooks/usePlatformContactSubmissions';
import { PlatformContactSubmissionsToolbar } from '../components/PlatformContactSubmissionsToolbar';
import { PlatformContactSubmissionSheet } from '../components/PlatformContactSubmissionSheet';
import type {
  PlatformContactSubmission,
  PlatformContactSubmissionStatus,
} from '../services/PlatformContactSubmissionService';
import {
  contactStatusLabelKey,
  contactStatusToastKey,
  contactStatusTone,
  contactTopicLabelKey,
  toContactExcerpt,
} from '../utils/platform-contact-submission.utils';

const TABLE_COLUMN_COUNT = 6;
const K = 'platform:contactSubmissions';

export default function PlatformContactSubmissionsPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { notify, notifySuccess, notifyError } = useToast();

  const {
    filters,
    hasFilters,
    setSearch,
    setStatus,
    setTopic,
    setFrom,
    setTo,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
  } = usePlatformContactSubmissionFilters();

  const query = useMemo(() => toPlatformContactListQuery(filters), [filters]);
  const listQuery = usePlatformContactSubmissions(query);
  const summaryQuery = usePlatformContactSubmissionSummary();
  const updateStatus = useUpdatePlatformContactSubmissionStatus();
  const deleteSubmission = useDeletePlatformContactSubmission();

  const totalItems = listQuery.data?.pagination.totalItems ?? 0;
  const pagination = usePagination({
    totalItems,
    page: filters.page,
    pageSize: filters.pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  // A restored URL (or deleting the last row of the last page) can point
  // past the end: land on the real last page instead of an empty table.
  useEffect(() => {
    if (!listQuery.data || listQuery.isPlaceholderData) return;
    const total = listQuery.data.pagination.totalItems;
    const lastPage = Math.max(1, Math.ceil(total / filters.pageSize));
    if (total > 0 && filters.page > lastPage) setPage(lastPage);
  }, [
    listQuery.data,
    listQuery.isPlaceholderData,
    filters.page,
    filters.pageSize,
    setPage,
  ]);

  const [selected, setSelected] = useState<PlatformContactSubmission | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingStatus, setPendingStatus] =
    useState<PlatformContactSubmissionStatus>();
  const [toDelete, setToDelete] = useState<PlatformContactSubmission | null>(
    null
  );
  const resultsRef = useRef<HTMLDivElement>(null);
  /** Set by a successful delete; the closing sheet and dialog then focus the results. */
  const focusResultsOnClose = useRef(false);
  const restoreFocusAfterDelete = (event: Event) => {
    if (!focusResultsOnClose.current) return;
    event.preventDefault();
    resultsRef.current?.focus({ preventScroll: true });
  };

  const changeStatus = (
    submission: PlatformContactSubmission,
    status: PlatformContactSubmissionStatus,
    { silent = false }: { readonly silent?: boolean } = {}
  ): void => {
    setPendingStatus(status);
    updateStatus.mutate(
      { id: submission.id, status },
      {
        onSuccess: (updated) => {
          setSelected((current) =>
            current?.id === submission.id ? updated : current
          );
          if (silent) return;
          const titleKey = contactStatusToastKey(submission.status, status);
          if (status === 'archived') {
            notify({
              intent: 'success',
              titleKey,
              action: {
                labelKey: `${K}.toasts.undo`,
                onAction: () =>
                  changeStatus(updated, submission.status, { silent: true }),
              },
            });
          } else {
            notifySuccess(titleKey);
          }
        },
        onError: () => notifyError(`${K}.toasts.failed`),
        onSettled: () => setPendingStatus(undefined),
      }
    );
  };

  const openSubmission = (submission: PlatformContactSubmission) => {
    focusResultsOnClose.current = false;
    setSelected(submission);
    setIsSheetOpen(true);
    // Opening an enquiry is reading it — one PATCH, no toast.
    if (submission.status === 'new') {
      changeStatus(submission, 'read', { silent: true });
    }
  };

  const confirmDelete = () => {
    const target = toDelete;
    if (!target) return;
    deleteSubmission.mutate(target.id, {
      onSuccess: () => {
        focusResultsOnClose.current = true;
        setToDelete(null);
        setIsSheetOpen(false);
        setSelected((current) => (current?.id === target.id ? null : current));
        notifySuccess(`${K}.toasts.deleted`);
      },
      onError: () => {
        setToDelete(null);
        notifyError(`${K}.toasts.deleteFailed`);
      },
    });
  };

  const columns = useMemo<ColumnDef<PlatformContactSubmission, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t(`${K}.table.name`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={cn(
              'block max-w-[12rem] truncate text-foreground',
              row.original.status === 'new' && 'font-semibold'
            )}
            dir="auto"
          >
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: t(`${K}.table.email`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="block max-w-[14rem] truncate text-muted-foreground"
            dir="ltr"
            data-ltr-content
          >
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: 'organizationName',
        header: t(`${K}.table.organization`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="block max-w-[12rem] truncate text-muted-foreground"
            dir="auto"
          >
            {row.original.organizationName ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'topic',
        header: t(`${K}.table.topic`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {t(contactTopicLabelKey(row.original.topic))}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t(`${K}.table.status`),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            labelKey={contactStatusLabelKey(row.original.status)}
            tone={contactStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t(`${K}.table.received`),
        enableSorting: false,
        cell: ({ row }) => (
          <time
            dateTime={row.original.createdAt}
            className="whitespace-nowrap text-muted-foreground"
          >
            {fmt.date(row.original.createdAt)}
          </time>
        ),
      },
    ],
    [t, fmt]
  );

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    { labelKey: `${K}.title` },
  ];

  const newCount = summaryQuery.data?.new ?? 0;
  const submissions = listQuery.data?.items ?? [];

  const renderBody = (): JSX.Element => {
    if (listQuery.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={listQuery.error.kind}
            onRetry={() => {
              void listQuery.refetch();
              void summaryQuery.refetch();
            }}
          />
        </div>
      );
    }

    if (listQuery.isLoading) {
      return (
        <div aria-busy="true" className="p-4">
          <SkeletonTable columns={TABLE_COLUMN_COUNT} />
        </div>
      );
    }

    if (submissions.length === 0) {
      return (
        <div className="p-4">
          {hasFilters ? (
            <EmptyState
              icon={SearchX}
              titleKey={`${K}.noResults.title`}
              descriptionKey={`${K}.noResults.description`}
              primaryAction={{
                labelKey: `${K}.filters.clear`,
                onAction: clearFilters,
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              titleKey={`${K}.empty.title`}
              descriptionKey={`${K}.empty.description`}
            />
          )}
        </div>
      );
    }

    return (
      <>
        <section
          aria-label={t(`${K}.table.caption`)}
          className="hidden md:block"
        >
          <DataTable
            columns={columns}
            data={submissions}
            getRowId={(submission) => submission.id}
            onRowSelect={openSubmission}
          />
        </section>

        <ul
          aria-label={t(`${K}.table.caption`)}
          className="divide-y divide-border md:hidden"
        >
          {submissions.map((submission) => {
            const isNew = submission.status === 'new';
            return (
              <li key={submission.id}>
                <button
                  type="button"
                  onClick={() => openSubmission(submission)}
                  className="block w-full space-y-1.5 p-4 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        'min-w-0 truncate text-sm text-foreground',
                        isNew ? 'font-semibold' : 'font-medium'
                      )}
                      dir="auto"
                    >
                      {submission.name}
                    </span>
                    <StatusBadge
                      labelKey={contactStatusLabelKey(submission.status)}
                      tone={contactStatusTone(submission.status)}
                      className="shrink-0"
                    />
                  </span>
                  <span
                    className="block truncate text-xs text-muted-foreground"
                    dir="ltr"
                    data-ltr-content
                  >
                    {submission.email}
                  </span>
                  <span
                    className={cn(
                      'block truncate text-sm',
                      isNew ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    dir="auto"
                  >
                    {toContactExcerpt(submission.message)}
                  </span>
                  <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{t(contactTopicLabelKey(submission.topic))}</span>
                    <time dateTime={submission.createdAt}>
                      {fmt.date(submission.createdAt)}
                    </time>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Pagination
          pagination={pagination}
          summary={t(`${K}.resultRange`, {
            from: formatNumber(pagination.rangeStart, language),
            to: formatNumber(pagination.rangeEnd, language),
            total: formatNumber(pagination.totalItems, language),
          })}
        />
      </>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}.title`}
        descriptionKey={`${K}.subtitle`}
        breadcrumbs={breadcrumbs}
        actions={
          newCount > 0 ? (
            <StatusBadge
              labelKey={`${K}.newCount`}
              tone="info"
              values={{ formatted: formatNumber(newCount, language) }}
            />
          ) : undefined
        }
      />

      <div className="space-y-4">
        <PlatformContactSubmissionsToolbar
          filters={filters}
          hasFilters={hasFilters}
          summary={summaryQuery.data}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onTopicChange={setTopic}
          onFromChange={setFrom}
          onToChange={setTo}
          onSortChange={setSort}
          onClearFilters={clearFilters}
        />

        <Card
          ref={resultsRef}
          tabIndex={-1}
          className="focus-visible:outline-none"
        >
          <CardContent className="p-0">{renderBody()}</CardContent>
        </Card>
      </div>

      <PlatformContactSubmissionSheet
        submission={selected}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onChangeStatus={(submission, status) =>
          changeStatus(submission, status)
        }
        onRequestDelete={setToDelete}
        pendingStatus={pendingStatus}
        isDeleting={deleteSubmission.isPending}
        onCloseAutoFocus={restoreFocusAfterDelete}
      />

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteSubmission.isPending) setToDelete(null);
        }}
      >
        <AlertDialogContent onCloseAutoFocus={restoreFocusAfterDelete}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(`${K}.deleteDialog.title`)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(`${K}.deleteDialog.description`, {
                name: toDelete?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmission.isPending}>
              {t(`${K}.deleteDialog.cancel`)}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSubmission.isPending}
              onClick={(event) => {
                // Keep the dialog open until the request settles.
                event.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t(`${K}.deleteDialog.confirm`)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
