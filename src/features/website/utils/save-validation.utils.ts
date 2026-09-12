/**
 * Turning a rejected save into something the author can act on.
 *
 * WHAT WAS WRONG. Saving a page whose sections do not validate produced a
 * generic "Something went wrong · Please try again" strip with a Retry
 * button. The backend had in fact said precisely what was wrong —
 * `violations: [{ field: '0.config.title.en', messageKey:
 * 'validation:required' }, ...]` — and the editor threw all of it away.
 * Reproduced in production: add an About section, press Save, and the only
 * thing offered is Retry, which resubmits the identical invalid payload and
 * fails identically, forever.
 *
 * The author cannot even tell WHICH section is at fault on a page with
 * several of them, let alone which field.
 *
 * WHAT THE FIELD PATH LOOKS LIKE. The server validates the `sections`
 * array, so a path starts with the section's INDEX in that array:
 *
 *   0.config.title.en      → first section, its title, English
 *   2.config.items.1.label → third section, second item's label
 *
 * The index is what matters here: it identifies the card the author has to
 * open. The rest is summarised rather than reproduced field by field,
 * because the section's own form already marks its invalid inputs once it
 * is open.
 */
import type { FieldViolation } from '@types';

/** One section the server rejected, ready to name in a message. */
export interface RejectedSection {
  /** Position in the `sections` array, zero-based. */
  readonly index: number;
  /** Section type, when the index maps to a section the editor still holds. */
  readonly type?: string;
}

/** The leading array index of a violation path, or `undefined` if it has none. */
function sectionIndexOf(field: string): number | undefined {
  const [head] = field.split('.');
  const index = Number(head);
  return Number.isInteger(index) && index >= 0 ? index : undefined;
}

/**
 * Which sections a rejected save actually complained about, in page order
 * and without duplicates — several bad fields in one section are one thing
 * for the author to go and fix, not three.
 */
export function rejectedSections(
  violations: readonly FieldViolation[] | undefined,
  sections: readonly { readonly type: string }[]
): readonly RejectedSection[] {
  if (!violations?.length) return [];

  const indexes = new Set<number>();
  for (const violation of violations) {
    const index = sectionIndexOf(violation.field);
    if (index !== undefined) indexes.add(index);
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => ({ index, type: sections[index]?.type }));
}

/**
 * Whether this failure is the author's content being invalid, as opposed to
 * something they can usefully retry.
 *
 * Retrying an unchanged invalid payload cannot succeed, so the distinction
 * decides whether a Retry button is help or a trap.
 */
export function isContentValidationFailure(error: {
  readonly kind: string;
  readonly violations?: readonly FieldViolation[];
}): boolean {
  return error.kind === 'validation' && Boolean(error.violations?.length);
}
