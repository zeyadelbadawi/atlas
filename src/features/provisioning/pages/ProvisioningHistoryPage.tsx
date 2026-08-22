/**
 * Provisioning History Page.
 *
 * Lets a Tenant Owner who left mid-flow find a request again, and see
 * every Academy provisioning attempt for their organization.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useProvisioningRequests } from '../hooks';
import { getProvisioningStatusTone } from '../utils/provisioning-status.utils';
import type { ProvisioningRequest } from '@types';

export default function ProvisioningHistoryPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: requestsData,
    isLoading,
    error,
    refetch,
  } = useProvisioningRequests({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    },
  });

  useEffect(() => {
    if (requestsData) setTotalItems(requestsData.pagination.totalItems);
  }, [requestsData]);

  const requests = requestsData?.items ?? [];

  const columns = useMemo<ColumnDef<ProvisioningRequest, unknown>[]>(
    () => [
      {
        accessorKey: 'requestedAcademyName',
        header: t('provisioning:history.table.academyName'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.requestedAcademyName}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('provisioning:history.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`provisioning:status.lifecycle.${row.original.status}`}
            tone={getProvisioningStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'attemptCount',
        header: t('provisioning:history.table.attempts'),
        cell: ({ row }) => (
          <span data-atlas-numeric="true">{row.original.attemptCount}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('provisioning:history.table.createdAt'),
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
        titleKey="provisioning:history.title"
        descriptionKey="provisioning:history.subtitle"
        actions={
          <Button
            type="button"
            onClick={() => navigate(DASHBOARD_ROUTES.provisioningNew)}
          >
            {t('provisioning:history.newAcademyAction')}
          </Button>
        }
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
              data={requests}
              isLoading={isLoading}
              pagination={pagination}
              emptyTitleKey="provisioning:history.emptyState"
              emptyDescriptionKey="provisioning:history.emptyStateDescription"
              emptyAction={{
                labelKey: 'provisioning:history.newAcademyAction',
                onAction: () => navigate(DASHBOARD_ROUTES.provisioningNew),
              }}
              getRowId={(request) => request.id}
              onRowSelect={(request) =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.provisioningStatus, {
                    requestId: request.id,
                  })
                )
              }
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
