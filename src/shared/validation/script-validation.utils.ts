/**
 * Language-aware validation for bilingual (English / Arabic) fields.
 *
 * THE HARD PART IS NOT DETECTING ARABIC — IT IS NOT REJECTING LEGITIMATE
 * CONTENT. A naive "every character must be in the Arabic block" check
 * rejects almost every real sentence an academy would write:
 *
 *     "دورة React للمبتدئين"          — a technical term
 *     "تواصل معنا: info@atlas.com"    — an email address
 *     "السعر ١٢٠ ج.م"                 — digits and a currency abbreviation
 *     "شهادة PDF معتمدة"              — an abbreviation
 *     "ورشة عمل 2026"                 — a year
 *
 * All five are correct Arabic copy. A validator that flags them trains
 * people to ignore validation, which is worse than having none.
 *
 * SO THE RULE IS "PREDOMINANTLY", NOT "EXCLUSIVELY":
 *
 *   1. URLs, emails and @handles are removed first — they are never in
 *      any natural script and their letters would skew the count.
 *   2. Digits (ASCII and Arabic-Indic), punctuation, currency symbols,
 *      whitespace and emoji are ignored entirely. They are script-neutral.
 *   3. Of the WORDS that remain, at least half must be in the expected
 *      script. That admits brand names and technical terms as a minority
 *      while still catching a field filled in with the wrong language.
 *      (Words, not characters — see `countScripts` for why that
 *      distinction is load-bearing rather than cosmetic.)
 *   4. Text with no letters at all — "2026", "+20 100 123 4567", "١٢٠" —
 *      is accepted. There is nothing to judge.
 */

/**
 * Arabic LETTERS — written as explicit code points rather than pasted
 * characters, because two of the boundaries matter and are invisible when
 * pasted:
 *
 *   - U+0660–U+0669 (Arabic-Indic digits) are excluded. They are digits,
 *     and this module's whole premise is that digits are script-neutral —
 *     counting them as Arabic would make "2026" vs "٢٠٢٦" change whether
 *     a field validates.
 *   - The Presentation Forms-B range stops at U+FEFC, not U+FEFF. U+FEFF
 *     is the zero-width no-break space / byte-order mark, not a letter;
 *     including it would classify an invisible character as Arabic text.
 */
