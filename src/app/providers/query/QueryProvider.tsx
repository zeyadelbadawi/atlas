/**
 * Query Provider.
 *
 * Creates the query client once per application instance and connects failed
 * requests to the toast infrastructure, so no feature has to wire up error
 * reporting for ordinary data failures.
 */
import { useMemo, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { QueryClientProvider, hydrate } from '@tanstack/react-query';
import type { DehydratedState, QueryClient } from '@tanstack/react-query';
import {
  createQueryClient,
  setGlobalQueryClient,
  clearGlobalQueryClient,
  errorTitleKey,
  publicWebsiteKeys,
} from '@services';
import type { ApiError } from '@services';
import { useToast } from '@app/providers/toast/useToast';
import { useTranslation } from 'react-i18next';
import { errorToastDescriptionKey } from './error-toast.utils';

export interface AtlasQueryProviderProps {
  readonly children: ReactNode;
  /**
   * Server rendering only: the request's own client. It is never made the
   * global client, so nothing is shared between requests.
   */
  readonly client?: QueryClient;
  /**
   * Client only: the server-rendered page's cache, hydrated before the
   * first render so the page hydrates with the data it was rendered with.
   */
  readonly dehydratedState?: DehydratedState;
}

export function AtlasQueryProvider({
  children,
  client,
  dehydratedState,
}: AtlasQueryProviderProps): JSX.Element {
  const { notifyError } = useToast();
  const { i18n } = useTranslation();

  // A ref keeps the cache alive across re-renders; recreating the client would
  // discard every cached query.
  const clientRef = useRef<QueryClient>();

  const reportError = useMemo(
    () => (error: ApiError) => {
      // Validation failures belong next to the offending field, and a
      // cancellation is not a failure the user needs to see. `notFound` is
      // the same class of "belongs inline, not in a global toast": every
      // page that queries a specific resource already renders its own
      // contextual state for a 404 (an EmptyState for a legitimate
      // "doesn't exist yet" — e.g. `TenantSubscriptionPage`'s "no
      // subscription yet" — or the generic `ErrorState` card otherwise).
      // Confirmed live: navigating to any page backed by a 404 query (e.g.
      // Subscription/Usage/Billing before a plan is ever purchased) fired
      // this handler's own `errors:notFound` toast — "Page not found /
      // has been moved" — stacked on top of the page's own correct,
      // calmer empty state, which reads as a broken route when nothing is
      // actually broken.
      if (
        error.kind === 'validation' ||
        error.kind === 'cancelled' ||
        error.kind === 'notFound'
      )
        return;
      // Namespaced and existence-checked: a dotted backend key or an
      // untranslated one must never reach the screen as a raw identifier
      // (see `errorToastDescriptionKey`).
      notifyError(
        errorTitleKey(error.kind),
        errorToastDescriptionKey(error, (key) => i18n.exists(key))
      );
    },
    [notifyError, i18n]
  );

  if (!clientRef.current) {
    if (client) {
      clientRef.current = client;
    } else {
      clientRef.current = createQueryClient(reportError);
      if (dehydratedState) {
        hydrate(clientRef.current, dehydratedState);
        // A public query the server saw as "not found" (an unpublished
        // Academy's Coming Soon page) must hydrate as that error: by
        // default a query mounting over an error, with no data, is
        // reported as pending — the page would hydrate its loading state
        // and fetch again. The server renders with the same setting
        // (`entry-server.tsx`); the default returns once hydrated, below.
        clientRef.current.setQueryDefaults(publicWebsiteKeys.all, {
          retryOnMount: false,
        });
      }
      setGlobalQueryClient(clientRef.current);
    }
  }

  // Runs after every hydrated query has mounted (descendants' effects run
  // first), so from here on public queries behave exactly as without
  // server rendering.
  useEffect(() => {
    if (dehydratedState && !client) {
      clientRef.current?.setQueryDefaults(publicWebsiteKeys.all, {
        retryOnMount: true,
      });
    }
    // Once, after the hydration commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up singleton on unmount (only in dev/test; production never unmounts).
  useEffect(() => {
    return () => {
      clearGlobalQueryClient();
    };
  }, []);

  return (
    <QueryClientProvider client={clientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
