/**
 * Support Centre — the tenant's own tickets.
 *
 * Deliberately NOT a second support system: it reuses the existing
 * `SupportCase` architecture, the same statuses, and the same backend
 * service the Platform-Owner console uses. What it adds is the half that
 * was missing — a customer could file a ticket and list their tickets,
 * but had no way to open one and read the reply.
 *
 * Every row here is scoped to the signed-in requester by RLS, not by a
 * filter in this page. A colleague in the same organization does not see
 * these tickets either; a support thread is personal.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, Plus } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@hooks';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useMySupportCases } from '../hooks';
import { getSupportCaseStatusTone } from '../utils/support-status.utils';
import { CreateSupportCaseDialog } from '../components/CreateSupportCaseDialog';

export default function SupportCenterPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [isCreateOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useMySupportCases(
    organization?.id
  );
  const cases = data?.items ?? [];

  return (
    <PageContainer>
      <PageHeader
        titleKey="support:center.title"
        descriptionKey="support:center.subtitle"
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            data-testid="open-create-ticket"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('support:center.newTicket')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : cases.length === 0 ? (
        <EmptyState
          titleKey="support:center.emptyTitle"
          descriptionKey="support:center.emptyDescription"
          icon={LifeBuoy}
          primaryAction={{
            labelKey: 'support:center.newTicket',
            onAction: () => setCreateOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="space-y-3">
          {cases.map((supportCase) => (
            <Card
              key={supportCase.id}
              role="button"
              tabIndex={0}
              data-testid={`support-case-${supportCase.id}`}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.supportDetail, {
                    caseId: supportCase.id,
                  })
                )
              }
              onKeyDown={(event) => {
                // Keyboard parity with the click target — a card that is
                // only reachable by mouse is not reachable at all for
                // some people.
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(
                    buildPath(DASHBOARD_ROUTES.supportDetail, {
                      caseId: supportCase.id,
                    })
                  );
                }
              }}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-base">
                    {supportCase.subject}
                  </CardTitle>
                  <CardDescription>
                    {t('support:center.lastActivity', {
                      date: new Date(supportCase.updatedAt).toLocaleString(),
                    })}
                  </CardDescription>
                </div>
                <StatusBadge
                  labelKey={`support:status.${supportCase.status}`}
                  tone={getSupportCaseStatusTone(supportCase.status)}
                />
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {t('support:center.openedOn', {
                    date: new Date(supportCase.createdAt).toLocaleDateString(),
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSupportCaseDialog
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        organizationId={organization?.id}
      />
    </PageContainer>
  );
}
