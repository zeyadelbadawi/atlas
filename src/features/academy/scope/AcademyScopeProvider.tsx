/**
 * AcademyScopeProvider (W5 — academy switching isolation).
 *
 * THE URL IS THE ONLY SOURCE OF TRUTH for the active academy. This provider
 * reads `/dashboard/academy/:academyId/*` and:
 *   - verifies the caller's standing there (`GET /academies/:id/me`);
 *   - mirrors the id into `PlatformContext.activeAcademyId` (layout effect,
 *     so the sidebar never paints another academy's links or brand), and
 *     remembers it as the "last academy" redirect hint for this user+org;
 *   - when the URL leaves an academy, cancels that academy's in-flight
 *     queries — TanStack drops a cancelled fetch's result, so a response
 *     for the academy just left can never land after the switch;
 *   - when access is lost (403 on the membership check, or a 403
 *     "not a member" on any query of the current academy that the re-check
 *     confirms; 404 when the academy is gone): removes every cached query of
 *     that academy, shows a clear message, and redirects to an academy the
 *     user can open (via the `/dashboard/academy` chooser) or its empty
 *     state;
 *   - on an organization switch, leaves the old organization's academy.
 *
 * Mounted once in the dashboard shell, above the sidebar and the content.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@api';
import type { ApiError } from '@api';
import { useAuth, usePlatform } from '@hooks';
import { useToast } from '@app/providers/toast/useToast';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import {
  academyKeys,
  cancelAcademyQueries,
  keyReferencesAcademy,
  removeAcademyQueries,
} from '@services/query';
import type { Academy, PaginatedResult } from '@types';
import { useAcademyMembership } from '../hooks/useAcademyMembership';
import { academyIdFromPath } from './academy-scope-path';
import { AcademyScopeContext } from './academy-scope.context';
import type {
  AcademyAccessLostState,
  AcademyScopeValue,
} from './academy-scope.context';
import { clearLastAcademy, writeLastAcademy } from './last-academy';

/** Navigation state carried to the chooser so it can explain the redirect. */
export interface AcademyScopeLocationState {
  readonly academyAccessLost?: AcademyAccessLostState;
}

const NOT_A_MEMBER_KEY = 'errors.tenancy.notAMember';
const ACADEMY_GONE_KEY = 'errors.academy.notFound';

/** A 403 that means "you are not staff of this academy" (not "your role is too low"). */
function isMembershipRefusal(error: unknown): error is ApiError {
  return (
    isApiError(error) &&
    error.kind === 'forbidden' &&
    error.messageKey === NOT_A_MEMBER_KEY
  );
}

export interface AcademyScopeProviderProps {
  readonly children: ReactNode;
}

