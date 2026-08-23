/**
 * Platform Settings validation schemas.
 */
import { z } from 'zod';

export const generalSettingsSchema = z.object({
  platformName: z.string().min(1, 'settings:general.platformNameRequired'),
  platformDescription: z.string().optional(),
  supportEmail: z
    .string()
    .email('validation:email')
    .optional()
    .or(z.literal('')),
});

export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;
