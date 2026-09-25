/**
 * Communication settings (P66) — email one-time codes, announcement
 * email and digests, at the academy and at the platform.
 *
 * Mirrors the backend contracts exactly:
 *  - `GET/PATCH /academies/:id/communication-settings`
 *  - `GET/PATCH /platform-settings/communications`
 */

/** When an academy asks learners for an emailed code at sign-in. */
export type AcademyEmailOtpPolicy = 'inherit' | 'new_device' | 'always' | 'off';

/** The platform-level policies have no `inherit` — there is nothing above them. */
export type PlatformEmailOtpPolicy = Exclude<AcademyEmailOtpPolicy, 'inherit'>;

export type LearnerDigestFrequency = 'immediate' | 'daily' | 'off';

export interface AcademyCommunicationSettings {
  readonly emailOtpPolicy: AcademyEmailOtpPolicy;
  readonly announcementEmailAllowed: boolean;
  readonly learnerDigestDefault: LearnerDigestFrequency;
  /**
   * `false` while these are deployment configuration rather than stored
   * data (no per-academy override exists yet) — the card renders read-only.
   */
  readonly editable?: boolean;
  /** The platform default an `inherit` academy actually gets. */
  readonly effectiveEmailOtpPolicy?: PlatformEmailOtpPolicy;
}

export type UpdateAcademyCommunicationSettingsPayload =
  Partial<AcademyCommunicationSettings>;

/** One configured email provider, as the backend reports it — never a secret. */
export interface EmailProviderStatus {
  readonly order: readonly string[];
  readonly active: string | null;
  readonly fromEmail: string | null;
  readonly configured: boolean;
}

export interface PlatformCommunicationSettings {
  readonly emailOtpPolicyManagement: PlatformEmailOtpPolicy;
  readonly emailOtpPolicyAcademyDefault: PlatformEmailOtpPolicy;
  /** 1–365. */
  readonly trustedDeviceDaysManagement: number;
  /** 1–365. */
  readonly trustedDeviceDaysAcademy: number;
  /** 0–23, in the recipient's local time. */
  readonly digestHourLocal: number;
  /** Percentages of the email quota at which an alert is raised. */
  readonly quotaAlertThresholds: readonly number[];
  /** Read-only. */
  readonly providerStatus: readonly EmailProviderStatus[];
  /** `false` while these are deployment configuration — the form renders read-only. */
  readonly editable?: boolean;
}

/** Everything but the read-only provider status. */
export type UpdatePlatformCommunicationSettingsPayload = Partial<
  Omit<PlatformCommunicationSettings, 'providerStatus'>
>;
