/**
 * CMS phase 3d (batch C) — what the interest form's phone field loads on
 * demand (`InterestPhoneField`): the shared phone input (country picker +
 * number, the same control and rules as everywhere else in Atlas) and its
 * check. Imported only dynamically, so `libphonenumber-js` and the country
 * picker reach a public page only when it has an interest form, and only
 * once that form comes near the screen or is used.
 */
export { PhoneNumberInput } from '@/shared/components/phone/PhoneNumberInput';
export { checkPhone } from '@/shared/components/phone/phone-number';
