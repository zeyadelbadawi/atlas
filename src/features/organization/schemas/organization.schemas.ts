/** Organization creation schema (Phase P19). Mirrors `createAcademySchema`'s own floors — `name` is the only field the real backend contract (`CreateOrganizationDto`) accepts. */
import { z } from 'zod';

const MAX_ORGANIZATION_NAME_LENGTH = 120;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ORGANIZATION_NAME_LENGTH, 'validation:maxLength'),
});

export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;
