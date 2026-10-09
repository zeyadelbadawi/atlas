/**
 * Local-first dashboard — starts the offline layer for the signed-in user.
 *
 *  - restores that user's saved copies into the query cache (only theirs),
 *  - keeps saving allowlisted reads as they succeed,
 *  - runs the durable outbox for their queued changes,
 *  - feeds the connectivity indicator from real request outcomes, so
 *    "reconnecting" also covers a browser that claims to be online while
 *    requests still fail.
 *
 * Client only, and only on the platform (dashboard) host: an Academy
 * website and its learner portal always read from the network (W1 is the
 * dashboard's offline mode). On the server (SSR) and for an anonymous
 * visitor it does nothing at all.
 */

import { useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeUnknownError } from '@api';
import {
  reportNetworkFailure,
  reportServerReached,
  restorePersistedQueries,
  startOutbox,
  startQueryPersistence,
} from '@services/offline';
import { ENV } from '@config';
import { getCurrentPublicWebsiteContext } from '@utils';
import { IdentityContext } from '../identity/identity.context';
import { setOfflineSavedAt } from './offline-status';

function isPlatformHost(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    getCurrentPublicWebsiteContext(ENV.platformBaseDomain, ENV.isDevelopment)
      .mode === 'atlas-app'
  );
}

export function OfflineProvider({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const queryClient = useQueryClient();
  const identity = useContext(IdentityContext);
  const userId =
    identity?.session.status === 'authenticated'
      ? (identity.session.user?.id ?? null)
      : null;
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  // Connectivity from real outcomes: any HTTP answer means the server was
  // reached; a network-kind failure means it was not.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      if (event.action.type === 'success') reportServerReached();
      if (event.action.type === 'error') {
        const error = normalizeUnknownError(event.action.error);
        if (error.kind === 'network' || error.kind === 'timeout')
          reportNetworkFailure();
        else if (error.status !== undefined) reportServerReached();
      }
    });
  }, [queryClient]);

  useEffect(() => {
    if (!userId || !isPlatformHost()) return;
    let cancelled = false;
    void restorePersistedQueries(queryClient, userId).then((restored) => {
      if (!cancelled) setOfflineSavedAt(restored.newestSavedAt);
    });
    const stopPersistence = startQueryPersistence(
      queryClient,
      () => userIdRef.current
    );
    const stopOutbox = startOutbox(() => userIdRef.current);
    return () => {
      cancelled = true;
      stopPersistence();
      stopOutbox();
    };
  }, [queryClient, userId]);

  return <>{children}</>;
}
