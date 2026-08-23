/**
 * Platform Organization — List Page (Prompt 13).
 *
 * The Platform Owner's cross-tenant organization console — read-only,
 * per `platform-organization.types.ts`'s doc comment (no
 * organization-administration mutation is defined by the product
 * specification). Mirrors the `PlatformProvisioningListPage` template
 * exactly: `DataTable` + `usePagination`, real loading/error/empty
 * states, no hardcoded data.
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
import { usePlatformOrganizations } from '../hooks';
import { getPlatformOrganizationStatusTone } from '../utils/platform-status.utils';
import type { PlatformOrganizationSummary } from '@types';

export default function PlatformOrganizationListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery } = useSearch({
    debounceMs: 300,
  });

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: orgsData,
    isLoading,
    error,
    refetch,
  } = usePlatformOrganizations({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedQuery || undefined,
    },
  });

  useEffect(() => {
    if (orgsData) setTotalItems(orgsData.pagination.totalItems);
  }, [orgsData]);

  const organizations = orgsData?.items ?? [];

  const columns = useMemo<ColumnDef<PlatformOrganizationSummary, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('platform:organizations.table.name'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'status',
        header: t('platform:organizations.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`platform:organizations.status.${row.original.status}`}
            tone={getPlatformOrganizationStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'planName',
        header: t('platform:organizations.table.plan'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.planName ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'academyCount',
        header: t('platform:organizations.table.academies'),
        cell: ({ row }) => <span data-atlas-numeric="true">{row.original.academyCount}</span>,
      },
      {
        accessorKey: 'memberCount',
        header: t('platform:organizations.table.members'),
        cell: ({ row }) => <span data-atlas-numeric="true">{row.original.memberCount}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: t('platform:organizations.table.createdAt'),
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
      <PageHeader
        titleKey="platform:organizations.title"
        descriptionKey="platform:organizations.subtitle"
      />

      <div className="space-y-4">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('platform:organizations.searchPlaceholder')}
          className="max-w-sm"
          aria-label={t('platform:organizations.searchPlaceholder')}
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
                data={organizations}
                isLoading={isLoading}
                pagination={pagination}
                emptyTitleKey="platform:organizations.emptyState"
                emptyDescriptionKey="platform:organizations.emptyStateDescription"
                getRowId={(organization) => organization.id}
                onRowSelect={(organization) =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.platformOrganizationDetail, {
                      organizationId: organization.id,
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
