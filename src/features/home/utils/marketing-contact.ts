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

export const marketingContactSchema = z.object({
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
});

export type MarketingContactValues = z.input<typeof marketingContactSchema>;
export type MarketingContactParsed = z.output<typeof marketingContactSchema>;

/** A site path the API accepts as `sourcePath`, or `undefined`. */
export function toSourcePath(pathname: string): string | undefined {
  return /^\/[A-Za-z0-9\-._~/]*$/.test(pathname) && pathname.length <= 512
    ? pathname
    : undefined;
}
