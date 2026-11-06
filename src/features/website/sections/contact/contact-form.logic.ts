/**
 * B9 (UX audit) — the academy website's Contact form rules, shared by every
 * theme's form (Modern Education, Atelier, Manara, Riwaq and the generic
 * `ContactSection`).
 *
 * The form checks what the API checks (`SubmitContactMessageDto`): name,
 * email and message are required, at most 200 / 320 / 5,000 characters,
 * and the email must pass class-validator's `@IsEmail()` (so "mona@example"
 * is refused here, not by a 400 after the visitor pressed Send). Values are
 * trimmed before they are checked and sent, so a field of spaces is empty.
 * Nothing is cut silently: a value over its limit is refused with the limit.
 */
import { isApiError, type ApiError } from '@api';
import { validationMessage } from '@forms/validation-message';
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
} from '@/features/website/constants/website.constants';

export type ContactFieldName = 'name' | 'email' | 'message';

/** The fields in the order the form shows them (and focuses the first problem). */
export const CONTACT_FIELD_ORDER: readonly ContactFieldName[] = [
  'name',
  'email',
  'message',
];

export const CONTACT_FIELD_MAX: Readonly<Record<ContactFieldName, number>> = {
  name: CONTACT_NAME_MAX_LENGTH,
  email: CONTACT_EMAIL_MAX_LENGTH,
  message: CONTACT_MESSAGE_MAX_LENGTH,
};

const ERRORS = 'website:renderer.contactForm.errors';

const REQUIRED_KEYS: Readonly<Record<ContactFieldName, string>> = {
  name: `${ERRORS}.nameRequired`,
  email: `${ERRORS}.emailRequired`,
  message: `${ERRORS}.messageRequired`,
};
const EMAIL_INVALID_KEY = `${ERRORS}.emailInvalid`;
const TOO_LONG_KEY = `${ERRORS}.tooLong`;
const SERVER_FIELD_KEY = `${ERRORS}.server`;

/**
 * The length class-validator's `@MaxLength` measures (validator.js
 * `isLength`): an emoji is one character, a variation selector none.
 */
export function serverLength(value: string): number {
  const presentation = value.match(/[\uFE0E\uFE0F]/g)?.length ?? 0;
  const surrogatePairs =
    value.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0;
  return value.length - presentation - surrogatePairs;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

const EMAIL_USER_PART =
  /^[a-z\d!#$%&'*+\-/=?^_`{|}~\u00A1-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i;
const QUOTED_EMAIL_USER =
  // eslint-disable-next-line no-control-regex -- the RFC's own character set
  /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;
const TLD =
  /^([a-z\u00A1-\u00A8\u00AA-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}|xn[a-z0-9-]{2,})$/i;

function isFullyQualifiedDomain(domain: string): boolean {
  const parts = domain.split('.');
  const tld = parts[parts.length - 1] ?? '';
  if (parts.length < 2 || !TLD.test(tld) || /\s/.test(tld)) return false;
  return parts.every(
    (part) =>
      part.length <= 63 &&
      /^[a-z\u00A1-\uFFFF0-9-]+$/i.test(part) &&
      !/[\uFF01-\uFF5E]/.test(part) &&
      !/^-|-$/.test(part)
  );
}

/**
 * The API's email rule — class-validator's `@IsEmail()` with its defaults
 * (validator.js `isEmail`): a top-level domain is required, so
 * "mona@example" is refused; no display names, no IP-address domains.
 */
export function isServerAcceptedEmail(value: string): boolean {
  if (value.length > 254) return false;
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) return false;
  const domain = value.slice(at + 1);
  let user = value.slice(0, at);
  if (utf8Bytes(user) > 64 || utf8Bytes(domain) > 254) return false;
  if (!isFullyQualifiedDomain(domain)) return false;
  if (user.length > 1 && user.startsWith('"') && user.endsWith('"')) {
    user = user.slice(1, -1);
    return QUOTED_EMAIL_USER.test(user);
  }
  return user.split('.').every((part) => EMAIL_USER_PART.test(part));
}

/** A field's problem as a (packed) translation key, or nothing. */
function checkField(field: ContactFieldName, raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return REQUIRED_KEYS[field];
  if (serverLength(value) > CONTACT_FIELD_MAX[field]) {
    return validationMessage(TOO_LONG_KEY, {
      max: CONTACT_FIELD_MAX[field],
      count: serverLength(value),
    });
  }
  if (field === 'email' && !isServerAcceptedEmail(value)) {
    return EMAIL_INVALID_KEY;
  }
  return undefined;
}

export interface ContactFormValues {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  /** The spam trap: never checked, sent only when a bot fills it. */
  readonly company: string;
}

/**
 * Every field's problem (a translation key, its numbers packed in). Plain
 * code rather than a schema library: this form is on every academy page
 * that has a Contact section, and a validation library would be downloaded
 * by every page of every theme (the packs share this chunk).
 */
export function validateContactForm(
  values: ContactFormValues
): Partial<Record<ContactFieldName, string>> {
  const errors: Partial<Record<ContactFieldName, string>> = {};
  for (const field of CONTACT_FIELD_ORDER) {
    const problem = checkField(field, values[field]);
    if (problem) errors[field] = problem;
  }
  return errors;
}

export const EMPTY_CONTACT_VALUES: ContactFormValues = {
  name: '',
  email: '',
  message: '',
  company: '',
};

/** What the server said about one of the form's fields, as the form's own message. */
export function contactViolationMessage(
  field: ContactFieldName,
  violation: { readonly messageKey: string; readonly values?: object }
): string {
  if (violation.messageKey === 'validation:required') {
    return REQUIRED_KEYS[field];
  }
  if (violation.messageKey === 'validation:invalidEmail') {
    return EMAIL_INVALID_KEY;
  }
  if (violation.messageKey === 'validation:maxLength') {
    return validationMessage(TOO_LONG_KEY, { max: CONTACT_FIELD_MAX[field] });
  }
  return SERVER_FIELD_KEY;
}

/** The server's refusals that land on one of the form's fields, first per field. */
export function contactFieldViolations(
  error: unknown
): Partial<Record<ContactFieldName, string>> {
  if (!isApiError(error) || error.kind !== 'validation') return {};
  const found: Partial<Record<ContactFieldName, string>> = {};
  for (const violation of error.violations ?? []) {
    const field = violation.field as ContactFieldName;
    if (CONTACT_FIELD_ORDER.includes(field) && !found[field]) {
      found[field] = contactViolationMessage(field, violation);
    }
  }
  return found;
}

/** Why a send failed, when no field can show it. */
export type ContactFailure =
  | {
      readonly kind: 'rateLimited';
      /** Whole minutes to wait, from `Retry-After`; absent when not sent. */
      readonly minutes?: number;
    }
  | { readonly kind: 'network' }
  | { readonly kind: 'server'; readonly requestId?: string }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'rejected' };

