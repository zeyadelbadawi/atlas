/**
 * Platform Support Operations — List Page (Prompt 13).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination, useSearch } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useSupportCases } from '../hooks';
import { getSupportCasePriorityTone, getSupportCaseStatusTone } from '../utils/support-status.utils';
import type { SupportCaseStatus, SupportCaseSummary } from '@types';

const STATUS_FILTER_VALUES: readonly SupportCaseStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export default function PlatformSupportListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery } = useSearch({
    debounceMs: 300,
  });
  const [statusFilter, setStatusFilter] = useState<SupportCaseStatus | 'all'>('all');

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: casesData,
    isLoading,
    error,
    refetch,
  } = useSupportCases({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedQuery || undefined,
      filters: statusFilter !== 'all' ? { status: statusFilter } : undefined,
    },
  });

  useEffect(() => {
    if (casesData) setTotalItems(casesData.pagination.totalItems);
  }, [casesData]);

  const cases = casesData?.items ?? [];

  const columns = useMemo<ColumnDef<SupportCaseSummary, unknown>[]>(
    () => [
      {
        accessorKey: 'subject',
        header: t('support:table.subject'),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.subject}</p>
            <p className="text-xs text-muted-foreground">{row.original.requesterName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('support:table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`support:status.${row.original.status}`}
            tone={getSupportCaseStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'priority',
        header: t('support:table.priority'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`support:priority.${row.original.priority}`}
            tone={getSupportCasePriorityTone(row.original.priority)}
          />
        ),
      },
      {
        accessorKey: 'organizationName',
        header: t('support:table.organization'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.organizationName ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: t('support:table.updatedAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleDateString(i18n.language)}
          </span>
        ),
      },
    ],
    [t, i18n.language]
  );

  return (
    <PageContainer>
      <PageHeader titleKey="support:title" descriptionKey="support:subtitle" />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('support:searchPlaceholder')}
            className="max-w-sm"
            aria-label={t('support:searchPlaceholder')}
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as SupportCaseStatus | 'all')}
          >
            <SelectTrigger className="w-44" aria-label={t('support:table.status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('support:filters.allStatuses')}</SelectItem>
              {STATUS_FILTER_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`support:status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="p-6">
                <ErrorState onRetry={() => refetch()} />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={cases}
                isLoading={isLoading}
                pagination={pagination}
                emptyTitleKey="support:emptyState"
                emptyDescriptionKey="support:emptyStateDescription"
                getRowId={(supportCase) => supportCase.id}
                onRowSelect={(supportCase) =>
                  navigate(buildPath(DASHBOARD_ROUTES.platformSupportDetail, { caseId: supportCase.id }))
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
