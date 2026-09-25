/**
 * The languages a course can be taught in, and the two functions that keep
 * the picker honest about what is actually stored.
 *
 * THE STORAGE CONTRACT IS UNCHANGED. `Course.language` is one nullable
 * string column and `MAX_COURSE_LANGUAGE_LENGTH` is 35, so this is not a
 * place to start writing display names: "English, Arabic, French,
 * Spanish" is already over the limit. `course.types.ts` documents the
 * field as "Course language code as authored on the course (e.g. `en`,
 * `ar`)", so codes are what the field was always meant to hold and codes
 * are what the picker writes — comma-separated, no spaces wasted.
 *
 * EXISTING COURSES MUST SURVIVE. The field was a free-text input, so
 * whatever is in there now is whatever someone typed: `en`, `English`,
 * `English, Arabic`, `EN , ar`. `parseCourseLanguages` recognises a token
 * by code or by English name, case-insensitively, and — this is the part
 * that matters — **keeps a token it does not recognise** rather than
 * dropping it. A course whose language reads "Egyptian Arabic" still says
 * that after this change; the author sees it as a chip they can remove,
 * not a value that silently vanished the first time they opened the form.
 *
 * Display names are not hard-coded per locale: `Intl.DisplayNames` already
 * knows how to say "Arabic" in English and "العربية" in Arabic, and it
 * stays right for a locale nobody has translated by hand. `englishName` is
 * the fallback for the rare engine that cannot.
 */

export interface CourseLanguageOption {
  /** ISO 639-1, and exactly what is written to `Course.language`. */
  readonly code: string;
  /** Fallback label, and the second thing a legacy value is matched against. */
  readonly englishName: string;
}

export const COURSE_LANGUAGE_OPTIONS: readonly CourseLanguageOption[] = [
  { code: 'en', englishName: 'English' },
  { code: 'ar', englishName: 'Arabic' },
  { code: 'fr', englishName: 'French' },
  { code: 'de', englishName: 'German' },
  { code: 'es', englishName: 'Spanish' },
  { code: 'it', englishName: 'Italian' },
  { code: 'pt', englishName: 'Portuguese' },
  { code: 'tr', englishName: 'Turkish' },
  { code: 'ru', englishName: 'Russian' },
  { code: 'zh', englishName: 'Chinese' },
  { code: 'ja', englishName: 'Japanese' },
  { code: 'ko', englishName: 'Korean' },
];

/** The label to show for one stored token, in the reader's own locale. */
export function courseLanguageLabel(token: string, locale: string): string {
  const known = COURSE_LANGUAGE_OPTIONS.find((option) => option.code === token);
  if (!known) return token; // A legacy value: show it exactly as authored.
  try {
    const display = new Intl.DisplayNames([locale], { type: 'language' }).of(
      known.code
    );
    if (display && display !== known.code) return display;
  } catch {
    // Older engine, or a locale it does not carry — fall through.
  }
  return known.englishName;
}

/**
 * A stored value → the tokens the picker shows.
 *
 * Recognised tokens are canonicalised to their code so `English` and `en`
 * do not both appear as separate chips; unrecognised ones are preserved
 * verbatim. Order is the author's, and duplicates collapse.
 */
export function parseCourseLanguages(value: string | undefined | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of value.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lowered = trimmed.toLowerCase();
    const known = COURSE_LANGUAGE_OPTIONS.find(
      (option) =>
        option.code === lowered || option.englishName.toLowerCase() === lowered
    );
    const token = known ? known.code : trimmed;
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

/**
 * The tokens → the stored value.
 *
 * `undefined` for an empty selection, matching what the form already sent
 * for an empty input (`data.language || undefined`), so "no language" is
 * still absence rather than an empty string.
 */
export function serializeCourseLanguages(
  tokens: readonly string[]
): string | undefined {
  const value = tokens.map((token) => token.trim()).filter(Boolean).join(',');
  return value.length > 0 ? value : undefined;
}
