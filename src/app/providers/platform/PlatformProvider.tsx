/**
 * Platform Provider.
 *
 * Manages global platform state including the active organization, feature flags
 * and user preferences. This provider persists state to localStorage and keeps
 * it synchronized with the identity layer.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { STORAGE_KEYS } from "@constants";
import type { PlatformState } from "@types";
import { PlatformContext } from "./platform.context";
import type { PlatformContextValue } from "./platform.context";
import { getGlobalQueryClient } from "@services";

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
    // Load persisted state on mount, but do NOT restore activeOrganizationId yet.
    // It will be validated and restored after authentication is confirmed.
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.userPreferences);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PlatformState>;
        // Exclude activeOrganizationId from initial restoration.
        const { activeOrganizationId: _, ...safeState } = parsed;
        return { ...INITIAL_STATE, ...safeState };
      }
    } catch {
      // Corrupted storage; use defaults.
    }
    return INITIAL_STATE;
  });

  /**
   * Loads feature flags on mount.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadFeatureFlags() {
      try {
        // TODO: Replace with actual feature flag service when implemented.
        // For now, simulate loading and set to empty flags.
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            featureFlags: {
              flags: {},
              loading: false,
            },
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            featureFlags: {
              flags: {},
              loading: false,
              error: "Failed to load feature flags",
            },
          }));
        }
      }
    }

    void loadFeatureFlags();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Listens for organization switching events and invalidates organization-scoped cache.
   */
  useEffect(() => {
    const handleOrgSwitch = async (event: Event) => {
      const customEvent = event as CustomEvent<{ organizationId: string }>;
      const { organizationId } = customEvent.detail;

      // Update active organization in platform state.
      setState((prev) => ({ ...prev, activeOrganizationId: organizationId }));

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
                (part) => part === "organization" || part === organizationId,
              )
            );
          },
        });
      } catch {
        // Query client not available; continue without cache invalidation.
      }
    };

    window.addEventListener("atlas:organization-switched", handleOrgSwitch);

    return () => {
      window.removeEventListener(
        "atlas:organization-switched",
        handleOrgSwitch,
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
        }),
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
    [],
  );

  const setActiveAcademy = useCallback((academyId: string | undefined) => {
    setState((prev) => ({ ...prev, activeAcademyId: academyId }));

    if (academyId) {
      localStorage.setItem(STORAGE_KEYS.activeAcademy, academyId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeAcademy);
    }
  }, []);

  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      return state.featureFlags.flags[flagKey] ?? false;
    },
    [state.featureFlags],
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
    ],
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}
