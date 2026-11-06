/**
 * B2 (UX audit, V20) — a section button set to "Web address" needs one.
 *
 * The shared schema (kept in parity with the API) accepts a button whose
 * `url` is still empty — the public site leaves such a button out. In the
 * editor that read as two contradicting things at once: the row said "Not
 * linked yet. It stays hidden on your site", while the preview showed the
 * button. Choosing "Web address" is a statement that the button opens one,
 * so the editor asks for it, by the field, before applying (the dialog)
 * or saving (the visual editor's autosave). Unsafe addresses
 * (`javascript:` and the like) stay refused by the schema itself.
 */
import { SECTION_BUTTON_SLOTS } from '@types';
import { SECTION_FIELD_SCHEMAS } from '../sections/section-fields.registry';
import type { SectionContentIssue } from '../schemas/section-content-issues';

/** The message for a "Web address" button with no address. */
export const BUTTON_URL_REQUIRED_KEY = 'website:buttons.urlRequired';

/** Whether a stored button is a "Web address" button still without one. */
function isExternalWithoutAddress(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const cta = value as Record<string, unknown>;
  // The same reading as the button editor's `inferLinkType`.
  if (cta.authAction !== undefined) return false;
  if (cta.courseId !== undefined) return false;
  if (cta.whatsapp !== undefined) return false;
  if (cta.phone !== undefined) return false;
  if (cta.pageId !== undefined && cta.pageId !== '') return false;
  return typeof cta.url === 'string' && cta.url.trim() === '';
}

/** The section's buttons whose link type is "Web address" but have none. */
export function collectButtonTargetIssues(
  type: string,
  config: unknown
): readonly SectionContentIssue[] {
  const schema =
    SECTION_FIELD_SCHEMAS[type as keyof typeof SECTION_FIELD_SCHEMAS];
  if (!schema || !config || typeof config !== 'object') return [];
  const values = config as Record<string, unknown>;
  const keys = new Set<string>();
  for (const field of schema.fields) {
    if (field.kind === 'buttons')
      SECTION_BUTTON_SLOTS.forEach((slot) => keys.add(slot));
    if (field.kind === 'cta') keys.add(field.key);
  }
  return [...keys]
    .filter((key) => isExternalWithoutAddress(values[key]))
    .map((key) => ({
      path: `${key}.url`,
      messageKey: BUTTON_URL_REQUIRED_KEY,
    }));
}
