/**
 * Provisioning validation schemas.
 */
import { z } from 'zod';
import {
  MAX_SUBDOMAIN_LENGTH,
  MIN_SUBDOMAIN_LENGTH,
  SUBDOMAIN_REGEX,
} from '../constants/provisioning.constants';

export const createProvisioningRequestSchema = z.object({
  academyName: z.string().min(1, 'validation:required').max(100, 'validation:maxLength'),
  requestedSubdomain: z
    .string()
    .min(MIN_SUBDOMAIN_LENGTH, 'validation:minLength')
    .max(MAX_SUBDOMAIN_LENGTH, 'validation:maxLength')
    .regex(SUBDOMAIN_REGEX, 'validation:invalidSlug'),
});

export type CreateProvisioningRequestFormData = z.infer<
  typeof createProvisioningRequestSchema
>;
