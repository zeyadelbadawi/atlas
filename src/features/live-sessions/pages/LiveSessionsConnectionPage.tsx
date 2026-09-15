/**
 * Zoom connection — academy-scoped.
 *
 * ONE ACADEMY, ONE CONNECTION. Two academies under the same organization
 * may hold entirely separate Zoom accounts, and one academy's credentials
 * must never authorize another's meeting — so this is configured per
 * academy rather than once per organization.
 *
 * THE CUSTOMER IS NOT A ZOOM DEVELOPER. This screen used to ask an
 * academy for a Zoom account id, client id and client secret copied out
 * of apps they had to create themselves. Atlas now owns the Zoom
 * application: the customer presses one button, authorizes their own Zoom
 * account, and comes back connected. Nothing is typed, and Atlas never
 * holds a customer's client secret.
 *
 * OWNER ONLY, AND NOT BECAUSE OF THIS FILE. Connecting activates Live
 * Sessions for the whole academy and binds a customer's Zoom account, so
 * it belongs to the Organization Owner rather than to a Manager. The
 * controls below are hidden for everyone else — but hiding is a courtesy,
 * not a boundary: the backend refuses the endpoint independently, and
 * that refusal is what actually enforces the rule.
 *
 * THIS SCREEN IS ALSO WHERE ZOOM SENDS THE CUSTOMER BACK. Zoom's
 * registered redirect URI points here rather than at the API, because
 * Atlas authenticates with a bearer token this app holds and a top-level
 * browser navigation from zoom.us carries no `Authorization` header — an
 * API endpoint receiving that redirect would answer 401 the instant the
 * customer pressed Allow. Landing here instead means the page is already
 * inside their session, so it can forward `code` and `state` on a normal
 * authenticated request. See `handleZoomReturn` below.
 *
 * NO TOKEN EVER REACHES THIS SCREEN. What is shown is connection health
 * and safe, non-secret account metadata — never an access token, never a
 * refresh token. The authorization `code` passes through the query string
 * once and is stripped from history before anything else runs; it is
 * useless without Atlas's client secret, which never leaves the server.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Link2Off, Loader2, Plug } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions, usePlatform } from '@hooks';
import { formatDate } from '@utils';
import {
  useLiveSessionsStatus,
  useZoomConnectionActions,
} from '../hooks/useLiveSessions';
import type { LanguageCode } from '@types';

export default function LiveSessionsConnectionPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { activeAcademyId } = usePlatform();
  const { hasPermission } = usePermissions();
  const statusQuery = useLiveSessionsStatus(activeAcademyId ?? undefined);
  const { connect, completeAuthorization, check, disconnect } =
    useZoomConnectionActions(activeAcademyId ?? undefined);

  const [searchParams, setSearchParams] = useSearchParams();
  const [declined, setDeclined] = useState(false);

  /*
    HANDLED EXACTLY ONCE.

    The state is single-use server-side, so a second POST with the same
    value is refused — and under StrictMode this effect runs twice in
    development, which would turn a perfectly good connection into a
    spurious error toast. A ref rather than state: it must latch before
    React has any chance to re-render.
  */
  const handledZoomReturn = useRef(false);

  useEffect(() => {
    if (handledZoomReturn.current) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    if (!code && !state && !error) return;

    handledZoomReturn.current = true;

    /*
      STRIPPED FROM THE URL BEFORE ANYTHING ELSE. `replace` so the
      authorization code is not left in history for a back button, a
      bookmark, or a shoulder to find.
    */
    setSearchParams({}, { replace: true });

    // Declined at Zoom's consent screen, or refused by Zoom. There is no
    // code to exchange and nothing to tell the server — an outcome, not
    // an error, so it is reported on the page rather than as a failure.
    if (error || !code || !state) {
      setDeclined(true);
      return;
    }

    completeAuthorization.mutate({ code, state });
    // Intentionally keyed on the params alone: the mutation object is a
    // new reference every render, and the ref above is the real guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

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
  const status = provider?.status ?? 'not_connected';
  const connected = status === 'connected';
  /*
    THE STATES ONLY AN OWNER RE-AUTHORIZING CAN CLEAR.

    `revoked` joins the list with P49d: it is what the Zoom
    deauthorization endpoint now sets when a customer removes Atlas from
    their Zoom account. Before that endpoint existed nothing could produce
    it, so the state was unreachable and the banner never had to cover it.
    It reuses the same banner and the same copy rather than introducing a
    second, parallel way of saying the connection needs attention.
  */
  const needsReconnect =
    status === 'reconnect_required' || status === 'expired' || status === 'revoked';

  /*
    OWNER-ONLY CONTROLS. `tenant.addon.view` is the owner-exclusive
    permission the backend gates this flow on — checked here so a Manager
    sees an honest read-only state instead of a button that would 403.
  */
  const canManageConnection = hasPermission('tenant.addon.view');

  const handleConnect = async (): Promise<void> => {
    const result = await connect.mutateAsync();
    // A full navigation, not a popup: Zoom's consent screen sets its own
    // frame-ancestor rules and an embedded attempt is refused.
    window.location.assign(result.authorizationUrl);
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="liveSessions:connection.title"
        descriptionKey="liveSessions:connection.subtitle"
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                  {t(`liveSessions:provider.${status}.description`)}
                </p>
              </div>
            </div>
            <Badge variant={connected ? 'default' : needsReconnect ? 'destructive' : 'outline'}>
              {t(`liveSessions:provider.${status}.badge`)}
            </Badge>
          </div>

          {/* SAFE METADATA ONLY — which Zoom account is attached and who
              authorized it. Never a token, never a scope secret. */}
          {connected && provider?.externalAccountId ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('liveSessions:connection.zoomAccount')}
                </dt>
                {/* Direction-isolated: an opaque Latin identifier inside an
                    Arabic line reorders unpredictably otherwise. */}
                <dd className="truncate text-sm font-medium" dir="ltr">
                  {provider.externalAccountId}
                </dd>
              </div>
              {provider.connectedAt ? (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('liveSessions:connection.connectedAt')}
                  </dt>
                  <dd className="text-sm font-medium" dir="ltr">
                    {formatDate(provider.connectedAt, language, 'short')}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {provider?.lastCheckedAt ? (
            <p className="text-xs text-muted-foreground">
              {t('liveSessions:connection.lastChecked', {
                date: formatDate(provider.lastCheckedAt, language, 'short'),
              })}
            </p>
          ) : null}

          {declined ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="size-4 text-muted-foreground" aria-hidden />
                {t('liveSessions:connection.declinedTitle')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t('liveSessions:connection.declinedDescription')}
              </p>
            </div>
          ) : null}

          {completeAuthorization.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('liveSessions:connection.completing')}
            </p>
          ) : null}

          {needsReconnect ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
                {t('liveSessions:connection.reconnectTitle')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t(
                  canManageConnection
                    ? 'liveSessions:connection.reconnectDescription'
                    : 'liveSessions:connection.reconnectDescriptionNonOwner',
                )}
              </p>
            </div>
          ) : null}

          {canManageConnection ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={connect.isPending}
                onClick={() => void handleConnect()}
              >
                {connect.isPending ? (
                  <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Plug className="me-2 size-4" aria-hidden />
                )}
                {t(
                  connected || needsReconnect
                    ? 'liveSessions:connection.reconnect'
                    : 'liveSessions:connection.connect',
                )}
              </Button>

              {connected || needsReconnect ? (
                <>
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
                </>
              ) : null}
            </div>
          ) : (
            /* A Manager is told WHO can fix this, not shown a dead button. */
            <p className="text-sm text-muted-foreground">
              {t('liveSessions:connection.ownerOnlyNotice')}
            </p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
