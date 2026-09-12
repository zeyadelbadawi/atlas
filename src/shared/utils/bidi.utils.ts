/**
 * Protecting expressions whose internal order carries meaning, in Arabic.
 *
 * WHAT GOES WRONG. `240×160` describes an image 240 wide and 160 tall. Drop
 * that string into an Arabic (right-to-left) paragraph and the Unicode bidi
 * algorithm renders it `160×240`. Nothing is mistranslated and nothing is
 * missing — `×` is a bidi-NEUTRAL character, so it does not bind the digits
 * on either side into one run. The algorithm sees two left-to-right number
 * runs inside a right-to-left paragraph, and orders those two runs
 * right-to-left. The value is read back inverted.
 *
 * It is not only `×`. `:` behaves the same way, so `16:9` renders as `9:16`
 * — not a cosmetic blemish but a different aspect ratio. Ranges, scores and
 * versions share the hazard. A lone number is safe: one run has no internal
 * order to invert, and it should stay in the sentence flow.
 *
 * WHERE TO USE WHICH. In JSX, prefer the `NumericExpression` component —
 * `dir="ltr"` is visible in the source and survives tooling. Use the
 * function here only where markup cannot reach: a value interpolated into a
 * translated sentence, an `aria-label`, a `title`.
 */

/**
 * U+2066 LEFT-TO-RIGHT ISOLATE, and U+2069 POP DIRECTIONAL ISOLATE.
 *
 * Escaped rather than written literally: these are invisible characters, and
 * source that depends on something a diff cannot show is source that quietly
 * loses the fix. Two Arabic strings in this codebase already carry bare
 * U+200E marks for the same purpose, which is exactly the fragility this
 * avoids.
 *
 * ISOLATE, NOT MARK. U+200E only sets a direction. The isolate pair also
 * seals the expression off from the neutral characters around it, so the
 * expression can neither be reordered by its surroundings nor reorder them.
 */
const LEFT_TO_RIGHT_ISOLATE = '\u2066';
const POP_DIRECTIONAL_ISOLATE = '\u2069';

/**
 * Wraps an expression so its internal order survives a right-to-left
 * paragraph.
 *
 * Safe to call unconditionally: in a left-to-right paragraph the isolate is
 * a no-op, so call sites do not need to branch on the active language, and
 * cannot drift out of sync with it.
 */
export function isolateNumericExpression(expression: string): string {
  return `${LEFT_TO_RIGHT_ISOLATE}${expression}${POP_DIRECTIONAL_ISOLATE}`;
}
