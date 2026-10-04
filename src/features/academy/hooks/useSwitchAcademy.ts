/**
 * useSwitchAcademy (W5) — the one way the UI changes the active academy.
 *
 * A switch is a NAVIGATION, because the URL is the only source of truth:
 *   1. Unsaved changes: the target is a different pathname, so the app-wide
 *      `NavigationBlockDialog` (the router blocker every editor already
 *      registers with) asks first — Stay keeps the user and their edits in
 *      the current academy, and nothing below happens.
 *   2. PUSH, not replace: Back returns to the previous academy, Forward
 *      comes back, and each history entry is coherent (URL = content =
 *      sidebar).
 *   3. In-flight queries of the academy being left are cancelled by the
 *      academy scope as soon as the URL actually changes (also on Back/
 *      Forward), and a cancelled fetch's result is dropped — the race guard
 *      for responses from the old academy. Mutations carry their academy in
 *      their variables, so a save that settles after the switch still
 *      writes the academy it was made for.
 *   4. The target screen is the same screen in the other academy, without
 *      the old academy's resource ids (`switchTargetPath`).
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAcademyScope } from '../scope/academy-scope.context';
import { switchTargetPath } from '../scope/academy-scope-path';

export interface UseSwitchAcademyResult {
  /** Navigates to `nextAcademyId` (no-op for the current academy). */
  readonly switchAcademy: (nextAcademyId: string) => void;
  /** The academy the URL currently addresses. */
  readonly currentAcademyId: string | undefined;
}

export function useSwitchAcademy(): UseSwitchAcademyResult {
  const navigate = useNavigate();
  const location = useLocation();
  const { academyId } = useAcademyScope();

  const switchAcademy = useCallback(
    (nextAcademyId: string) => {
      if (!nextAcademyId || nextAcademyId === academyId) return;
      navigate(switchTargetPath(location.pathname, nextAcademyId));
    },
    [academyId, location.pathname, navigate]
  );

  return { switchAcademy, currentAcademyId: academyId };
}
