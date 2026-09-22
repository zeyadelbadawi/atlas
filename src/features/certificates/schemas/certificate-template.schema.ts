/**
 * Certificate template form schema (P64 Phase 3, D6).
 *
 * Messages are translation keys resolved by `FormMessage`, matching every
 * other Atlas form schema. Images are URLs picked from the media library,
 * never typed, so they are only ever a string or null.
 */
import { z } from 'zod';

const wordingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'certificates:template.validation.titleRequired')
    .max(200),
  body: z
    .string()
    .trim()
    .min(1, 'certificates:template.validation.bodyRequired')
    .max(2000),
});

export const certificateTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'certificates:template.validation.nameRequired')
    .max(120),
  logoUrl: z.string().nullable(),
  signatureUrl: z.string().nullable(),
  signatoryName: z.string().trim().max(120),
  signatoryTitle: z.string().trim().max(120),
  wording: z.object({
    en: wordingSchema,
    ar: wordingSchema,
  }),
});

export type CertificateTemplateFormData = z.infer<
  typeof certificateTemplateSchema
>;
