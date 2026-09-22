/**
 * Keeps `usePlatform().activeAcademyId` honest: once the academies of the
 * active organization are known, a remembered id that is not among them
 * (another account's academy left in this browser, or one since archived)
 * is replaced by the first reachable academy, or cleared.
 *
 * Mounted once, in the dashboard layout, so every academy-scoped link and
 * scope derivation in the shell reads a reconciled id. See
 * `reconcileActiveAcademy` for the rule and the incident behind it.
 *
 * With no active organization (a Platform Owner, a brand-new account) the
 * list query is disabled and this does nothing.
 */
import { useEffect } from 'react';
import { usePlatform } from '@hooks';
import { useAcademies } from './useAcademies';
import { reconcileActiveAcademy } from '../utils/active-academy.utils';

export function useActiveAcademyReconciliation(): void {
  const { activeAcademyId, setActiveAcademy } = usePlatform();
  const { data } = useAcademies();
  const academies = data?.items;

  useEffect(() => {
    const next = reconcileActiveAcademy(activeAcademyId, academies);
    if (next.changed) {
      setActiveAcademy(next.academyId);
    }
  }, [activeAcademyId, academies, setActiveAcademy]);
}
