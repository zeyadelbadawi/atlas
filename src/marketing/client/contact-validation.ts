/**
 * Contact form checks for the static site, matching the app's
 * `features/home/utils/marketing-contact.ts` (and the backend's
 * `PLATFORM_CONTACT_LIMITS`). Kept dependency-free so the marketing bundle
 * does not pull in zod; `contact-validation.test.ts` pins the limits to the
 * app's constants.
 */
export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 200,
  emailMax: 320,
  organizationMax: 200,
  messageMin: 10,
  messageMax: 5000,
} as const;

/** The topics the form lists to every visitor. */
export const CONTACT_TOPICS = ['sales', 'support', 'partnership', 'other'] as const;

/**
 * B2 — topics the API accepts that the form lists only when a shared link
 * preselects them (`/contact?topic=founding`); never advertised in the list.
 */
export const CONTACT_LINK_ONLY_TOPICS = ['founding'] as const;

/** Every topic the API accepts (the backend's `PLATFORM_CONTACT_TOPICS`). */
export const CONTACT_ALL_TOPICS = [...CONTACT_TOPICS, ...CONTACT_LINK_ONLY_TOPICS] as const;

export type ContactField = 'name' | 'email' | 'organizationName' | 'topic' | 'message';

/** Error codes; the page renders a localized message per code (`data-err<Code>`). */
export type ContactErrorCode =
  | 'NameRequired'
  | 'NameTooShort'
  | 'NameTooLong'
  | 'EmailRequired'
  | 'EmailInvalid'
  | 'EmailTooLong'
  | 'OrganizationTooLong'
  | 'TopicInvalid'
  | 'MessageRequired'
  | 'MessageTooShort'
  | 'MessageTooLong';

export interface ContactInput {
  readonly name: string;
  readonly email: string;
  readonly organizationName?: string;
  readonly topic: string;
  readonly message: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(input: ContactInput): Partial<Record<ContactField, ContactErrorCode>> {
  const L = CONTACT_LIMITS;
  const errors: Partial<Record<ContactField, ContactErrorCode>> = {};
  const name = input.name.trim();
  if (!name) errors.name = 'NameRequired';
  else if (name.length < L.nameMin) errors.name = 'NameTooShort';
  else if (name.length > L.nameMax) errors.name = 'NameTooLong';

  const email = input.email.trim();
  if (!email) errors.email = 'EmailRequired';
  else if (email.length > L.emailMax) errors.email = 'EmailTooLong';
  else if (!EMAIL.test(email)) errors.email = 'EmailInvalid';

  if ((input.organizationName ?? '').trim().length > L.organizationMax) {
    errors.organizationName = 'OrganizationTooLong';
  }
  if (!(CONTACT_ALL_TOPICS as readonly string[]).includes(input.topic)) errors.topic = 'TopicInvalid';

  const message = input.message.trim();
  if (!message) errors.message = 'MessageRequired';
  else if (message.length < L.messageMin) errors.message = 'MessageTooShort';
  else if (message.length > L.messageMax) errors.message = 'MessageTooLong';
  return errors;
}
