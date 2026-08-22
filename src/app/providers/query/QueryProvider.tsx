/**
 * Query Provider.
 *
 * Creates the query client once per application instance and connects failed
 * requests to the toast infrastructure, so no feature has to wire up error
 * reporting for ordinary data failures.
 */
import { useMemo, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  createQueryClient,
  setGlobalQueryClient,
  clearGlobalQueryClient,
  errorTitleKey,
} from "@services";
import type { ApiError } from "@services";
import { useToast } from "@app/providers/toast/useToast";

export interface AtlasQueryProviderProps {
  readonly children: ReactNode;
}

export function AtlasQueryProvider({
  children,
}: AtlasQueryProviderProps): JSX.Element {
  const { notifyError } = useToast();

  // A ref keeps the cache alive across re-renders; recreating the client would
  // discard every cached query.
  const clientRef = useRef<QueryClient>();

  const reportError = useMemo(
    () => (error: ApiError) => {
      // Validation failures belong next to the offending field, and a
      // cancellation is not a failure the user needs to see.
      if (error.kind === "validation" || error.kind === "cancelled") return;
      notifyError(errorTitleKey(error.kind), error.messageKey);
    },
    [notifyError],
  );

  if (!clientRef.current) {
    clientRef.current = createQueryClient(reportError);
    setGlobalQueryClient(clientRef.current);
  }

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
