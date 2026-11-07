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
import { useDateFormatter, usePagination, useSearch } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { usePlatformUsers } from '../hooks';
import { getPlatformUserStatusTone } from '../utils/platform-status.utils';
import type { PlatformUserSummary } from '@types';
import { PhoneNumberDisplay } from '@components/phone';

export default function PlatformUserListPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    debouncedQuery,
  } = useSearch({
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
          // B8 (UX audit) V24 — a long unbroken name or email is cut with
          // an ellipsis (the whole value on hover) instead of pushing every
          // other column off-screen.
          <div className="min-w-0 max-w-[16rem] sm:max-w-xs">
            <p
              className="truncate font-medium"
              dir="auto"
              title={row.original.name}
              data-testid="platform-user-name"
            >
              {row.original.name}
            </p>
            {/* An email is an LTR value: `data-ltr-content` lines it up
                with its column in Arabic (index.css), not flush left. */}
            <p
              className="truncate text-xs text-muted-foreground"
              dir="ltr"
              data-ltr-content
              title={row.original.email}
            >
              {row.original.email}
            </p>
            {row.original.phone ? (
              <PhoneNumberDisplay
                e164={row.original.phone.e164}
                country={row.original.phone.country}
                className="text-xs text-muted-foreground"
              />
            ) : null}
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
        cell: ({ row }) => (
          <span data-atlas-numeric="true">
            {row.original.organizationCount}
          </span>
        ),
      },
      {
        accessorKey: 'lastSignInAt',
        header: t('platform:users.table.lastSignIn'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.lastSignInAt
              ? fmt.date(row.original.lastSignInAt)
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('platform:users.table.createdAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {fmt.date(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t, fmt]
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:users.title"
        descriptionKey="platform:users.subtitle"
      />

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
                  navigate(
                    buildPath(DASHBOARD_ROUTES.platformUserDetail, {
                      userId: user.id,
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