const ARABIC_LETTER =
  /[\u0620-\u064A\u0671-\u06D3\u06FA-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/;

/** Latin letters, including the accented ranges. */
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/;

/**
 * Removes spans that are legitimately script-neutral regardless of the
 * field's language, so their letters never count toward either side.
 */
function stripNeutralSpans(value: string): string {
  return (
    value
      // URLs, with or without a scheme.
      .replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ')
      // Email addresses and @handles.
      .replace(/\S+@\S+/g, ' ')
      // Bare domains like "atlas.com" or "example.co.uk".
      .replace(/\b[\w-]+(?:\.[\w-]+)+\b/g, ' ')
  );
}

export interface ScriptCounts {
  readonly arabic: number;
  readonly latin: number;
}

/**
 * Counts WORDS by script, not characters.
 *
 * Characters were the obvious first choice and they are measurably wrong:
 * Arabic orthography omits short vowels, so Arabic words are shorter than
 * their Latin equivalents. Counting characters therefore biases every
 * mixed string toward "Latin" — "دورة React" is 4 Arabic characters
 * against 5 Latin ones and gets rejected, even though it is an entirely
 * ordinary Arabic course title with one technical term in it.
 *
 * By word it is one and one, which is what a reader would say too. A
 * word is attributed to whichever script most of its letters belong to,
 * so a suffixed loanword still counts once.
 */
export function countScripts(value: string): ScriptCounts {
  const text = stripNeutralSpans(value);
  let arabic = 0;
  let latin = 0;

  for (const token of text.split(/\s+/)) {
    let tokenArabic = 0;
    let tokenLatin = 0;
    for (const char of token) {
      if (ARABIC_LETTER.test(char)) tokenArabic += 1;
      else if (LATIN_LETTER.test(char)) tokenLatin += 1;
    }
    // Tokens with no letters — "2026", "—", "$120" — are script-neutral
    // and counted for neither side.
    if (tokenArabic === 0 && tokenLatin === 0) continue;
    if (tokenArabic >= tokenLatin) arabic += 1;
    else latin += 1;
  }

  return { arabic, latin };
}

/**
 * Whether `value` is acceptable content for a field of `language`.
 *
 * Empty, whitespace-only and letter-free values are accepted — emptiness
 * is a separate concern (a `required` rule), and "2026" is a legitimate
 * value in either language.
 */
export function isAcceptableForLanguage(
  value: string,
  language: 'en' | 'ar'
): boolean {
  if (!value.trim()) return true;

  const { arabic, latin } = countScripts(value);
  const total = arabic + latin;
  if (total === 0) return true;

  const expected = language === 'ar' ? arabic : latin;
  // At least half the WORDS must be the expected script. A tie passes:
  // a short Arabic label carrying one English brand name is fine.
  return expected * 2 >= total;
}

/** Translation key for the message to show when `isAcceptableForLanguage` fails. */
export function scriptViolationMessageKey(language: 'en' | 'ar'): string {
  return language === 'ar'
    ? 'validation:language.expectedArabic'
    : 'validation:language.expectedEnglish';
}

/* ------------------------------------------------------------------ *
 * Numeric fields, validated by their SEMANTIC purpose.
 *
 * "It is a number" is not a useful rule: a year, a percentage, a price
 * and a phone number all fail in different ways and need different
 * messages. Phone numbers in particular are NOT integers — international
 * formatting carries "+", spaces, hyphens and parentheses, and treating
 * them as integers rejects every correctly written international number.
 * ------------------------------------------------------------------ */

export type NumericFieldKind =
  | 'integer'
  | 'decimal'
  | 'percentage'
  | 'price'
  | 'duration'
  | 'year'
  | 'count'
  | 'phone';

export interface NumericValidationResult {
  readonly valid: boolean;
  /** Translation key describing the failure, absent when valid. */
  readonly messageKey?: string;
}

const VALID: NumericValidationResult = { valid: true };

/** Accepts Arabic-Indic digits too, so an Arabic-locale user can type naturally. */
function toWesternDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function validateNumericField(
  rawValue: string,
  kind: NumericFieldKind
): NumericValidationResult {
  const value = toWesternDigits(rawValue).trim();
  if (!value) return VALID; // Emptiness is `required`'s job, not this.

  if (kind === 'phone') {
    // E.164-ish with human formatting: an optional leading +, then 7-15
    // digits, with spaces, hyphens, dots and parentheses allowed between
    // them. Deliberately NOT `Number.isInteger` — "+20 100 123 4567" is a
    // correct phone number and not an integer.
    const digits = value.replace(/[^\d]/g, '');
    const shapeOk = /^\+?[\d\s().-]+$/.test(value);
    if (!shapeOk || digits.length < 7 || digits.length > 15) {
      return { valid: false, messageKey: 'validation:numeric.phone' };
    }
    return VALID;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return { valid: false, messageKey: 'validation:numeric.notANumber' };
  }

  switch (kind) {
    case 'integer':
      return Number.isInteger(numeric)
        ? VALID
        : { valid: false, messageKey: 'validation:numeric.integer' };

    case 'count':
      return Number.isInteger(numeric) && numeric >= 0
        ? VALID
        : { valid: false, messageKey: 'validation:numeric.count' };

    case 'percentage':
      return numeric >= 0 && numeric <= 100
        ? VALID
        : { valid: false, messageKey: 'validation:numeric.percentage' };

    case 'price':
      // Money is never negative here, and sub-cent precision is a data
      // entry mistake rather than a currency Atlas supports.
      return numeric >= 0 && /^\d+(\.\d{1,2})?$/.test(value)
        ? VALID
        : { valid: false, messageKey: 'validation:numeric.price' };

    case 'duration':
      return numeric > 0
        ? VALID
        : { valid: false, messageKey: 'validation:numeric.duration' };

    case 'year': {
      // Bounded rather than open-ended: a four-digit year in a plausible
      // range catches the common typo (a phone number or an id pasted
      // into a year field) without guessing at business meaning.
      const current = new Date().getFullYear();
      return Number.isInteger(numeric) &&
        numeric >= 1900 &&
        numeric <= current + 10
        ? VALID
        : { valid: false, messageKey: 'validation:numeric.year' };
    }

    case 'decimal':
    default:
      return VALID;
  }
}
