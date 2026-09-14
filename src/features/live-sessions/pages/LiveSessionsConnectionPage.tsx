/**
 * Zoom connection — academy-scoped.
 *
 * ONE ACADEMY, ONE CONNECTION. Two academies under the same organization
 * may hold entirely separate Zoom accounts, and one academy's credentials
 * must never authorize another's meeting — so this is configured per
 * academy rather than once per organization.
 *
 * NO SECRET EVER REACHES THIS SCREEN. Credentials are written server-side,
 * encrypted with the same AES-256-GCM seam the payment gateway
 * credentials use, and never returned by any endpoint. What this page
 * shows is health: connected, expired, revoked, or never connected.
 *
 * HONEST ABOUT AN EXTERNAL PREREQUISITE: connecting requires a Zoom
 * Server-to-Server OAuth app and a Meeting SDK app that the academy must
 * create in their own Zoom account. Until the platform is configured for
 * it, this screen says so plainly rather than presenting a button that
 * cannot work.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Link2Off, Loader2, Plug } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlatform } from '@hooks';
import { formatDate } from '@utils';
import {
  useLiveSessionsStatus,
  useZoomConnectionActions,
} from '../hooks/useLiveSessions';
import { ZoomConnectionForm } from '../components/ZoomConnectionForm';
import type { LanguageCode } from '@types';

export default function LiveSessionsConnectionPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { activeAcademyId } = usePlatform();
  const statusQuery = useLiveSessionsStatus(activeAcademyId ?? undefined);
  const { connect, check, disconnect } = useZoomConnectionActions(
    activeAcademyId ?? undefined,
  );

  if (!activeAcademyId) {
    return (
      <PageContainer>
        <PageHeader titleKey="liveSessions:connection.title" descriptionKey="liveSessions:connection.subtitle" />
        <EmptyState
          icon={Plug}
          titleKey="liveSessions:overview.noAcademyTitle"
          descriptionKey="liveSessions:overview.noAcademyDescription"
        />
      </PageContainer>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <PageContainer>
        <PageHeader titleKey="liveSessions:connection.title" descriptionKey="liveSessions:connection.subtitle" />
        <SectionLoader />
      </PageContainer>
    );
  }

  const provider = statusQuery.data?.provider;
  const connected = provider?.status === 'connected';

  return (
    <PageContainer>
      <PageHeader
        titleKey="liveSessions:connection.title"
        descriptionKey="liveSessions:connection.subtitle"
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                {connected ? (
                  <CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Link2Off className="size-4" strokeWidth={1.75} aria-hidden />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Zoom</p>
                <p className="text-sm text-muted-foreground">
                  {t(`liveSessions:provider.${provider?.status ?? 'not_connected'}.description`)}
                </p>
              </div>
            </div>
            <Badge variant={connected ? 'default' : 'outline'}>
              {t(`liveSessions:provider.${provider?.status ?? 'not_connected'}.badge`)}
            </Badge>
          </div>

          {provider?.lastCheckedAt ? (
            <p className="text-xs text-muted-foreground">
              {t('liveSessions:connection.lastChecked', {
                date: formatDate(provider.lastCheckedAt, language, 'short'),
              })}
            </p>
          ) : null}

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium text-foreground">
              {t('liveSessions:connection.prerequisitesTitle')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t('liveSessions:connection.prerequisitesDescription')}
            </p>
          </div>

          {/* Available whenever a connection exists — including an expired
              one, which is exactly when somebody needs to check it. */}
          {connected || provider?.status === 'expired' ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={check.isPending}
                onClick={() => check.mutate()}
              >
                {check.isPending ? (
                  <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                ) : null}
                {t('liveSessions:connection.recheck')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                {t('liveSessions:connection.disconnect')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <ZoomConnectionForm
            isPending={connect.isPending}
            error={connect.error}
            isReconnect={connected || provider?.status === 'expired'}
            onSubmit={(data) =>
              connect.mutate({
                accountId: data.accountId,
                clientId: data.clientId,
                clientSecret: data.clientSecret,
                // Empty strings mean "not provided", not "set to blank".
                sdkKey: data.sdkKey || undefined,
                sdkSecret: data.sdkSecret || undefined,
                webhookSecretToken: data.webhookSecretToken || undefined,
              })
            }
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
