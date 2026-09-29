/**
 * The manifest contract, enforced by tests: every entry is well-formed, and
 * a `released` entry cannot exist without its version, LQIP and provenance.
 */
import { z } from 'zod';

const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const unit = z.number().min(0).max(1);

export const themeAssetProvenanceSchema = z.object({
  generator: z.literal('magnific'),
  tool: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(20),
  seed: z.number().int().nonnegative().optional(),
  jobId: z.string().min(1).optional(),
  generatedAt: z.string().datetime(),
  reviewer: z.string().min(1),
  reviewOutcome: z.literal('approved'),
  licenseBasis: z.string().min(10),
  masterSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const themeAssetEntrySchema = z
  .object({
    key: z.string().regex(KEY),
    purpose: z.string().min(3),
    ratio: z.string().regex(/^\d+:\d+$/),
    master: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    widths: z.array(z.number().int().positive()).min(1),
    focal: z.object({ x: unit, y: unit }),
    alt: z.object({ en: z.string().min(3), ar: z.string().min(3) }),
    direction: z.string().min(20),
    priority: z.boolean().optional(),
    budgetBytes: z.number().int().positive(),
    status: z.enum(['pending', 'released']),
    version: z
      .string()
      .regex(/^v[1-9]\d*$/)
      .optional(),
    // ≤ 300 bytes of image data (§E.3 step 5), as base64 in a data URL.
    lqip: z
      .string()
      .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/)
      .max(440)
      .optional(),
    provenance: themeAssetProvenanceSchema.optional(),
  })
  .superRefine((entry, ctx) => {
    const [w, h] = entry.ratio.split(':').map(Number);
    if (Math.abs(entry.master.width / entry.master.height - w / h) > 0.01) {
      ctx.addIssue({ code: 'custom', path: ['master'], message: 'ratio' });
    }
    const sorted = [...entry.widths].sort((a, b) => a - b);
    if (
      sorted.some((width, i) => width !== entry.widths[i]) ||
      new Set(entry.widths).size !== entry.widths.length ||
      sorted[sorted.length - 1] > entry.master.width
    ) {
      ctx.addIssue({ code: 'custom', path: ['widths'], message: 'widths' });
    }
    if (entry.status === 'released') {
      for (const field of ['version', 'lqip', 'provenance'] as const) {
        if (!entry[field]) {
          ctx.addIssue({ code: 'custom', path: [field], message: 'required' });
        }
      }
    }
  });

export const themeAssetManifestSchema = z.object({
  theme: z.string().regex(KEY),
  artDirection: z.string().min(20),
  exclusions: z.string().min(10),
  formats: z.array(z.enum(['avif', 'webp'])).min(1),
  assets: z.array(themeAssetEntrySchema),
});
