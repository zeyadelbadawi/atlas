/**
 * Whether each section of the visual editor's draft would be accepted as
 * it stands — the same schema the API applies (`getSectionConfigSchema`,
 * kept in parity with the backend), with the site's main language
 * required.
 *
 * The visual editor saves on its own, so it only sends a page whose every
 * section is valid (a half-typed one would be refused, and the whole page
 * with it), and it sends each section's parsed config — what the API
 * would store — while the draft keeps exactly what was typed.
 */
import type { SectionInstance } from '@types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import {
  getSectionConfigSchema,
  withRequiredLocale,
} from '../schemas/website-section.schemas';

function parse(section: SectionInstance, requiredLocale: PublicWebsiteLocale) {
  return withRequiredLocale(requiredLocale, () =>
    getSectionConfigSchema(section.type).safeParse(section.config)
  );
}

/** The ids of the sections that would be refused. */
export function invalidSectionIds(
  sections: readonly SectionInstance[],
  requiredLocale: PublicWebsiteLocale
): ReadonlySet<string> {
  return new Set(
    sections
      .filter((section) => !parse(section, requiredLocale).success)
      .map((section) => section.id)
  );
}

/** The sections as the API would store them (each config parsed). */
export function parsedSections(
  sections: readonly SectionInstance[],
  requiredLocale: PublicWebsiteLocale
): SectionInstance[] {
  return sections.map((section) => {
    const result = parse(section, requiredLocale);
    return result.success
      ? ({ ...section, config: result.data } as SectionInstance)
      : section;
  });
}
