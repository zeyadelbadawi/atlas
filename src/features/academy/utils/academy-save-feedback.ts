/**
 * B4 (UX audit) V10 — how Academy details (Settings) and Academy Profile
 * explain a failed save. One message per failure:
 *   - a violation on a field the form shows lands under that field, with
 *     the form's own label, and focus moves there — no toast;
 *   - anything else (409 "changed elsewhere — reload", 500, a lost
 *     connection) is ONE inline `SaveFailedAlert` with the real reason.
 */
import { hasViolationOn, isFieldViolationError } from '@forms';
import type { ApiError } from '@api';

/** API field → label key, for every field the two forms render. */
export const ACADEMY_DETAILS_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'academy:create.nameLabel',
  slug: 'academy:create.slugLabel',
  description: 'academy:create.descriptionLabel',
  language: 'academy:create.languageLabel',
  timezone: 'academy:create.timezoneLabel',
  currency: 'academy:create.currencyLabel',
  contactEmail: 'academy:create.contactEmailLabel',
  contactPhone: 'academy:create.contactPhoneLabel',
  website: 'academy:create.websiteLabel',
};

/** The Profile form also edits the address, sent nested as `address.*`. */
export const ACADEMY_PROFILE_FIELD_LABELS: Readonly<Record<string, string>> = {
  ...ACADEMY_DETAILS_FIELD_LABELS,
  'address.street': 'academy:profile.streetLabel',
  'address.city': 'academy:profile.cityLabel',
  'address.state': 'academy:profile.stateLabel',
  'address.postalCode': 'academy:profile.postalCodeLabel',
  'address.country': 'academy:create.countryLabel',
};

/** `address.postalCode` on the wire is `postalCode` in the Profile form. */
export const ACADEMY_PROFILE_FIELD_ALIASES = {
  'address.street': 'street',
  'address.city': 'city',
  'address.state': 'state',
  'address.postalCode': 'postalCode',
  'address.country': 'country',
} as const;

/** The failure a save shows as one inline alert, or `null` when its fields show it. */
export function inlineSaveFailure(
  error: ApiError | null,
  fieldLabels: Readonly<Record<string, string>>
): ApiError | null {
  if (!error) return null;
  if (isFieldViolationError(error) && hasViolationOn(error, fieldLabels)) {
    return null;
  }
  return error;
}
