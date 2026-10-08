/**
 * One Customer Request in the Platform Owner console
 * (`/dashboard/platform/customer-requests/:requestId` — where the
 * request's team emails and console notifications link).
 *
 * Everything the requester sees, plus what only the team needs: who
 * asked (name, email, organization, academy), where the request's emails
 * go (its type's team inbox, or every Platform Owner when none is set),
 * the assignee, the status control limited to the allowed moves, the
 * full history including internal notes and assignments, and a composer
 * that makes "reply to customer" and "internal note" impossible to mix up.
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { CR_NS } from '../constants/customer-request.constants';
import {
  usePlatformCustomerRequest,
  usePlatformCustomerRequestAssignees,
} from '../hooks';
import {
  customerRequestStatusLabelKey,
  customerRequestStatusTone,
} from '../utils/customer-request.utils';
import { CustomerRequestSummary } from '../components/CustomerRequestSummary';
import { CustomerRequestBrief } from '../components/CustomerRequestBrief';
import { CustomerRequestTimeline } from '../components/CustomerRequestTimeline';
import { PlatformRequestManagePanel } from '../components/PlatformRequestManagePanel';
import { PlatformRequestComposer } from '../components/PlatformRequestComposer';

export default function PlatformCustomerRequestDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { requestId } = useParams<{ requestId: string }>();
  const detailQuery = usePlatformCustomerRequest(requestId);
  const assigneesQuery = usePlatformCustomerRequestAssignees();

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformCustomerRequests',
      path: DASHBOARD_ROUTES.platformCustomerRequests,
    },
    { labelKey: `${CR_NS}:platform.detail.breadcrumb` },
  ];

  if (detailQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  const request = detailQuery.data;
  if (detailQuery.error || !request) {
    return (
      <PageContainer>
        <PageHeader
          titleKey={`${CR_NS}:platform.detail.breadcrumb`}
          breadcrumbs={breadcrumbs}
        />
        <ErrorState
          kind={detailQuery.error?.kind}
          onRetry={() => void detailQuery.refetch()}
          headingLevel="h2"
        />
      </PageContainer>
    );
  }

  const P = `${CR_NS}:platform.detail`;

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${P}.breadcrumb`}
        title={request.title}
        breadcrumbs={breadcrumbs}
        actions={
          <StatusBadge
            labelKey={customerRequestStatusLabelKey(request.status)}
            tone={customerRequestStatusTone(request.status)}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="p-6">
              <CustomerRequestBrief
                type={request.type}
                description={request.description}
                details={request.details}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">
                {t(`${CR_NS}:detail.timeline`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <CustomerRequestTimeline events={request.events} showInternal />
              <div className="border-t border-border pt-4">
                <PlatformRequestComposer request={request} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">
                {t(`${P}.manage`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformRequestManagePanel
                request={request}
                assignees={assigneesQuery.data ?? []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">
                {t(`${CR_NS}:detail.summary`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerRequestSummary
                request={request}
                extraFacts={[
                  {
                    id: 'academy',
                    label: t(`${P}.academy`),
                    value: <span dir="auto">{request.academy.name}</span>,
                  },
                  {
                    id: 'organization',
                    label: t(`${P}.organization`),
                    value: <span dir="auto">{request.organization.name}</span>,
                  },
                  {
                    id: 'requester',
                    label: t(`${P}.requester`),
                    value: <span dir="auto">{request.requester.name}</span>,
                  },
                  {
                    id: 'requesterEmail',
                    label: t(`${P}.requesterEmail`),
                    value: (
                      <a
                        href={`mailto:${request.requesterEmail}`}
                        className="text-primary underline-offset-4 hover:underline"
                        dir="ltr"
                      >
                        {request.requesterEmail}
                      </a>
                    ),
                  },
                  {
                    id: 'routedTo',
                    label: t(`${P}.routedTo`),
                    value: request.routedTo ? (
                      <span dir="ltr" data-testid="customer-request-routed-to">
                        {request.routedTo}
                      </span>
                    ) : (
                      <Link
                        to={DASHBOARD_ROUTES.platformCustomerRequestRouting}
                        className="text-primary underline-offset-4 hover:underline"
                        data-testid="customer-request-routed-to"
                      >
                        {t(`${P}.allPlatformOwners`)}
                      </Link>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
