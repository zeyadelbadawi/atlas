/**
 * Platform Audit Log — List Page (Prompt 13).
 *
 * The Platform Owner's cross-tenant event feed — read-only. Mirrors the
 * established `DataTable` + `usePagination` + `useSearch` pattern.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePagination, useSearch } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAuditLogEntries } from '../hooks';
import type { AuditLogEntrySummary } from '@types';

export default function PlatformAuditLogListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery } = useSearch({
    debounceMs: 300,
  });

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: entriesData,
    isLoading,
    error,
    refetch,
  } = useAuditLogEntries({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedQuery || undefined,
      sort: { field: 'occurredAt', direction: 'desc' },
    },
  });

  useEffect(() => {
    if (entriesData) setTotalItems(entriesData.pagination.totalItems);
  }, [entriesData]);

  const entries = entriesData?.items ?? [];

  const columns = useMemo<ColumnDef<AuditLogEntrySummary, unknown>[]>(
    () => [
      {
        accessorKey: 'occurredAt',
        header: t('auditLog:table.occurredAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.occurredAt).toLocaleString(i18n.language)}
          </span>
        ),
      },
      {
        accessorKey: 'actor',
        header: t('auditLog:table.actor'),
        cell: ({ row }) => <span className="font-medium">{row.original.actor.name}</span>,
      },
      {
        accessorKey: 'action',
        header: t('auditLog:table.action'),
        cell: ({ row }) => <code className="font-mono text-xs">{row.original.action}</code>,
      },
      {
        accessorKey: 'targetLabel',
        header: t('auditLog:table.target'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.targetLabel ?? row.original.targetId}
          </span>
        ),
      },
      {
        accessorKey: 'organizationName',
        header: t('auditLog:table.organization'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.organizationName ?? '—'}</span>
        ),
      },
    ],
    [t, i18n.language]
  );

  return (
    <PageContainer>
      <PageHeader titleKey="auditLog:title" descriptionKey="auditLog:subtitle" />

      <div className="space-y-4">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('auditLog:searchPlaceholder')}
          className="max-w-sm"
          aria-label={t('auditLog:searchPlaceholder')}
        />

        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="p-6">
                <ErrorState onRetry={() => refetch()} />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={entries}
                isLoading={isLoading}
                pagination={pagination}
                emptyTitleKey="auditLog:emptyState"
                emptyDescriptionKey="auditLog:emptyStateDescription"
                getRowId={(entry) => entry.id}
                onRowSelect={(entry) =>
                  navigate(buildPath(DASHBOARD_ROUTES.platformAuditLogDetail, { eventId: entry.id }))
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
