/**
 * The marketing contact form's client-side rules.
 *
 * MIRRORS THE SERVER, it does not replace it: the same limits as
 * `PLATFORM_CONTACT_LIMITS` in the backend (`platform-contact.constants.ts`)
 * and the same "trim first, then measure" order as its DTO, so a value the
 * form accepts is a value the API accepts. The server stays the authority.
 *
 * Messages are translation keys (`home:contact.errors.*`); the component
 * interpolates `min`/`max` from `MARKETING_CONTACT_LIMITS`.
 */
import { z } from 'zod';
import { refinePhone } from '@components/phone';
import type { PlatformContactTopic } from '../services/PlatformContactService';

export const MARKETING_CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 200,
  emailMax: 320,
  organizationMax: 200,
  messageMin: 10,
  messageMax: 5000,
} as const;

export const MARKETING_CONTACT_TOPICS: readonly PlatformContactTopic[] = [
  'sales',
  'support',
  'partnership',
  'other',
];

const L = MARKETING_CONTACT_LIMITS;

/**
 * B0-SUP-04 — mirrors the backend's `CONTACT_CONSENT_WORDING_VERSION`: the
 * version the SERVER stamps on a ticked consent (the form sends only
 * true/false). Change both together whenever the consent wording in
 * `home:contact.consent.*` changes. `draft1` — DRAFT pending counsel.
 */
export const CONTACT_CONSENT_WORDING_VERSION = 'contact-consent-2026-10-draft1';

/** B0-SUP-04 — optional sales qualification answers (the server's CHECK-listed values). */
export const MARKETING_CONTACT_ROLES = [
  'academy_owner',
  'teacher',
  'centre_manager',
  'other',
] as const;
export const MARKETING_CONTACT_STUDENT_BANDS = [
  'under_50',
  '50_200',
  '200_1000',
  'over_1000',
] as const;
export const MARKETING_CONTACT_CHANNELS = [
  'whatsapp',
  'email',
  'phone_call',
] as const;
export const MARKETING_CONTACT_SUBJECT_MAX = 120;

const marketingContactObject = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'home:contact.errors.nameRequired')
    .min(L.nameMin, 'home:contact.errors.nameTooShort')
    .max(L.nameMax, 'home:contact.errors.nameTooLong'),
  email: z
    .string()
    .trim()
    .min(1, 'home:contact.errors.emailRequired')
    .max(L.emailMax, 'home:contact.errors.emailTooLong')
    .email('home:contact.errors.emailInvalid'),
  organizationName: z
    .string()
    .trim()
    .max(L.organizationMax, 'home:contact.errors.organizationTooLong'),
  topic: z.enum(['sales', 'support', 'partnership', 'other'], {
    errorMap: () => ({ message: 'home:contact.errors.topicRequired' }),
  }),
  message: z
    .string()
    .trim()
    .min(1, 'home:contact.errors.messageRequired')
    .min(L.messageMin, 'home:contact.errors.messageTooShort')
    .max(L.messageMax, 'home:contact.errors.messageTooLong'),
  /** Honeypot — never shown to people. */
  company: z.string(),
  // B0-SUP-04 — all optional; rendered only while `marketingContactConsent`
  // is on. Both consent boxes start UNTICKED.
  phoneCountry: z.string(),
  phoneNumber: z.string(),
  contactConsent: z.boolean(),
  marketingConsent: z.boolean(),
  requesterRole: z.enum(MARKETING_CONTACT_ROLES).optional(),
  subject: z
    .string()
    .trim()
    .max(MARKETING_CONTACT_SUBJECT_MAX, 'home:contact.errors.subjectTooLong'),
  studentBand: z.enum(MARKETING_CONTACT_STUDENT_BANDS).optional(),
  preferredChannel: z.enum(MARKETING_CONTACT_CHANNELS).optional(),
});

export const marketingContactSchema = marketingContactObject.superRefine(
  (data, context) => refinePhone(data, context, { required: false })
);

export type MarketingContactValues = z.input<typeof marketingContactSchema>;
export type MarketingContactParsed = z.output<typeof marketingContactSchema>;

/** A site path the API accepts as `sourcePath`, or `undefined`. */
export function toSourcePath(pathname: string): string | undefined {
  return /^\/[A-Za-z0-9\-._~/]*$/.test(pathname) && pathname.length <= 512
    ? pathname
    : undefined;
}
