/**
 * Section content issues — what the Section Editor, the Section Tree and
 * the Page Editor say about a section whose config does not validate.
 *
 * One source for both sides of the contract: the editor's own zod check
 * (`getSectionConfigSchema`) and the API's `violations` on a refused page
 * save (`{ field: '0.config.title.en', messageKey: 'validation:maxLength' }`
 * — the backend runs the identical schema, see the parity cases). Both are
 * reduced to a path RELATIVE to the section's config (`title.en`,
 * `items.1.title.ar`, `cta.label.en`) so a field can find its own message
 * whichever side found it.
 *
 * Over-limit content is the case that matters on load: limits tightened
 * after content was written (see "Section content limits" in
 * `website.constants.ts`), and reads never re-validate, so a page can
 * hold text the next save will refuse. `validation:maxLength` is the one
 * message key every string cap uses, on both sides, which is what
 * identifies it here.
 */
import { getSectionConfigSchema } from './website-section.schemas';
import { SECTION_TYPES } from '@types';
import type { FieldViolation, SectionType } from '@types';

/** The message key every string length cap uses, in both repos. */
export const MAX_LENGTH_MESSAGE_KEY = 'validation:maxLength';

export interface SectionContentIssue {
  /** Dot-joined path inside the section's `config`, e.g. `items.1.title.ar`. */
  readonly path: string;
  readonly messageKey: string;
  /** The limit an over-length string broke, when the check knows it (the editor's own check does; an API violation doesn't carry it). */
  readonly maximum?: number;
}

function isSectionType(type: string): type is SectionType {
  return (SECTION_TYPES as readonly string[]).includes(type);
}

/** Whether an issue is text over its length cap. */
export function isOverLimitIssue(issue: {
  readonly messageKey: string;
}): boolean {
  return issue.messageKey === MAX_LENGTH_MESSAGE_KEY;
}

/** Every issue the shared schema finds in one section's config; `[]` for a valid config or a type this build doesn't know. */
export function collectSectionIssues(
  type: string,
  config: unknown
): readonly SectionContentIssue[] {
  if (!isSectionType(type)) return [];
  const result = getSectionConfigSchema(type).safeParse(config);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    messageKey: issue.message,
    ...(issue.code === 'too_big' && issue.type === 'string'
      ? { maximum: Number(issue.maximum) }
      : {}),
  }));
}

/** Whether a section holds text over a current limit (e.g. saved before the limit tightened). */
export function sectionNeedsShortening(section: {
  readonly type: string;
  readonly config: unknown;
}): boolean {
  return collectSectionIssues(section.type, section.config).some(
    isOverLimitIssue
  );
}

/**
 * The API's page-save violations for the section at `index`, as
 * config-relative issues. A violation outside any section's `config`
 * (a duplicate id, the array itself) is not a field issue and is left out.
 */
export function sectionIssuesFromViolations(
  violations: readonly FieldViolation[] | undefined,
  index: number
): readonly SectionContentIssue[] {
  const prefix = `${index}.config.`;
  return (violations ?? [])
    .filter((violation) => violation.field.startsWith(prefix))
    .map((violation) => ({
      path: violation.field.slice(prefix.length),
      messageKey: violation.messageKey,
    }));
}
