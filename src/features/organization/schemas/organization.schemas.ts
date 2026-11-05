/** Organization creation schema (Phase P19). Mirrors `createAcademySchema`'s own floors — `name` is the only field the real backend contract (`CreateOrganizationDto`) accepts. */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

const MAX_ORGANIZATION_NAME_LENGTH = 120;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    // B1 (V29) — only spaces is empty, not a name to send to the server.
    .trim()
    .min(1, 'validation:required')
    .max(
      MAX_ORGANIZATION_NAME_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ORGANIZATION_NAME_LENGTH,
      })
    ),
});

export type CreateOrganizationFormData = z.infer<
  typeof createOrganizationSchema
>;
