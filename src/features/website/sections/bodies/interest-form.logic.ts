/**
 * CMS phase 3d (batch C) — the interest form's rules, shared by every
 * theme: which fields the section shows (a choice list without options is
 * not shown, exactly as the API treats it), what a visitor must fill, and
 * the message that says how to fix each problem. The API checks the same
 * things against the published section; these only give instant feedback.
 */
import type {
  InterestFieldMode,
  InterestFormSectionConfig,
  PublicWebsiteLocale,
} from '@types';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
} from '@/features/website/constants/website.constants';

export type InterestFieldName =
  'name' | 'phone' | 'email' | 'choice' | 'message';

/** The fields in the order the form shows them (and focuses the first problem). */
export const INTEREST_FIELD_ORDER: readonly InterestFieldName[] = [
  'name',
  'phone',
  'email',
  'choice',
  'message',
];

export interface ResolvedInterestForm {
  readonly title: string;
  readonly description: string;
  readonly email: InterestFieldMode;
  readonly choice: InterestFieldMode;
  readonly message: InterestFieldMode;
  readonly choiceLabel: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly submitLabel: string;
  readonly successMessage: string;
}

function mode(value: unknown): InterestFieldMode {
  return value === 'optional' || value === 'required' ? value : 'hidden';
}

export function resolveInterestForm(
  config: InterestFormSectionConfig,
  locale: PublicWebsiteLocale
): ResolvedInterestForm {
  const options = (config.options ?? [])
    .map((option) => ({
      id: option.id,
      label: resolveLocalizedText(option.label, locale),
    }))
    .filter((option) => option.id && option.label);
  return {
    title: resolveLocalizedText(config.title, locale),
    description: resolveLocalizedText(config.description, locale),
    email: mode(config.emailField),
    choice: options.length > 0 ? mode(config.choiceField) : 'hidden',
    message: mode(config.messageField),
    choiceLabel: resolveLocalizedText(config.choiceLabel, locale),
    options,
    submitLabel: resolveLocalizedText(config.submitLabel, locale),
    successMessage: resolveLocalizedText(config.successMessage, locale),
  };
}

export interface InterestFormValues {
  readonly name: string;
  readonly phoneNumber: string;
  readonly phoneCountry: string;
  readonly email: string;
  readonly choice: string;
  readonly message: string;
}

/** The same shape the API's email check accepts in practice; the server decides. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What `checkPhone` (loaded with the phone field) says about a number. */
export type PhoneVerdict =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly issue:
        'required' | 'invalid' | 'countryMismatch' | 'invalidCountry';
    };

export const PHONE_ISSUE_KEYS: Readonly<
  Record<Exclude<PhoneVerdict, { ok: true }>['issue'], string>
> = {
  required: 'common:phone.errors.required',
  invalid: 'common:phone.errors.invalid',
  countryMismatch: 'common:phone.errors.countryMismatch',
  invalidCountry: 'common:phone.errors.country',
};

/**
 * Each field's problem as a translation key (with values), or nothing.
 * `checkPhone` is absent until the phone field's code has loaded; until
 * then only an empty number is flagged, and the submit waits for it.
 */
export function validateInterestForm(
  form: ResolvedInterestForm,
  values: InterestFormValues,
  checkPhone?: (number: string, country: string) => PhoneVerdict
): Partial<
  Record<InterestFieldName, { readonly key: string; readonly values?: object }>
> {
  const errors: Partial<
    Record<
      InterestFieldName,
      { readonly key: string; readonly values?: object }
    >
  > = {};
  if (!values.name.trim()) {
    errors.name = { key: 'website:renderer.interestForm.errors.name' };
  } else if (values.name.trim().length > CONTACT_NAME_MAX_LENGTH) {
    errors.name = {
      key: 'website:renderer.interestForm.errors.tooLong',
      values: { count: CONTACT_NAME_MAX_LENGTH },
    };
  }

  if (!values.phoneNumber.trim()) {
    errors.phone = { key: PHONE_ISSUE_KEYS.required };
  } else if (checkPhone) {
    const verdict = checkPhone(values.phoneNumber, values.phoneCountry);
    if (!verdict.ok) errors.phone = { key: PHONE_ISSUE_KEYS[verdict.issue] };
  }

  const email = values.email.trim();
  if (form.email !== 'hidden') {
    if (!email && form.email === 'required') {
      errors.email = {
        key: 'website:renderer.interestForm.errors.emailRequired',
      };
    } else if (
      email &&
      (!EMAIL_PATTERN.test(email) || email.length > CONTACT_EMAIL_MAX_LENGTH)
    ) {
      errors.email = {
        key: 'website:renderer.interestForm.errors.emailInvalid',
      };
    }
  }

  if (form.choice === 'required' && !values.choice) {
    errors.choice = {
      key: 'website:renderer.interestForm.errors.choice',
      values: { label: form.choiceLabel },
    };
  }

  if (form.message === 'required' && !values.message.trim()) {
    errors.message = { key: 'website:renderer.interestForm.errors.message' };
  }
  return errors;
}
