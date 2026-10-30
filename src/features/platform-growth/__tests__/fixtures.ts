/** Contract-shaped fixtures for the Growth & capacity tests (backend notes, 26 Oct 2026). */
import { SPEND_CHANNELS } from '@utils/acquisition-channel.utils';
import type {
  CacChannelRow,
  CacReport,
  CacTotals,
  CapacityReport,
  GrowthSettings,
  OrganizationAcquisition,
  SpendEntry,
} from '../types';

export function growthSettings(
  overrides: Partial<GrowthSettings> = {}
): GrowthSettings {
  return {
    seasonStart: '2027-06-01',
    seasonEnd: '2027-09-30',
    weeklyOwnerHours: 15,
    onboardingCapPerWeek: 5,
    minutesPerOnboarding: 120,
    supportMinutesPerPayingOrgPerWeek: 10,
    hireWarnPayingOrgs: 33,
    hireNowPayingOrgs: 40,
    version: 3,
    updatedAt: '2026-10-26T10:00:00.000Z',
    updatedByName: 'Ziad',
    ...overrides,
  };
}

export function spendEntry(overrides: Partial<SpendEntry> = {}): SpendEntry {
  return {
    id: 'spend-1',
    month: '2026-10',
    channel: 'meta_ads',
    amountMinorUnits: 125_050,
    currency: 'EGP',
    description: 'June campaign',
    version: 1,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    createdByName: 'Ziad',
    updatedByName: 'Ziad',
    ...overrides,
  };
}

/** All 15 channel rows (zeros), with `active` rows overriding. */
export function channelRows(
  active: Partial<Record<string, Partial<CacChannelRow>>> = {}
): CacChannelRow[] {
  return SPEND_CHANNELS.map((channel) => ({
    channel,
    signups: 0,
    paying: 0,
    foundingPaying: 0,
    spendMinorUnits: 0,
    cacMinorUnits: null,
    ...active[channel],
  }));
}

export function totals(overrides: Partial<CacTotals> = {}): CacTotals {
  return {
    signups: 0,
    paying: 0,
    foundingPaying: 0,
    spendMinorUnits: 0,
    blendedCacMinorUnits: null,
    attributedSignups: 0,
    ...overrides,
  };
}

export function cacReport(overrides: Partial<CacReport> = {}): CacReport {
  const september = {
    month: '2026-09',
    channels: channelRows(),
    totals: totals(),
  };
  const october = {
    month: '2026-10',
    channels: channelRows({
      meta_ads: {
        signups: 4,
        paying: 2,
        foundingPaying: 1,
        spendMinorUnits: 500_000,
        cacMinorUnits: 250_000,
      },
      youtube: { spendMinorUnits: 100_000 },
      whatsapp: { signups: 2, paying: 1, cacMinorUnits: 0 },
    }),
    totals: totals({
      signups: 8,
      paying: 3,
      foundingPaying: 1,
      spendMinorUnits: 600_000,
      blendedCacMinorUnits: 200_000,
      attributedSignups: 6,
    }),
  };
  return {
    from: '2026-09',
    to: '2026-10',
    currency: 'EGP',
    months: [september, october],
    overall: {
      ...october.totals,
      channels: october.channels,
    },
    coverage: { signups: 8, attributedSignups: 6, ratio: 0.75 },
    ...overrides,
  };
}

export function capacityReport(
  overrides: Partial<CapacityReport> = {}
): CapacityReport {
  return {
    now: '2026-10-26T10:00:00.000Z',
    timezone: 'Africa/Cairo',
    season: {
      start: '2027-06-01',
      end: '2027-09-30',
      inSeason: false,
      daysToStart: 218,
      daysLeft: null,
    },
    week: {
      start: '2026-10-24',
      end: '2026-10-30',
      signups: 6,
      onboardings: 5,
      onboardingCap: 5,
      paidConversions: 2,
    },
    load: {
      payingOrgs: 34,
      activeTrials: 7,
      estimatedHoursThisWeek: 15.7,
      ownerHours: 15,
      utilization: 1.05,
    },
    requests: { open: 3, oldestOpenHours: 20 },
    hiring: { payingOrgs: 34, warnAt: 33, hireAt: 40, state: 'warn' },
    attribution: { last30Signups: 20, last30Attributed: 15, ratio: 0.75 },
    weeks: Array.from({ length: 12 }, (_, index) => ({
      start: `2026-${index < 3 ? '08' : index < 7 ? '09' : '10'}-${String(
        1 + ((index * 7) % 28)
      ).padStart(2, '0')}`,
      signups: index,
      onboardings: Math.min(index, 5),
      paidConversions: Math.floor(index / 2),
    })),
    alerts: [
      {
        key: 'hours_over_capacity',
        severity: 'critical',
        params: { estimatedHours: 15.7, ownerHours: 15, utilization: 1.05 },
      },
      {
        key: 'onboarding_cap_reached',
        severity: 'warning',
        params: { onboardings: 5, cap: 5 },
      },
      {
        key: 'hire_warn',
        severity: 'warning',
        params: { payingOrgs: 34, warnAt: 33, hireAt: 40 },
      },
    ],
    ...overrides,
  };
}

export function acquisition(
  overrides: Partial<OrganizationAcquisition> = {}
): OrganizationAcquisition {
  return {
    resolvedChannel: 'facebook',
    decidedBy: 'utm',
    override: null,
    heardFrom: 'other',
    heardFromOther: 'A poster at the centre',
    attribution: {
      utmSource: 'facebook',
      utmCampaign: 'season-2027',
      referrerDomain: 'l.facebook.com',
      landingTemplate: 'pricing',
    },
    ...overrides,
  };
}
