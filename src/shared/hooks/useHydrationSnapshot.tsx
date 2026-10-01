/**
 * What a server-rendered public page was rendered with, for the few values
 * that would otherwise differ between the server and the browser's first
 * render (Reports/SSR_ARCHITECTURE_ANALYSIS.md §4 #5, #9).
 *
 * Present only while a server-rendered page hydrates (the server renders
 * with it, and `main.tsx` passes the same values from the page). A
 * component uses it for its first render only and then settles on the
 * browser's own value in an effect. Everywhere else it is `null` and the
 * component behaves exactly as before.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface HydrationSnapshot {
  /** The calendar year the page was rendered in (footer copyright). */
  readonly renderYear: number;
  /** Whether the visitor had already made a cookie-consent decision. */
  readonly consentDecided: boolean;
}

const HydrationSnapshotContext = createContext<HydrationSnapshot | null>(null);

export function HydrationSnapshotProvider({
  value,
  children,
}: {
  readonly value: HydrationSnapshot | null;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <HydrationSnapshotContext.Provider value={value}>
      {children}
    </HydrationSnapshotContext.Provider>
  );
}

export function useHydrationSnapshot(): HydrationSnapshot | null {
  return useContext(HydrationSnapshotContext);
}

/**
 * The current calendar year: the render year while a server-rendered page
 * hydrates (so the markup matches), then the browser's own clock.
 */
export function useCurrentYear(): number {
  const snapshot = useHydrationSnapshot();
  const [year, setYear] = useState(
    () => snapshot?.renderYear ?? new Date().getFullYear()
  );
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return year;
}
