/**
 * Global Loading Provider.
 *
 * Reserved for operations that genuinely block the whole application. A counter
 * — rather than a boolean — guarantees that when two blocking operations
 * overlap, the first to finish cannot hide the indicator while the second runs.
 */
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FullPageLoader } from "@components/loading/FullPageLoader";
import { LoadingContext } from "./loading.context";
import type { LoadingContextValue } from "./loading.context";

/** One in-flight blocking operation. */
interface BlockingOperation {
  readonly id: number;
  readonly messageKey?: string;
}

export interface AtlasLoadingProviderProps {
  readonly children: ReactNode;
}

export function AtlasLoadingProvider({
  children,
}: AtlasLoadingProviderProps): JSX.Element {
  const [operations, setOperations] = useState<readonly BlockingOperation[]>(
    [],
  );

  const startLoading = useCallback((messageKey?: string) => {
    // A monotonic id avoids collisions when operations start in the same tick.
    const id = Date.now() + Math.random();

    setOperations((previous) => [...previous, { id, messageKey }]);

    let hasStopped = false;
    return (): void => {
      // Guarded so calling the returned stopper twice is harmless.
      if (hasStopped) return;
      hasStopped = true;
      setOperations((previous) =>
        previous.filter((operation) => operation.id !== id),
      );
    };
  }, []);

  const value = useMemo<LoadingContextValue>(() => {
    // The most recent message wins: it describes what the user just triggered.
    const activeMessageKey = operations
      .slice()
      .reverse()
      .find((operation) => operation.messageKey !== undefined)?.messageKey;

    return {
      isLoading: operations.length > 0,
      messageKey: activeMessageKey,
      startLoading,
    };
  }, [operations, startLoading]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {value.isLoading ? (
        <FullPageLoader messageKey={value.messageKey} />
      ) : null}
    </LoadingContext.Provider>
  );
}
