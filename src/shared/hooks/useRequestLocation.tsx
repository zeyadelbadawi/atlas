/**
 * The location of the page request, for code that runs during render.
 *
 * In the browser this is `window.location`. When the public Academy
 * website is rendered on the server (Reports/SSR_ARCHITECTURE_ANALYSIS.md),
 * there is no `window`: the server wraps the tree in
 * `RequestLocationProvider` with the request's own host, origin and query,
 * so render output is the same on both sides. Code that only runs in
 * effects or event handlers keeps using `window.location` directly.
 */
import { createContext, useContext, type ReactNode } from 'react';

export interface RequestLocation {
  /** Host name without port, e.g. `academy.example.com`. */
  readonly hostname: string;
  /** `protocol://host[:port]`, e.g. `https://academy.example.com`. */
  readonly origin: string;
  /** The query string including `?`, or `''`. */
  readonly search: string;
}

const RequestLocationContext = createContext<RequestLocation | null>(null);

export function RequestLocationProvider({
  value,
  children,
}: {
  /** `null` in the browser: the hook then reads `window.location`. */
  readonly value: RequestLocation | null;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <RequestLocationContext.Provider value={value}>
      {children}
    </RequestLocationContext.Provider>
  );
}

/** The request's location: the server's value when provided, else the browser's. */
export function useRequestLocation(): RequestLocation {
  const provided = useContext(RequestLocationContext);
  if (provided) return provided;
  return {
    hostname: window.location.hostname,
    origin: window.location.origin,
    search: window.location.search,
  };
}
