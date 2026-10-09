/**
 * Phone number — field, display, flags and the client-side rule
 * (docs/USER_PHONE.md).
 */
export { PhoneField } from './PhoneField';
export type { PhoneFieldProps } from './PhoneField';
export { PhoneNumberInput } from './PhoneNumberInput';
export type { PhoneNumberInputProps } from './PhoneNumberInput';
export { PhoneNumberDisplay } from './PhoneNumberDisplay';
export { CountryFlag } from './CountryFlag';
export { refinePhone, PHONE_ERROR_KEYS } from './phone-schema';
export {
  PHONE_INPUT_MAX_LENGTH,
  FALLBACK_PHONE_COUNTRY,
  checkPhone,
  defaultPhoneCountry,
  formatInternational,
  isPhoneCountry,
  phoneCountryOptions,
  toAsciiDigits,
} from './phone-number';
export type { CountryCode, PhoneCheck, PhoneIssue } from './phone-number';
