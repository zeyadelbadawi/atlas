/**
 * G1 — Growth & capacity: the Platform Owner API contract
 * (`platform-growth/*`), field for field (backend notes, 26 Oct 2026).
 * JSON camelCase; months are `YYYY-MM`, days `YYYY-MM-DD` (Cairo calendar),
 * instants ISO-8601 UTC; money is integer piastres (`…MinorUnits`) in EGP.
 */
import type {
  AcquisitionChannel,
  HeardFrom,
  SpendChannel,
} from '@utils/acquisition-channel.utils';

export type { AcquisitionChannel, HeardFrom, SpendChannel };

export interface GrowthSettings {
  readonly seasonStart: string;
  readonly seasonEnd: string;
  readonly weeklyOwnerHours: number;
  readonly onboardingCapPerWeek: number;
  readonly minutesPerOnboarding: number;
  readonly supportMinutesPerPayingOrgPerWeek: number;
  readonly hireWarnPayingOrgs: number;
  readonly hireNowPayingOrgs: number;
  readonly version: number;
  readonly updatedAt: string;
  readonly updatedByName: string | null;
}

export type GrowthSettingsFields = Omit<
  GrowthSettings,
  'version' | 'updatedAt' | 'updatedByName'
>;

export type UpdateGrowthSettingsPayload = Partial<GrowthSettingsFields> & {
  readonly version: number;
};

export interface SpendEntry {
  readonly id: string;
  readonly month: string;
  readonly channel: SpendChannel;
  readonly amountMinorUnits: number;
  readonly currency: 'EGP';
  readonly description: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdByName: string | null;
  readonly updatedByName: string | null;
}

/** `GET /platform-growth/spend`: the resolved window and its entries (month desc, channel, created). */
export interface SpendList {
  readonly from: string;
  readonly to: string;
  readonly items: readonly SpendEntry[];
}

export interface SpendWritePayload {
  readonly month: string;
  readonly channel: SpendChannel;
  readonly amountMinorUnits: number;
  readonly description?: string | null;
}

export interface MonthRange {
  readonly from: string;
  readonly to: string;
}

export interface CacChannelRow {
  readonly channel: SpendChannel;
  readonly signups: number;
  readonly paying: number;
  readonly foundingPaying: number;
  readonly spendMinorUnits: number;
  readonly cacMinorUnits: number | null;
}

export interface CacTotals {
  readonly signups: number;
  readonly paying: number;
  readonly foundingPaying: number;
  readonly spendMinorUnits: number;
  readonly blendedCacMinorUnits: number | null;
  readonly attributedSignups: number;
}

export interface CacMonth {
  readonly month: string;
  readonly channels: readonly CacChannelRow[];
  readonly totals: CacTotals;
}

export interface CacReport {
  readonly from: string;
  readonly to: string;
  readonly currency: 'EGP';
  /** Oldest → newest. */
  readonly months: readonly CacMonth[];
  readonly overall: CacTotals & { readonly channels: readonly CacChannelRow[] };
  readonly coverage: {
    readonly signups: number;
    readonly attributedSignups: number;
    readonly ratio: number | null;
  };
}

export const CAPACITY_ALERT_KEYS = [
  'onboarding_cap_reached',
  'hours_over_capacity',
  'hire_warn',
  'hire_now',
  'requests_backlog',
  'attribution_low',
  'season_soon',
  'in_season',
] as const;
export type CapacityAlertKey = (typeof CAPACITY_ALERT_KEYS)[number];
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CapacityAlert {
  readonly key: CapacityAlertKey;
  readonly severity: AlertSeverity;
  readonly params: Readonly<Record<string, number | string>>;
}

export type HiringState = 'ok' | 'warn' | 'hire';

export interface CapacityWeek {
  readonly start: string;
  readonly signups: number;
  readonly onboardings: number;
  readonly paidConversions: number;
}

export interface CapacityReport {
  readonly now: string;
  readonly timezone: 'Africa/Cairo';
  readonly season: {
    readonly start: string;
    readonly end: string;
    readonly inSeason: boolean;
    readonly daysToStart: number | null;
    readonly daysLeft: number | null;
  };
  readonly week: {
    readonly start: string;
    readonly end: string;
    readonly signups: number;
    readonly onboardings: number;
    readonly onboardingCap: number;
    readonly paidConversions: number;
  };
  readonly load: {
    readonly payingOrgs: number;
    readonly activeTrials: number;
    readonly estimatedHoursThisWeek: number;
    readonly ownerHours: number;
    readonly utilization: number;
  };
  readonly requests: {
    readonly open: number;
    readonly oldestOpenHours: number | null;
  };
  readonly hiring: {
    readonly payingOrgs: number;
    readonly warnAt: number;
    readonly hireAt: number;
    readonly state: HiringState;
  };
  readonly attribution: {
    readonly last30Signups: number;
    readonly last30Attributed: number;
    readonly ratio: number | null;
  };
  /** 12 weeks, oldest first; the last is the current week. */
  readonly weeks: readonly CapacityWeek[];
  /** Critical first, then warning, then info. */
  readonly alerts: readonly CapacityAlert[];
}

export type { ChannelDecidedBy, OrganizationAcquisition } from '@types';

export interface SetOrganizationChannelPayload {
  readonly channel: AcquisitionChannel | null;
  readonly note?: string | null;
}
