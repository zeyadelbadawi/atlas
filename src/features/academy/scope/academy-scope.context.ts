/**
 * The academy scope (W5): which academy the current screen works in, read
 * from the URL, plus the caller's verified standing in it.
 */
import { createContext, useContext } from 'react';
import type { ApiError } from '@api';
import type { AcademyMembership } from '@types';

export interface AcademyAccessLostState {
  /** The academy that could not be opened (for the message). */
  readonly academyId: string;
  readonly academyName?: string;
  readonly reason: 'forbidden' | 'notFound';
}

export interface AcademyScopeValue {
  /** The academy the URL addresses; `undefined` outside `/dashboard/academy/:academyId/*`. */
  readonly academyId: string | undefined;
  /**
   * The caller's role/permissions in THAT academy — only ever the answer for
   * the current `academyId` (a late answer for the academy just left is
   * discarded), `undefined` while unresolved.
   */
  readonly membership: AcademyMembership | undefined;
  /** `true` while the membership check has no answer yet (first visit). */
  readonly isResolving: boolean;
  readonly error: ApiError | null;
  /** Academies the caller lost access to during this session (never offered again until reload). */
  readonly lostAcademyIds: ReadonlySet<string>;
  /** `true` when `academyId` is the academy the URL currently addresses. */
  readonly isCurrentAcademy: (academyId: string) => boolean;
}

export const AcademyScopeContext = createContext<AcademyScopeValue | undefined>(
  undefined
);
AcademyScopeContext.displayName = 'AcademyScopeContext';

const OUTSIDE_SCOPE: AcademyScopeValue = {
  academyId: undefined,
  membership: undefined,
  isResolving: false,
  error: null,
  lostAcademyIds: new Set(),
  isCurrentAcademy: () => false,
};

/**
 * The current academy scope. Outside the dashboard shell (tests, public
 * pages) it reports "no academy" rather than throwing.
 */
export function useAcademyScope(): AcademyScopeValue {
  return useContext(AcademyScopeContext) ?? OUTSIDE_SCOPE;
}