export function classifyContactFailure(error: unknown): ContactFailure {
  const apiError: ApiError | undefined = isApiError(error) ? error : undefined;
  switch (apiError?.kind) {
    case 'rateLimited':
      return apiError.retryAfterSeconds !== undefined
        ? {
            kind: 'rateLimited',
            minutes: Math.max(1, Math.ceil(apiError.retryAfterSeconds / 60)),
          }
        : { kind: 'rateLimited' };
    case 'network':
    case 'timeout':
    case 'cancelled':
      return { kind: 'network' };
    case 'notFound':
      return { kind: 'unavailable' };
    case 'validation':
      return { kind: 'rejected' };
    default:
      return apiError?.requestId
        ? { kind: 'server', requestId: apiError.requestId }
        : { kind: 'server' };
  }
}

/** Whether a Try again button helps: not while the visitor must wait, nor on a gone form. */
export function canRetryContact(failure: ContactFailure): boolean {
  return failure.kind === 'network' || failure.kind === 'server';
}

/**
 * The starter descriptions the academy templates give the Contact section
 * (atlas-backend `src/website/templates/*.template.ts`) that point the
 * visitor at contact details. On an academy with none to show, the
 * sentence would promise something that isn't there, so it is left out;
 * anything the owner wrote themselves is always shown.
 */
const DETAILS_STARTER_DESCRIPTIONS = new Set(
  [
    'Reach us directly using our contact details, or send a message using the form.',
    'تواصل معنا مباشرة عبر بيانات التواصل، أو أرسل رسالة باستخدام النموذج.',
    'Use our contact details, or leave a message with the form.',
    'استخدم بيانات التواصل، أو اترك رسالة عبر النموذج.',
    'Use the details below, or send a message with the form.',
    'استخدم البيانات أدناه، أو أرسل رسالة عبر النموذج.',
  ].map((text) => text.trim())
);

export function contactSectionDescription(
  description: string,
  hasChannels: boolean
): string {
  if (hasChannels) return description;
  return DETAILS_STARTER_DESCRIPTIONS.has(description.trim())
    ? ''
    : description;
}
