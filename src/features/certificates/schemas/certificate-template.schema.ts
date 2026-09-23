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

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'certificates:template.validation.invalidColor');

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
  // The four constrained colour roles. Cross-field readability/contrast is
  // enforced by the server (which owns the print-quality rules); the client
  // validates only the hex format so the picker never sends garbage.
  primaryColor: hexColor,
  accentColor: hexColor,
  textColor: hexColor,
  backgroundColor: hexColor,
});

export type CertificateTemplateFormData = z.infer<
  typeof certificateTemplateSchema
>;
