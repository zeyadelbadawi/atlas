/**
 * Domain validation schemas (Prompt 11).
 */
import { z } from 'zod';
import { HOSTNAME_REGEX, MAX_HOSTNAME_LENGTH, MIN_HOSTNAME_LENGTH } from '../constants/domain.constants';

export const addCustomDomainSchema = z.object({
  hostname: z
    .string()
    .min(MIN_HOSTNAME_LENGTH, 'validation:required')
    .max(MAX_HOSTNAME_LENGTH, 'validation:maxLength')
    .regex(HOSTNAME_REGEX, 'validation:invalidHostname')
    .transform((value) => value.trim().toLowerCase()),
});
export type AddCustomDomainFormData = z.infer<typeof addCustomDomainSchema>;

export const platformDomainSchema = z.object({
  baseDomain: z
    .string()
    .min(MIN_HOSTNAME_LENGTH, 'validation:required')
    .max(MAX_HOSTNAME_LENGTH, 'validation:maxLength')
    .regex(HOSTNAME_REGEX, 'validation:invalidHostname')
    .transform((value) => value.trim().toLowerCase()),
});
export type PlatformDomainFormData = z.infer<typeof platformDomainSchema>;
