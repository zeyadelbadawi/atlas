/**
 * Forensic watermark codes on the client (docs/FORENSIC_WATERMARK.md).
 *
 * A FAITHFUL PORT of the backend's rule
 * (`atlas-backend/src/forensic-watermark/utils/watermark-code.util.ts`):
 * the same Crockford base32 alphabet, the same mod-37 check symbol and the
 * same normalisation. It exists so the lookup page can tell an operator
 * that a code was misread BEFORE anything is sent — a lookup is audited and
 * rate-limited, so a typo must not cost one. The server re-checks every
 * code itself; this is feedback, never the control.
 *
 * SHAPE. Ten symbols — nine data symbols, then one check symbol — shown as
 * two groups of five: `7K3QM-X9TR2`. Crockford's alphabet has no I, L, O or
 * U, so the classic OCR confusions (O/0, I/1/L) have only one reading, and
 * a single misread symbol (or two adjacent symbols swapped) fails the check.
 *
 * Keep this file in step with the backend: the test vectors in
 * `watermark-code.utils.test.ts` are the backend spec's.
 */

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** The full mod-37 check alphabet; values 32–36 are never issued by the backend. */
const CHECK_ALPHABET = `${CROCKFORD_ALPHABET}*~$=U`;
export const WATERMARK_CODE_DATA_LENGTH = 9;
export const WATERMARK_CODE_LENGTH = WATERMARK_CODE_DATA_LENGTH + 1;
/**
 * What the placeholder and the help text show. A VALID code (its check
 * symbol is `7`), so an operator who types it to try the field sees it
 * accepted — the docs' illustrative `7K3QM-X9TR2` fails the check.
 */
export const WATERMARK_CODE_EXAMPLE = '7K3QM-X9TR7';

const VALUE_OF = new Map<string, number>(
  [...CROCKFORD_ALPHABET].map((symbol, index) => [symbol, index])
);

/** Crockford mod-37 of a base32 data string (no check symbol). */
export function crockfordCheckValue(data: string): number {
  let remainder = 0;
  for (const symbol of data) {
    const value = VALUE_OF.get(symbol);
    if (value === undefined) throw new Error('Not a Crockford base32 symbol.');
    remainder = (remainder * 32 + value) % 37;
  }
  return remainder;
}

export function crockfordCheckSymbol(data: string): string {
  return CHECK_ALPHABET[crockfordCheckValue(data)];
}

/** `7K3QMX9TR2` → `7K3QM-X9TR2`; anything not ten symbols long is returned unchanged. */
export function formatWatermarkCode(code: string): string {
  return code.length === WATERMARK_CODE_LENGTH
    ? `${code.slice(0, 5)}-${code.slice(5)}`
    : code;
}

/**
 * The same grouping for a code still being typed: `7K3QMX9` → `7K3QM-X9`.
 * Used only to echo the normalised input back to the operator.
 */
export function formatPartialWatermarkCode(normalized: string): string {
  return normalized.length > 5
    ? `${normalized.slice(0, 5)}-${normalized.slice(5)}`
    : normalized;
}

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export type WatermarkCodeProblem = 'empty' | 'length' | 'symbol' | 'checksum';

export type NormalizedWatermarkCode =
  | { readonly ok: true; readonly code: string; readonly display: string }
  | {
      readonly ok: false;
      readonly problem: WatermarkCodeProblem;
      /** The input after normalisation, for "did you mean" feedback. */
      readonly normalized: string;
    };

/**
 * Turns whatever a person typed or pasted from a recording into a code.
 *
 * Case-insensitive; spaces, dashes, dots, underscores and slashes are
 * dropped; Crockford's own aliases are applied (O→0, I/L→1); Arabic-Indic
 * digits are read as Latin digits, because an operator with an Arabic
 * keyboard layout types them. The check symbol is verified, so a misread is
 * reported as a misread rather than as "not found".
 */
export function normalizeWatermarkCode(input: string): NormalizedWatermarkCode {
  const normalized = [...(input ?? '').normalize('NFKC').toUpperCase()]
    .map((symbol) => {
      const arabic = ARABIC_INDIC_DIGITS.indexOf(symbol);
      if (arabic >= 0) return String(arabic);
      const extended = EXTENDED_ARABIC_INDIC_DIGITS.indexOf(symbol);
      if (extended >= 0) return String(extended);
      if (symbol === 'O') return '0';
      if (symbol === 'I' || symbol === 'L') return '1';
      return symbol;
    })
    .filter((symbol) => !/[\s\-–—._/\\·•]/.test(symbol))
    .join('');

  if (normalized.length === 0)
    return { ok: false, problem: 'empty', normalized };
  if (normalized.length !== WATERMARK_CODE_LENGTH) {
    return { ok: false, problem: 'length', normalized };
  }
  if (![...normalized].every((symbol) => VALUE_OF.has(symbol))) {
    return { ok: false, problem: 'symbol', normalized };
  }
  const data = normalized.slice(0, WATERMARK_CODE_DATA_LENGTH);
  if (crockfordCheckSymbol(data) !== normalized[WATERMARK_CODE_DATA_LENGTH]) {
    return { ok: false, problem: 'checksum', normalized };
  }
  return {
    ok: true,
    code: normalized,
    display: formatWatermarkCode(normalized),
  };
}

/** Whether `input` normalises to a well-formed code with a matching check symbol. */
export function isValidWatermarkCode(input: string): boolean {
  return normalizeWatermarkCode(input).ok;
}

/**
 * The characters of a normalised input that can never appear in a code
 * (e.g. `U`, `#`), de-duplicated in order — shown so the operator sees
 * exactly which one to re-read.
 */
export function invalidWatermarkSymbols(normalized: string): string[] {
  return [
    ...new Set([...normalized].filter((symbol) => !VALUE_OF.has(symbol))),
  ];
}
