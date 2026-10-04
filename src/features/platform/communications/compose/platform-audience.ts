/** W3-compose — the platform audience picker's draft and its API form. */
import type {
  PlatformAudience,
  SubscriptionStatusFilter,
} from '@features/messaging';

export type PlatformAudienceType = PlatformAudience['type'];

export interface PlatformAudienceDraft {
  readonly type: PlatformAudienceType;
  readonly planKeys: readonly string[];
  readonly subscriptionStatuses: readonly SubscriptionStatusFilter[];
  readonly organizationId: string | null;
  readonly organizationName: string | null;
}

export const INITIAL_PLATFORM_AUDIENCE: PlatformAudienceDraft = {
  type: 'org_owners',
  planKeys: [],
  subscriptionStatuses: [],
  organizationId: null,
  organizationName: null,
};

export function toPlatformAudience(
  draft: PlatformAudienceDraft
): PlatformAudience | null {
  switch (draft.type) {
    case 'org_owners':
      return { type: 'org_owners' };
    case 'academy_owners_admins':
      return { type: 'academy_owners_admins' };
    case 'academy_owners':
      return {
        type: 'academy_owners',
        ...(draft.planKeys.length
          ? { planKeys: [...draft.planKeys].sort() }
          : {}),
        ...(draft.subscriptionStatuses.length
          ? { subscriptionStatuses: [...draft.subscriptionStatuses].sort() }
          : {}),
      };
    case 'organization':
      return draft.organizationId
        ? { type: 'organization', organizationId: draft.organizationId }
        : null;
  }
}

export function toggle<T>(list: readonly T[], value: T, on: boolean): T[] {
  const without = list.filter((item) => item !== value);
  return on ? [...without, value] : without;
}
