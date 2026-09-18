/**
 * Domain validation schemas (Prompt 11; P63g).
 *
 * The value is trimmed and lowercased BEFORE validation (`preprocess`),
 * so a pasted " Learn.Example.com" is a valid hostname rather than a
 * rejected one, and the messages are the domain feature's own — never a
 * generic `{{field}}` template the form cannot interpolate.
 */
import { z } from 'zod';
import {
  HOSTNAME_REGEX,
  MAX_HOSTNAME_LENGTH,
  MIN_HOSTNAME_LENGTH,
} from '../constants/domain.constants';

const hostnameSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z
    .string()
    .min(MIN_HOSTNAME_LENGTH, 'website:domain.validation.tooShort')
    .max(MAX_HOSTNAME_LENGTH, 'website:domain.validation.tooLong')
    .regex(HOSTNAME_REGEX, 'website:domain.validation.invalid')
);

export const addCustomDomainSchema = z.object({ hostname: hostnameSchema });
export type AddCustomDomainFormData = z.infer<typeof addCustomDomainSchema>;

export const platformDomainSchema = z.object({ baseDomain: hostnameSchema });
export type PlatformDomainFormData = z.infer<typeof platformDomainSchema>;