export function AcademyScopeProvider({
  children,
}: AcademyScopeProviderProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, organization } = useAuth();
  const { activeAcademyId, setActiveAcademy } = usePlatform();
  const { notify } = useToast();

  const academyId = academyIdFromPath(location.pathname);
  const membershipQuery = useAcademyMembership(academyId);
  const [lostAcademyIds, setLostAcademyIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  // Race guard: only an answer FOR the current academy counts. A late
  // response for the academy just left (or a placeholder) is ignored.
  const membership =
    membershipQuery.data?.academy.id === academyId
      ? membershipQuery.data
      : undefined;

  const currentAcademyRef = useRef(academyId);
  currentAcademyRef.current = academyId;
  const isCurrentAcademy = useCallback(
    (id: string) => currentAcademyRef.current === id,
    []
  );

  const owner = useMemo(
    () => ({ userId: user?.id, organizationId: organization?.id }),
    [user?.id, organization?.id]
  );

  // URL -> platform mirror, before paint (sidebar links and brand).
  useLayoutEffect(() => {
    if (academyId && academyId !== activeAcademyId) setActiveAcademy(academyId);
  }, [academyId, activeAcademyId, setActiveAcademy]);

  // The "last academy" hint: written only once the server confirmed access.
  useEffect(() => {
    if (membership) writeLastAcademy(owner, membership.academy.id);
  }, [membership, owner]);

  // Leaving an academy (switch, Back/Forward, any navigation out of it):
  // cancel its in-flight reads.
  const previousAcademyRef = useRef(academyId);
  useEffect(() => {
    const previous = previousAcademyRef.current;
    previousAcademyRef.current = academyId;
    if (previous && previous !== academyId) {
      void cancelAcademyQueries(queryClient, previous);
    }
  }, [academyId, queryClient]);

  // ---- access lost ------------------------------------------------------
  const handledRef = useRef<string | undefined>(undefined);
  const organizationSwitchingRef = useRef(false);

  const handleAccessLost = useCallback(
    (lostId: string, reason: AcademyAccessLostState['reason']) => {
      if (!isCurrentAcademy(lostId) || handledRef.current === lostId) return;
      if (organizationSwitchingRef.current) return;
      handledRef.current = lostId;

      const listed = queryClient
        .getQueriesData<PaginatedResult<Academy>>({
          queryKey: academyKeys.lists(organization?.id),
        })
        .flatMap(([, data]) => data?.items ?? [])
        .find((academy) => academy.id === lostId);
      const academyName = listed?.name;

      removeAcademyQueries(queryClient, lostId);
      clearLastAcademy(owner, lostId);
      setLostAcademyIds((previous) => new Set(previous).add(lostId));
      if (activeAcademyId === lostId) setActiveAcademy(undefined);
      // The chooser must decide from a FRESH list (the server no longer
      // lists an academy the caller cannot open), never the cached one.
      void queryClient.resetQueries({
        queryKey: academyKeys.lists(organization?.id),
      });

      notify({
        intent: 'error',
        titleKey:
          reason === 'notFound'
            ? 'academy:switcher.accessLost.goneTitle'
            : 'academy:switcher.accessLost.title',
        descriptionKey: academyName
          ? 'academy:switcher.accessLost.namedDescription'
          : 'academy:switcher.accessLost.description',
        values: academyName ? { name: academyName } : undefined,
      });

      const state: AcademyScopeLocationState = {
        academyAccessLost: { academyId: lostId, academyName, reason },
      };
      // `replace`: Back must not return to a page that can only refuse.
      navigate(DASHBOARD_ROUTES.academy, { replace: true, state });
    },
    [
      activeAcademyId,
      isCurrentAcademy,
      navigate,
      notify,
      organization?.id,
      owner,
      queryClient,
      setActiveAcademy,
    ]
  );

  // The membership check itself refused (403), or the academy is gone: the
  // API's own `errors.academy.notFound` (a deleted academy is archived), or
  // an archived summary. Any other 404 (the API's generic `errors.notFound`
  // for an unknown route — an API older than this client) must not throw
  // everyone out of every academy.
  const membershipError = membershipQuery.error;
  const archived = membership?.academy.status === 'archived';
  useEffect(() => {
    if (!academyId) return;
    if (archived) {
      handleAccessLost(academyId, 'notFound');
    } else if (membershipError?.kind === 'forbidden') {
      handleAccessLost(academyId, 'forbidden');
    } else if (
      membershipError?.kind === 'notFound' &&
      membershipError.messageKey === ACADEMY_GONE_KEY
    ) {
      handleAccessLost(academyId, 'notFound');
    }
  }, [academyId, archived, membershipError, handleAccessLost]);

  // Re-arm once the user is somewhere else.
  useEffect(() => {
    if (academyId !== handledRef.current) handledRef.current = undefined;
    if (!academyId) organizationSwitchingRef.current = false;
  }, [academyId]);

  // Any query of the CURRENT academy refused with "not a member" (another
  // owner revoked the membership mid-session): re-ask the membership check,
  // which is the authority that decides. A refusal for an academy the user
  // already left is ignored (the race guard for late 403s).
  useEffect(() => {
    const recheck = () => {
      const current = currentAcademyRef.current;
      if (!current) return;
      void queryClient.invalidateQueries({
        queryKey: academyKeys.membership(organization?.id, current),
      });
    };
    const unsubscribeQueries = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'error') return;
        const current = currentAcademyRef.current;
        if (
          current &&
          isMembershipRefusal(event.action.error) &&
          keyReferencesAcademy(
            event.query.queryKey as readonly unknown[],
            current
          ) &&
          !keyReferencesAcademy(
            event.query.queryKey as readonly unknown[],
            'membership'
          )
        ) {
          recheck();
        }
      });
    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (
          event.type === 'updated' &&
          event.action.type === 'error' &&
          isMembershipRefusal(event.action.error)
        ) {
          recheck();
        }
      });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [organization?.id, queryClient]);

  // An organization switch leaves the old organization's academy (F7).
  useEffect(() => {
    const onOrganizationSwitched = () => {
      if (!currentAcademyRef.current) return;
      organizationSwitchingRef.current = true;
      navigate(DASHBOARD_ROUTES.academy, { replace: true });
    };
    window.addEventListener(
      'atlas:organization-switched',
      onOrganizationSwitched
    );
    return () =>
      window.removeEventListener(
        'atlas:organization-switched',
        onOrganizationSwitched
      );
  }, [navigate]);

  const value = useMemo<AcademyScopeValue>(
    () => ({
      academyId,
      membership,
      isResolving: !!academyId && !membership && membershipQuery.isPending,
      error: membershipQuery.error ?? null,
      lostAcademyIds,
      isCurrentAcademy,
    }),
    [
      academyId,
      membership,
      membershipQuery.isPending,
      membershipQuery.error,
      lostAcademyIds,
      isCurrentAcademy,
    ]
  );

  return (
    <AcademyScopeContext.Provider value={value}>
      {children}
    </AcademyScopeContext.Provider>
  );
}
