/**
 * Platform Provider.
 *
 * Manages global platform state including the active organization, feature flags
 * and user preferences. This provider persists state to localStorage and keeps
 * it synchronized with the identity layer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@constants';
import type { PlatformState } from '@types';
import { PlatformContext } from './platform.context';
import type { PlatformContextValue } from './platform.context';
import { getGlobalQueryClient } from '@services';

export interface PlatformProviderProps {
  readonly children: ReactNode;
}

const INITIAL_STATE: PlatformState = {
  sidebarCollapsed: false,
  featureFlags: {
    flags: {},
    loading: true, // Start as loading until flags are fetched.
  },
};

export function AtlasPlatformProvider({
  children,
}: PlatformProviderProps): JSX.Element {
  const [state, setState] = useState<PlatformState>(() => {
    /*
      W5 — THE ACTIVE ACADEMY IS NOT RESTORED FROM STORAGE ANY MORE.

      It used to be read back from a per-BROWSER key (`atlas:active-academy`)
      on every load, which made a third source of truth beside the URL and
      the page: two tabs diverged, a reload adopted the other tab's academy,
      and another account's academy could leak into this session. Now:
        - inside `/dashboard/academy/:academyId/*` the URL is the truth and
          `AcademyScopeProvider` mirrors it here;
        - elsewhere `useActiveAcademyReconciliation` seeds it from the
          "last academy" preference, keyed by user AND organization
          (`features/academy/scope/last-academy.ts`), and validates it
          against the academies the server lists for the caller.

      `activeOrganizationId` deliberately stays excluded — it is validated
      and restored only after authentication is confirmed, which is a
      different and stricter contract.
    */
    // No storage when the public website is rendered on the server
    // (Reports/SSR_ARCHITECTURE_ANALYSIS.md §4 #3); nothing here is shown there.
    if (typeof window === 'undefined') return INITIAL_STATE;

    try {
      // The retired per-browser key is dropped so nothing can read it again.
      localStorage.removeItem(STORAGE_KEYS.activeAcademy);
      const stored = localStorage.getItem(STORAGE_KEYS.userPreferences);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PlatformState>;
        // Exclude activeOrganizationId (and any stale academy) from restoration.
        const {
          activeOrganizationId: _,
          activeAcademyId: __,
          ...safeState
        } = parsed;
        return { ...INITIAL_STATE, ...safeState };
      }
    } catch {
      // Corrupted or unavailable storage; use defaults.
    }
    return INITIAL_STATE;
  });

  /**
   * Resolves dynamic (per-user/org) feature flags.
   *
   * Prompt 13 audit boundary: Atlas has no dynamic feature-flag backend
   * contract anywhere — `feature-flags.config.ts` is the one real flag
   * registry, and it is static/compile-time (`languageSwitcher`/
   * `themeSwitcher`), not fetched per session. No current `NavigationItem`
   * sets `featureFlag`, so `isFeatureEnabled` below has no live consumer
   * today; it exists as a ready extension point for `NavigationItem`'s
   * `featureFlag` field. Rather than inventing a dynamic-flags service to
   * populate it, this resolves to "no dynamic flags" immediately and
   * honestly — no fake network delay, no invented endpoint.
   */
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      featureFlags: { flags: {}, loading: false },
    }));
  }, []);

  /**
   * Listens for organization switching events and invalidates organization-scoped cache.
   */
  useEffect(() => {
    const handleOrgSwitch = async (event: Event) => {
      const customEvent = event as CustomEvent<{ organizationId: string }>;
      const { organizationId } = customEvent.detail;

      // Update active organization in platform state. Academies are
      // organization-scoped, so the remembered academy can never be valid
      // in the organization being switched to — drop it here rather than
      // let the sidebar build links to an academy the API will refuse.
      setState((prev) => ({
        ...prev,
        activeOrganizationId: organizationId,
        activeAcademyId: undefined,
      }));
      localStorage.removeItem(STORAGE_KEYS.activeAcademy);

      // Invalidate organization-scoped React Query cache.
      try {
        const queryClient = getGlobalQueryClient();
        await queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey as readonly unknown[];
            // Invalidate queries that include organization ID in their key.
            return (
              Array.isArray(queryKey) &&
              queryKey.some(
                (part) => part === 'organization' || part === organizationId
              )
            );
          },
        });
      } catch {
        // Query client not available; continue without cache invalidation.
      }
    };

    window.addEventListener('atlas:organization-switched', handleOrgSwitch);

    return () => {
      window.removeEventListener(
        'atlas:organization-switched',
        handleOrgSwitch
      );
    };
  }, []);

  /**
   * Persists state changes to localStorage.
   */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.userPreferences,
        JSON.stringify({
          sidebarCollapsed: state.sidebarCollapsed,
          userPreferences: state.userPreferences,
        })
      );
    } catch {
      // Storage quota exceeded or unavailable; continue without persistence.
    }
  }, [state]);

  const updateState = useCallback((updates: Partial<PlatformState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setActiveOrganization = useCallback(
    (organizationId: string | undefined) => {
      setState((prev) => ({ ...prev, activeOrganizationId: organizationId }));

      if (organizationId) {
        localStorage.setItem(STORAGE_KEYS.activeOrganization, organizationId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.activeOrganization);
      }
    },
    []
  );

  /**
   * W5 — a MIRROR of the URL's academy (written by `AcademyScopeProvider`)
   * or, outside the academy scope, the reconciled "last academy". Never
   * persisted here: switching academies is a navigation (`useSwitchAcademy`),
   * not a call to this setter.
   */
  const setActiveAcademy = useCallback((academyId: string | undefined) => {
    setState((prev) =>
      prev.activeAcademyId === academyId
        ? prev
        : { ...prev, activeAcademyId: academyId }
    );
  }, []);

  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      return state.featureFlags.flags[flagKey] ?? false;
    },
    [state.featureFlags]
  );

  const value: PlatformContextValue = useMemo(
    () => ({
      state,
      updateState,
      activeOrganizationId: state.activeOrganizationId,
      setActiveOrganization,
      activeAcademyId: state.activeAcademyId,
      setActiveAcademy,
      featureFlags: state.featureFlags,
      isFeatureEnabled,
    }),
    [
      state,
      updateState,
      setActiveOrganization,
      setActiveAcademy,
      isFeatureEnabled,
    ]
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}
