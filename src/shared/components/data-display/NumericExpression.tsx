/**
 * A numeric expression whose internal order carries meaning.
 *
 * WHAT WAS WRONG. An image 240 wide and 160 tall was displayed to Arabic
 * users as `160×240` — the wrong way round. The DOM text was correct; the
 * RENDERING was not. `×` is a bidi-neutral character (Unicode class ON), so
 * in an RTL paragraph it does not join the digits on either side into one
 * run. The algorithm sees two separate left-to-right number runs sitting in
 * a right-to-left paragraph and lays them out right-to-left, swapping them.
 * Nothing is misspelled and nothing is missing, which is exactly why it
 * survives review: the value is simply read back inverted.
 *
 * WHY A COMPONENT AND NOT A CHARACTER. Two Arabic strings in this codebase
 * already work around this by embedding U+200E LEFT-TO-RIGHT MARKs around
 * the dimensions. That works, but it is an invisible character in a
 * translation file: a translator reflowing the sentence, an editor
 * normalising whitespace, or a copy-paste through a tool that strips
 * formatting all silently reintroduce the bug, and the diff shows nothing.
 * `dir="ltr"` is visible in the source, survives tooling, and is what the
 * markup is for.
 *
 * `dir` on an element gives it `unicode-bidi: isolate` from the HTML UA
 * stylesheet, so the run is both forced left-to-right internally AND sealed
 * off from the surrounding text — the isolation matters as much as the
 * direction, because without it the expression would still interact with
 * the neutrals next to it.
 *
 * WHAT THIS IS NOT FOR. A plain single number needs none of this: one digit
 * run has no internal order to invert, and Arabic readers expect numbers to
 * sit naturally in the sentence flow. Use this only where a separator sits
 * BETWEEN numbers and the order is the information — dimensions, ranges,
 * ratios, scores, versions.
 */
import type { ReactNode } from 'react';
import { cn } from '@utils';

export interface NumericExpressionProps {
  /** The expression, written in its natural reading order (`240×160`). */
  readonly children: ReactNode;
  readonly className?: string;
}

export function NumericExpression({
  children,
  className,
}: NumericExpressionProps): JSX.Element {
  return (
    <span
      dir="ltr"
      // Inline-block would break the expression out of the sentence it sits
      // in; `dir` alone does the isolation, so this stays plain inline.
      className={cn('tabular-nums', className)}
      data-atlas-numeric="true"
    >
      {children}
    </span>
  );
}
