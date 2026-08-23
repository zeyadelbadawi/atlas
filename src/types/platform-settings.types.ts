/**
 * Platform Settings types (Prompt 13).
 *
 * Replaces `GeneralSettings`/`SecuritySettings`'s decorative, unwired
 * controls (Prompt 3A) with a real, singleton configuration contract —
 * carrying exactly the fields those two forms already presented
 * (`platformName`/`platformDescription`/`supportEmail`,
 * `twoFactorRequired`/`sessionTimeoutMinutes`), no invented fields.
 */

export type PlatformSessionTimeout = 15 | 30 | 60 | 'never';

export interface PlatformConfiguration {
  readonly platformName: string;
  readonly platformDescription?: string;
  readonly supportEmail?: string;
  readonly twoFactorRequired: boolean;
  readonly sessionTimeoutMinutes: PlatformSessionTimeout;
}
