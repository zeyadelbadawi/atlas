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
 * PLATFORM HOST: the dashboard's allowlist, per signed-in user.
 *
 * ACADEMY WEBSITE (academy offline work): the learner allowlist
 * (`learner-persistence.ts`, default deny) in the academy's OWN database
 * (`offline-scope.ts`): the published site for every visitor, and for a
 * signed-in learner their outline, progress, enrolments and the lesson
 * texts the server allowed (`learner-offline-watcher.ts`). The learner's
 * queued changes (lesson completion, assignment submits) are replayed by
 * handlers the learner feature registers (loaded lazily).
 *
 * On the server (SSR) it does nothing at all.
 */

import { useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeUnknownError } from '@api';
import {
  currentOfflineScope,
  learnerPersistencePolicy,
  reportNetworkFailure,
  reportServerReached,
  restorePersistedQueries,
  startLearnerOfflineWatcher,
  startOutbox,
  startQueryPersistence,
} from '@services/offline';
import { ENV } from '@config';
import { getCurrentPublicWebsiteContext } from '@utils';
import { IdentityContext } from '../identity/identity.context';
import { setOfflineSavedAt } from './offline-status';

function isAcademyHost(): boolean {
  if (typeof window === 'undefined') return false;
  return currentOfflineScope().surface === 'academy';
}

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

  // Academy website, everyone: the published site this visitor already saw.
  // Restored before anyone signs in, kept as the visitor browses.
  useEffect(() => {
    if (!isAcademyHost()) return;
    let cancelled = false;
    void restorePersistedQueries(
      queryClient,
      null,
      Date.now(),
      learnerPersistencePolicy
    ).then((restored) => {
      if (!cancelled && restored.newestSavedAt)
        setOfflineSavedAt(restored.newestSavedAt);
    });
    const stopPersistence = startQueryPersistence(
      queryClient,
      () => userIdRef.current,
      learnerPersistencePolicy
    );
    return () => {
      cancelled = true;
      stopPersistence();
    };
  }, [queryClient]);

  // Academy website, signed-in learner: their own copies and queued changes.
  useEffect(() => {
    if (!userId || !isAcademyHost()) return;
    let cancelled = false;
    void restorePersistedQueries(
      queryClient,
      userId,
      Date.now(),
      learnerPersistencePolicy
    ).then((restored) => {
      if (!cancelled && restored.newestSavedAt)
        setOfflineSavedAt(restored.newestSavedAt);
    });
    const stopWatcher = startLearnerOfflineWatcher(
      queryClient,
      () => userIdRef.current
    );
    const stopOutbox = startOutbox(() => userIdRef.current);
    // The handlers that replay a learner's queued changes live with the
    // learner feature; loaded here so a reconnect on any page of the site
    // syncs them, not only inside the learner portal.
    void import('@features/learner/offline/learner-outbox').then((module) => {
      if (!cancelled) module.registerLearnerOutboxHandlers(queryClient);
    });
    return () => {
      cancelled = true;
      stopWatcher();
      stopOutbox();
    };
  }, [queryClient, userId]);

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
