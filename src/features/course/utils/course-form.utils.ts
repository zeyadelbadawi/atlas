/**
 * B3 (UX audit) — small, dependency-free rules the course forms share.
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

/**
 * V22 — a lesson's content link must be a web address a learner can open:
 * `http:` or `https:` only. `z.string().url()` alone accepted
 * `javascript:alert(1)`, `data:` and `file:` links. Empty is "no link".
 */
export function isHttpUrl(value: string | undefined | null): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * V03 — a one-item-per-line list (outcomes, requirements). The textarea
 * keeps the author's raw lines until blur, so blank lines are not items:
 * the count ignores them, and a too-long line is named by its line number
 * in the box ("Line 4 is 320 characters…") instead of a bare "This field
 * must be 300 characters or fewer" under a box of twenty lines.
 */
export function linesListSchema(maxItems: number, maxLineLength: number) {
  return z.array(z.string()).superRefine((lines, ctx) => {
    const filled = lines.filter((line) => line.trim().length > 0).length;
    if (filled > maxItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationMessage('course:validation.tooManyLines', {
          count: filled,
          max: maxItems,
        }),
      });
      return;
    }
    const longIndex = lines.findIndex(
      (line) => line.trim().length > maxLineLength
    );
    if (longIndex !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationMessage('course:validation.lineTooLong', {
          line: longIndex + 1,
          length: lines[longIndex].trim().length,
          max: maxLineLength,
        }),
      });
    }
  });
}
