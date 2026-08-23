/**
 * Platform Academy — List Page (Prompt 13).
 *
 * The Platform Owner's cross-tenant academy console — read-only, per
 * `platform-academy.types.ts`'s doc comment. Mirrors
 * `PlatformOrganizationListPage` exactly.
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
import { usePagination, useSearch } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { usePlatformAcademies } from '../hooks';
import { getPlatformAcademyStatusTone } from '../utils/platform-status.utils';
import type { PlatformAcademySummary } from '@types';

export default function PlatformAcademyListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery } = useSearch({
    debounceMs: 300,
  });

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: academiesData,
    isLoading,
    error,
    refetch,
  } = usePlatformAcademies({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedQuery || undefined,
    },
  });

  useEffect(() => {
    if (academiesData) setTotalItems(academiesData.pagination.totalItems);
  }, [academiesData]);

  const academies = academiesData?.items ?? [];

  const columns = useMemo<ColumnDef<PlatformAcademySummary, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('platform:academies.table.name'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'organizationName',
        header: t('platform:academies.table.organization'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.organizationName}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('platform:academies.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`platform:academies.status.${row.original.status}`}
            tone={getPlatformAcademyStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'courseCount',
        header: t('platform:academies.table.courses'),
        cell: ({ row }) => <span data-atlas-numeric="true">{row.original.courseCount}</span>,
      },
      {
        accessorKey: 'memberCount',
        header: t('platform:academies.table.members'),
        cell: ({ row }) => <span data-atlas-numeric="true">{row.original.memberCount}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: t('platform:academies.table.createdAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString(i18n.language)}
          </span>
        ),
      },
    ],
    [t, i18n.language]
  );

  return (
    <PageContainer>
      <PageHeader titleKey="platform:academies.title" descriptionKey="platform:academies.subtitle" />

      <div className="space-y-4">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('platform:academies.searchPlaceholder')}
          className="max-w-sm"
          aria-label={t('platform:academies.searchPlaceholder')}
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
                data={academies}
                isLoading={isLoading}
                pagination={pagination}
                emptyTitleKey="platform:academies.emptyState"
                emptyDescriptionKey="platform:academies.emptyStateDescription"
                getRowId={(academy) => academy.id}
                onRowSelect={(academy) =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.platformAcademyDetail, {
                      academyId: academy.id,
                    })
                  )
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
