/**
 * Platform User — List Page (Prompt 13).
 *
 * The Platform Owner's cross-tenant user directory — read-only, per
 * `platform-user.types.ts`'s doc comment. Mirrors
 * `PlatformOrganizationListPage` exactly. No email is ever used as a
 * navigable link or exposed beyond this read-only listing.
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
import { usePlatformUsers } from '../hooks';
import { getPlatformUserStatusTone } from '../utils/platform-status.utils';
import type { PlatformUserSummary } from '@types';

export default function PlatformUserListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery } = useSearch({
    debounceMs: 300,
  });

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = usePlatformUsers({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedQuery || undefined,
    },
  });

  useEffect(() => {
    if (usersData) setTotalItems(usersData.pagination.totalItems);
  }, [usersData]);

  const users = usersData?.items ?? [];

  const columns = useMemo<ColumnDef<PlatformUserSummary, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('platform:users.table.name'),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('platform:users.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`platform:users.status.${row.original.status}`}
            tone={getPlatformUserStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'organizationCount',
        header: t('platform:users.table.organizations'),
        cell: ({ row }) => <span data-atlas-numeric="true">{row.original.organizationCount}</span>,
      },
      {
        accessorKey: 'lastSignInAt',
        header: t('platform:users.table.lastSignIn'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.lastSignInAt
              ? new Date(row.original.lastSignInAt).toLocaleDateString(i18n.language)
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('platform:users.table.createdAt'),
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
      <PageHeader titleKey="platform:users.title" descriptionKey="platform:users.subtitle" />

      <div className="space-y-4">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('platform:users.searchPlaceholder')}
          className="max-w-sm"
          aria-label={t('platform:users.searchPlaceholder')}
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
                data={users}
                isLoading={isLoading}
                pagination={pagination}
                emptyTitleKey="platform:users.emptyState"
                emptyDescriptionKey="platform:users.emptyStateDescription"
                getRowId={(user) => user.id}
                onRowSelect={(user) =>
                  navigate(buildPath(DASHBOARD_ROUTES.platformUserDetail, { userId: user.id }))
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
