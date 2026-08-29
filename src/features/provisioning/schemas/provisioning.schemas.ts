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
  /** Phase P19 — optional: the real Website Builder's own bootstrap default applies if the Client skips this step (see `Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md` P1-1's fix). */
  selectedThemeKey: z.string().optional(),
});

export type CreateProvisioningRequestFormData = z.infer<
  typeof createProvisioningRequestSchema
>;
