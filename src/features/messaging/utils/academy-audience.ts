/** W3-compose — the academy audience picker's draft and its API form. */
import type { AcademyAudience, AcademyStaffRole } from '../messaging.types';

export type AcademyAudienceType = AcademyAudience['type'];

export interface AcademyAudienceDraft {
  readonly type: AcademyAudienceType;
  readonly courseIds: readonly string[];
  readonly roles: readonly AcademyStaffRole[];
}

export const INITIAL_ACADEMY_AUDIENCE: AcademyAudienceDraft = {
  type: 'learners',
  courseIds: [],
  roles: [],
};

/** The draft as an API audience, or `null` while it is incomplete. */
export function toAcademyAudience(
  draft: AcademyAudienceDraft
): AcademyAudience | null {
  if (draft.type === 'learners') return { type: 'learners' };
  if (draft.type === 'courses') {
    return draft.courseIds.length > 0
      ? { type: 'courses', courseIds: [...draft.courseIds].sort() }
      : null;
  }
  return draft.roles.length > 0
    ? { type: 'staff', roles: [...draft.roles].sort() }
    : null;
}

export function toggle<T>(list: readonly T[], value: T, on: boolean): T[] {
  const without = list.filter((item) => item !== value);
  return on ? [...without, value] : without;
}
