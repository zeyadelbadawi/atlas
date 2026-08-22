/**
 * Global loading context definition.
 *
 * Reserved for operations that genuinely block the whole application, such as
 * restoring a session. Data loading inside a page must use skeletons instead so
 * the layout stays stable.
 *
 * A counter is used rather than a boolean so concurrent operations cannot hide
 * the indicator while another is still running.
 */
import { createContext } from 'react';

export interface LoadingContextValue {
  readonly isLoading: boolean;
  /** Translation key describing what is happening, if any. */
  readonly messageKey?: string;
  /** Begins a blocking operation. Returns a function that ends it. */
  readonly startLoading: (messageKey?: string) => () => void;
}

export const LoadingContext = createContext<LoadingContextValue | undefined>(
  undefined
);