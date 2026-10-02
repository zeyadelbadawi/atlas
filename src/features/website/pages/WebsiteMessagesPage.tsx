/**
 * Website Messages Page — the Academy's Contact form inbox.
 *
 * Every message a visitor sends through the Academy's public website
 * Contact form (`ContactSection`) is persisted server-side as a
 * `ContactSubmission`. Until this page there was nowhere in the dashboard
 * to read them. Owners/Managers (`academy.website.manage`) can now search,
 * filter by status and received date, sort, page, and open a message in a
 * side sheet to read it in full, reply by email, mark it read/unread,
 * archive or restore it.
 *
 * ALL FILTERING IS SERVER-SIDE and lives in the URL
 * (`useContactSubmissionFilters`) — the page only ever holds one page of
 * rows, so filtering them locally would narrow the current twenty rather
 * than the real result set. Status counts come from the separate,
 * filter-independent summary endpoint.
 *
 * Opening a `new` message marks it read (one PATCH); every status change
 * refreshes the lists and the counts (`useUpdateContactSubmissionStatus`).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Inbox, SearchX, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Pagination, StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { SectionTabs } from '@components/navigation';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@app/providers';
import {
  useDateFormatter,
  useLanguage,
  usePagination,
  usePermissions,
} from '@hooks';
import { cn, formatNumber, toTranslationKey } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { ApiError } from '@api';
import type {
  BreadcrumbItem,
  ContactSubmission,
  ContactSubmissionStatus,
} from '@types';
import {
  toContactSubmissionListQuery,
  useContactSubmissionFilters,
  useContactSubmissionSummary,
  useContactSubmissions,
  useUpdateContactSubmissionStatus,
} from '../hooks';
import { ContactSubmissionsToolbar } from '../components/ContactSubmissionsToolbar';
import { ContactSubmissionSheet } from '../components/ContactSubmissionSheet';
import { getWebsiteTabs } from '../utils/website-navigation.utils';
import {
  getContactSubmissionStatusLabelKey,
  getContactSubmissionStatusTone,
  getStatusChangeToastKey,
  toMessageExcerpt,
} from '../utils/contact-submission.utils';

const TABLE_COLUMN_COUNT = 5;

export default function WebsiteMessagesPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();
  const { notify, notifySuccess, notifyError } = useToast();

  const {
    filters,
    hasFilters,
    setSearch,
    setStatus,
    setFrom,
    setTo,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
  } = useContactSubmissionFilters();

  const query = useMemo(() => toContactSubmissionListQuery(filters), [filters]);
  const listQuery = useContactSubmissions(academyId, { query });
  const summaryQuery = useContactSubmissionSummary(academyId);
  const updateStatus = useUpdateContactSubmissionStatus();

  const totalItems = listQuery.data?.pagination.totalItems ?? 0;
  const pagination = usePagination({
    totalItems,
    page: filters.page,
    pageSize: filters.pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  // A restored URL (or the last message on the last page being archived)
  // can point past the end of the result set: land on the real last page
  // instead of an empty table.
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

  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ContactSubmissionStatus>();

  /** The backend's specific error sentence, when there is copy for it. */
  const errorDescriptionKey = (error: ApiError): string | undefined => {
    const key = toTranslationKey(error.messageKey);
    if (i18n.exists(`${key}.description`)) return `${key}.description`;
    if (!i18n.exists(key)) return undefined;
    const copy: unknown = t(key, { returnObjects: true });
    return typeof copy === 'string' ? key : undefined;
  };

  const changeStatus = (
    submission: ContactSubmission,
    status: ContactSubmissionStatus,
    { silent = false }: { readonly silent?: boolean } = {}
  ): void => {
    setPendingStatus(status);
    updateStatus.mutate(
      { academyId, submissionId: submission.id, status },
      {
        onSuccess: (updated) => {
          setSelected((current) =>
            current?.id === submission.id ? updated : current
          );
          if (silent) return;
          const titleKey = getStatusChangeToastKey(submission.status, status);
          if (status === 'archived') {
            // Reversible, so no confirmation up front — Undo instead.
            notify({
              intent: 'success',
              titleKey,
              action: {
                labelKey: 'website:messages.toasts.undo',
                onAction: () =>
                  changeStatus(updated, submission.status, { silent: true }),
              },
            });
          } else {
            notifySuccess(titleKey);
          }
        },
        onError: (error) =>
          notifyError(
            'website:messages.toasts.failed',
            errorDescriptionKey(error)
          ),
        onSettled: () => setPendingStatus(undefined),
      }
    );
  };

  const openSubmission = (submission: ContactSubmission) => {
    setSelected(submission);
    setIsSheetOpen(true);
    // Opening a message is reading it — one PATCH, no toast.
    if (submission.status === 'new') {
      changeStatus(submission, 'read', { silent: true });
    }
  };

  const columns = useMemo<ColumnDef<ContactSubmission, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('website:messages.table.name'),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={cn(
              'block max-w-[14rem] truncate text-foreground',
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
        header: t('website:messages.table.email'),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={cn(
              'block max-w-[16rem] truncate',
              row.original.status === 'new'
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground'
            )}
            dir="auto"
          >
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: 'message',
        header: t('website:messages.table.message'),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={cn(
              'block max-w-[18rem] truncate xl:max-w-[26rem]',
              row.original.status === 'new'
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            )}
            dir="auto"
          >
            {toMessageExcerpt(row.original.message)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('website:messages.table.status'),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            labelKey={getContactSubmissionStatusLabelKey(row.original.status)}
            tone={getContactSubmissionStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('website:messages.table.received'),
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
      labelKey: 'navigation:items.academyOverview',
      path: DASHBOARD_ROUTES.academy,
    },
    {
      labelKey: 'website:overview.title',
      path: buildPath(DASHBOARD_ROUTES.websiteOverview, { academyId }),
    },
    { labelKey: 'website:messages.title' },
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
              titleKey="website:messages.noResults.title"
              descriptionKey="website:messages.noResults.description"
              primaryAction={{
                labelKey: 'website:messages.filters.clear',
                onAction: clearFilters,
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              titleKey="website:messages.empty.title"
              descriptionKey="website:messages.empty.description"
            />
          )}
        </div>
      );
    }

    return (
      <>
        {/* Wide screens: the shared data table. */}
        <section
          aria-label={t('website:messages.table.caption')}
          className="hidden md:block"
        >
          <DataTable
            columns={columns}
            data={submissions}
            getRowId={(submission) => submission.id}
            onRowSelect={openSubmission}
          />
        </section>

        {/* Narrow screens: one card per message. */}
        <ul
          aria-label={t('website:messages.table.caption')}
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
                      labelKey={getContactSubmissionStatusLabelKey(
                        submission.status
                      )}
                      tone={getContactSubmissionStatusTone(submission.status)}
                      className="shrink-0"
                    />
                  </span>
                  <span
                    className="block truncate text-xs text-muted-foreground"
                    dir="auto"
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
                    {toMessageExcerpt(submission.message)}
                  </span>
                  <time
                    dateTime={submission.createdAt}
                    className="block text-xs text-muted-foreground"
                  >
                    {fmt.date(submission.createdAt)}
                  </time>
                </button>
              </li>
            );
          })}
        </ul>

        <Pagination
          pagination={pagination}
          summary={t('website:messages.resultRange', {
            count: pagination.totalItems,
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
        titleKey="website:messages.title"
        descriptionKey="website:messages.subtitle"
        breadcrumbs={breadcrumbs}
        actions={
          newCount > 0 ? (
            <StatusBadge
              labelKey="website:messages.newCount"
              tone="info"
              values={{
                count: newCount,
                formatted: formatNumber(newCount, language),
              }}
            />
          ) : undefined
        }
      />

      <SectionTabs
        items={getWebsiteTabs(academyId, {
          canManage: hasPermission('academy.website.manage'),
        })}
      />

      <div className="space-y-4">
        <ContactSubmissionsToolbar
          filters={filters}
          hasFilters={hasFilters}
          summary={summaryQuery.data}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onFromChange={setFrom}
          onToChange={setTo}
          onSortChange={setSort}
          onClearFilters={clearFilters}
        />

        <Card>
          <CardContent className="p-0">{renderBody()}</CardContent>
        </Card>
      </div>

      <ContactSubmissionSheet
        submission={selected}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onChangeStatus={(submission, status) =>
          changeStatus(submission, status)
        }
        pendingStatus={pendingStatus}
      />
    </PageContainer>
  );
}
