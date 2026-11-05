/**
 * Provisioning validation schemas.
 */
import { z } from 'zod';
import {
  MAX_SUBDOMAIN_LENGTH,
  MIN_SUBDOMAIN_LENGTH,
  SUBDOMAIN_REGEX,
} from '../constants/provisioning.constants';
import { validationMessage } from '@/shared/forms/validation-message';

export const createProvisioningRequestSchema = z.object({
  academyName: z
    .string()
    .min(1, 'validation:required')
    .max(100, validationMessage('validation:maxLength', { count: 100 })),
  requestedSubdomain: z
    .string()
    .min(
      MIN_SUBDOMAIN_LENGTH,
      validationMessage('validation:minLength', { count: MIN_SUBDOMAIN_LENGTH })
    )
    .max(
      MAX_SUBDOMAIN_LENGTH,
      validationMessage('validation:maxLength', { count: MAX_SUBDOMAIN_LENGTH })
    )
    .regex(SUBDOMAIN_REGEX, 'validation:invalidSlug'),
  /** Phase P19 — optional: the real Website Builder's own bootstrap default applies if the Client skips this step (see `Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md` P1-1's fix). */
  selectedThemeKey: z.string().optional(),
  /** Phase 6 (Bilingual Academy Websites) — see `CreateProvisioningRequestDto.websiteSetupMode`'s own doc comment for why the UI pre-selects `'complete'` while the schema itself treats an omitted value as `'empty'`. */
  websiteSetupMode: z.enum(['empty', 'complete']).optional(),
});

export type CreateProvisioningRequestFormData = z.infer<
  typeof createProvisioningRequestSchema
>;
