/**
 * What every learner dashboard page needs to know about where it is mounted.
 *
 * The `/my/*` tree lives on the ACADEMY host, inside `PublicWebsiteRouter`,
 * which means three things no page can work out for itself: which academy's
 * data it is showing, how to turn a bare `LEARNER_ROUTES` path into a real
 * href (the `/ar` locale prefix and the dev-preview query parameter both
 * apply, and both have already caused real navigation bugs when a page
 * rebuilt them locally — see `usePublicWebsiteLinkRenderer`), and which
 * pathname to compare against for active state once that prefix exists.
 *
 * The values are supplied by the public-website side and passed DOWN into
 * this feature rather than imported from it: `features/learner` must not
 * depend on `features/public-website`, both because the lint rules forbid
 * feature-to-feature reach-in and because the same shell should survive the
 * surface being mounted somewhere else later. It is the same seam
 * `LearningPathsProvider` already uses for the reused learning pages.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { PublicWebsiteLocale } from '@types';

export interface LearnerSurface {
  /** The academy whose learner dashboard this is. */
  readonly academyId: string;
  readonly locale: PublicWebsiteLocale;
  /** Arabic reads right to left — the drawer edge and chevrons follow it. */
  readonly isRtl: boolean;
  /** Turns a bare `LEARNER_ROUTES` path into a real href on this host. */
  readonly buildHref: (path: string) => string;
  /**
   * The current pathname with any `/ar` prefix stripped, so active-state
   * checks can compare against the bare `LEARNER_ROUTES` constants instead
   * of every consumer remembering to strip it.
   */
  readonly pathname: string;
}

const LearnerSurfaceContext = createContext<LearnerSurface | null>(null);

export interface LearnerSurfaceProviderProps {
  readonly academyId: string;
  readonly locale: PublicWebsiteLocale;
  readonly buildHref: (path: string) => string;
  readonly children: ReactNode;
}

export function LearnerSurfaceProvider({
  academyId,
  locale,
  buildHref,
  children,
}: LearnerSurfaceProviderProps): JSX.Element {
  const location = useLocation();

  const value = useMemo<LearnerSurface>(() => {
    const pathname =
      locale === 'en'
        ? location.pathname
        : location.pathname.replace(/^\/ar/, '') || '/';

    return {
      academyId,
      locale,
      isRtl: locale === 'ar',
      buildHref,
      pathname,
    };
  }, [academyId, locale, buildHref, location.pathname]);

  return (
    <LearnerSurfaceContext.Provider value={value}>
      {children}
    </LearnerSurfaceContext.Provider>
  );
}

/**
 * Throws rather than falling back to a guessed surface: every value here is
 * academy-scoped, and a default would mean rendering one academy's shell
 * with another's identity — the exact class of mistake tenant isolation
 * exists to prevent. A missing provider is a wiring bug, and it should fail
 * where it happens.
 */
export function useLearnerSurface(): LearnerSurface {
  const context = useContext(LearnerSurfaceContext);

  if (!context) {
    throw new Error(
      'useLearnerSurface must be used within a LearnerSurfaceProvider.'
    );
  }

  return context;
}
