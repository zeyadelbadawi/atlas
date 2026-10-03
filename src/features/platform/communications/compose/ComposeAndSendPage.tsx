/**
 * Compose and Send — Platform Owner (sidebar: Email & Notifications,
 * `/dashboard/platform/email/compose`). W3-compose.
 *
 * A broadcast to organization owners, academy owners (by plan and/or
 * subscription status), every academy owner and administrator, or one
 * organization — by email and/or in-app notification. Built on the same
 * campaign model and composer as an academy's Messages page.
 *
 * Platform-owner only: the route guard is convenience, the server enforces
 * `PlatformOwnerGuard` and the platform RLS policies on every call. Large
 * audiences (1,000+) need an explicit confirmation, sends are rate limited
 * and audited, and progress is the server's real outbox counts. Platform
 * broadcasts never count against an academy's monthly email quota.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader } from '@components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { MessageComposer } from '@features/messaging/components/MessageComposer';
import { CampaignHistory } from '@features/messaging/components/CampaignHistory';
import {
  INITIAL_PLATFORM_AUDIENCE,
  PlatformAudiencePicker,
  toPlatformAudience,
  type PlatformAudienceDraft,
} from '@features/messaging/components/PlatformAudiencePicker';
import {
  usePlatformCampaignHistory,
  usePlatformCampaignPreview,
  useSendPlatformCampaign,
} from '@features/messaging/hooks/useMessaging';

const BREADCRUMBS: readonly BreadcrumbItem[] = [
  {
    labelKey: 'navigation:items.platformDashboard',
    path: DASHBOARD_ROUTES.platform,
  },
  { labelKey: 'navigation:items.platformEmailCompose' },
];

export default function ComposeAndSendPage(): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PlatformAudienceDraft>(INITIAL_PLATFORM_AUDIENCE);
  const preview = usePlatformCampaignPreview();
  const send = useSendPlatformCampaign();
  const history = usePlatformCampaignHistory();

  return (
    <PageContainer>
      <PageHeader
        titleKey="navigation:items.platformEmailCompose"
        descriptionKey="messaging:platform.description"
        breadcrumbs={BREADCRUMBS}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('messaging:composer.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageComposer
            idPrefix="platform-campaign"
            audience={toPlatformAudience(draft)}
            audienceSlot={<PlatformAudiencePicker value={draft} onChange={setDraft} />}
            onPreview={preview.mutateAsync}
            isPreviewing={preview.isPending}
            onSend={send.mutateAsync}
            isSending={send.isPending}
          />
        </CardContent>
      </Card>

      <section aria-labelledby="platform-campaign-history" className="mt-8 space-y-3">
        <h2 id="platform-campaign-history" className="text-lg font-semibold">
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
