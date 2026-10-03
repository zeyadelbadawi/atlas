/**
 * W3-compose — who a Platform Owner broadcast goes to: every organization
 * owner; owners of academies on chosen plans and/or subscription statuses;
 * every academy owner and administrator; or one organization's people.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@hooks';
import { usePlanCatalog } from '@features/tenant';
import { usePlatformOrganizations } from '@features/platform/hooks';
import { cn } from '@/lib/utils';
import {
  SUBSCRIPTION_STATUSES,
  type PlatformAudience,
  type SubscriptionStatusFilter,
} from '../messaging.types';

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

export function toPlatformAudience(draft: PlatformAudienceDraft): PlatformAudience | null {
  switch (draft.type) {
    case 'org_owners':
      return { type: 'org_owners' };
    case 'academy_owners_admins':
      return { type: 'academy_owners_admins' };
    case 'academy_owners':
      return {
        type: 'academy_owners',
        ...(draft.planKeys.length ? { planKeys: [...draft.planKeys].sort() } : {}),
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

function toggle<T>(list: readonly T[], value: T, on: boolean): T[] {
  const without = list.filter((item) => item !== value);
  return on ? [...without, value] : without;
}

const TYPES: readonly PlatformAudienceType[] = [
  'org_owners',
  'academy_owners',
  'academy_owners_admins',
  'organization',
];

export interface PlatformAudiencePickerProps {
  readonly value: PlatformAudienceDraft;
  readonly onChange: (value: PlatformAudienceDraft) => void;
}

export function PlatformAudiencePicker({ value, onChange }: PlatformAudiencePickerProps): JSX.Element {
  const { t } = useTranslation();
  const groupId = useId();
  const searchId = useId();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim());
  const plans = usePlanCatalog();
  const organizations = usePlatformOrganizations({
    query: {
      pagination: { page: 1, pageSize: 10 },
      ...(debounced ? { search: debounced } : {}),
    },
  });

  return (
    <div className="space-y-3">
      <RadioGroup
        value={value.type}
        onValueChange={(type) => onChange({ ...value, type: type as PlatformAudienceType })}
        aria-label={t('messaging:composer.audience')}
        className="grid gap-2 sm:grid-cols-2"
      >
        {TYPES.map((type) => (
          <label
            key={type}
            htmlFor={`${groupId}-${type}`}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm has-[:checked]:border-primary"
          >
            <RadioGroupItem
              id={`${groupId}-${type}`}
              value={type}
              className="mt-0.5"
              data-testid={`audience-${type}`}
            />
            <span className="space-y-0.5">
              <span className="block font-medium">{t(`messaging:audience.platform.${type}`)}</span>
              <span className="block text-xs text-muted-foreground">
                {t(`messaging:audience.platform.${type}Help`)}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {value.type === 'academy_owners' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <fieldset className="space-y-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium">{t('messaging:audience.platform.plans')}</legend>
            {plans.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid max-h-56 gap-1 overflow-y-auto">
                {(plans.data ?? []).map((plan) => (
                  <label key={plan.key} className="flex min-h-11 items-center gap-3 text-sm">
                    <Checkbox
                      checked={value.planKeys.includes(plan.key)}
                      onCheckedChange={(checked) =>
                        onChange({ ...value, planKeys: toggle(value.planKeys, plan.key, checked === true) })
                      }
                    />
                    <span dir="auto">{plan.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('messaging:audience.platform.anyIfNone')}</p>
          </fieldset>
          <fieldset className="space-y-2 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium">{t('messaging:audience.platform.statuses')}</legend>
            <div className="grid max-h-56 gap-1 overflow-y-auto">
              {SUBSCRIPTION_STATUSES.map((status) => (
                <label key={status} className="flex min-h-11 items-center gap-3 text-sm">
                  <Checkbox
                    checked={value.subscriptionStatuses.includes(status)}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...value,
                        subscriptionStatuses: toggle(value.subscriptionStatuses, status, checked === true),
                      })
                    }
                  />
                  {t(`messaging:subscriptionStatus.${status}`)}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('messaging:audience.platform.anyIfNone')}</p>
          </fieldset>
        </div>
      ) : null}

      {value.type === 'organization' ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <Label htmlFor={searchId}>{t('messaging:audience.platform.searchOrganization')}</Label>
          <Input
            id={searchId}
            type="search"
            dir="auto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="organization-search"
          />
          {value.organizationId ? (
            <p className="text-sm" aria-live="polite">
              {t('messaging:audience.platform.selectedOrganization', {
                name: value.organizationName ?? '',
              })}
            </p>
          ) : null}
          {organizations.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto" aria-label={t('messaging:audience.platform.results')}>
              {(organizations.data?.items ?? []).map((organization) => {
                const selected = organization.id === value.organizationId;
                return (
                  <li key={organization.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 text-start text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                      onClick={() =>
                        onChange({
                          ...value,
                          organizationId: organization.id,
                          organizationName: organization.name,
                        })
                      }
                    >
                      <span className="min-w-0 truncate" dir="auto">
                        {organization.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t('messaging:audience.platform.memberCount', { count: organization.memberCount })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
