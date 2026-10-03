/**
 * W3-compose — an academy's Messages page: compose (email and/or in-app),
 * preview with counts, confirm, quota meter and history.
 *
 * Owner/administrator only. The route and nav gate are UX; the server
 * refuses everyone else (403) and checks an ACTIVE membership on an ACTIVE
 * academy before every preview, send and read.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { MessageComposer } from '../components/MessageComposer';
import { QuotaMeter } from '../components/QuotaMeter';
import { CampaignHistory } from '../components/CampaignHistory';
import {
  AcademyAudiencePicker,
  INITIAL_ACADEMY_AUDIENCE,
  toAcademyAudience,
  type AcademyAudienceDraft,
} from '../components/AcademyAudiencePicker';
import {
  useAcademyMessageHistory,
  useAcademyMessagePreview,
  useAcademyMessageQuota,
  useSendAcademyMessage,
} from '../hooks/useMessaging';

export default function AcademyMessagesPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const [draft, setDraft] = useState<AcademyAudienceDraft>(INITIAL_ACADEMY_AUDIENCE);

  const quota = useAcademyMessageQuota(academyId);
  const history = useAcademyMessageHistory(academyId);
  const preview = useAcademyMessagePreview(academyId);
  const send = useSendAcademyMessage(academyId);

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      path: buildPath(DASHBOARD_ROUTES.academyOverview, { academyId }),
    },
    { labelKey: 'navigation:items.academyMessages' },
  ];

  return (
    <PageContainer>
      <PageHeader
        titleKey="messaging:academy.title"
        descriptionKey="messaging:academy.description"
        breadcrumbs={breadcrumbs}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('messaging:composer.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MessageComposer
              idPrefix="academy-message"
              audience={toAcademyAudience(draft)}
              audienceSlot={
                <AcademyAudiencePicker academyId={academyId} value={draft} onChange={setDraft} />
              }
              onPreview={preview.mutateAsync}
              isPreviewing={preview.isPending}
              onSend={send.mutateAsync}
              isSending={send.isPending}
              showLearnerExclusions={draft.type !== 'staff'}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">{t('messaging:quota.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quota.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : quota.error ? (
              <ErrorState kind={quota.error.kind} onRetry={() => void quota.refetch()} />
            ) : quota.data ? (
              <QuotaMeter quota={quota.data} />
            ) : null}
            <p className="text-xs text-muted-foreground">{t('messaging:quota.explainer')}</p>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="academy-message-history" className="mt-8 space-y-3">
        <h2 id="academy-message-history" className="text-lg font-semibold">
          {t('messaging:history.title')}
        </h2>
        <CampaignHistory
          data={history.data}
          isLoading={history.isLoading}
          error={history.error}
          onRetry={() => void history.refetch()}
          hasNextPage={Boolean(history.hasNextPage)}
          isFetchingNextPage={history.isFetchingNextPage}
          onLoadMore={() => void history.fetchNextPage()}
        />
      </section>
    </PageContainer>
  );
}
