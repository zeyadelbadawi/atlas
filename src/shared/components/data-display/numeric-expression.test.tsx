/**
 * Bidi isolation for expressions whose order is the information.
 *
 * THE DEFECT THIS LOCKS DOWN. In production, an image 240 wide and 160 tall
 * was shown to Arabic users as `160×240`: the DOM text
 * was `240×160`, but `×` is a bidi-neutral character, so the Unicode bidi
 * algorithm treated the two digit runs as separate left-to-right runs inside
 * a right-to-left paragraph and laid them out right-to-left. The text is
 * correct and the rendering is wrong, which is why reading the source tells
 * you nothing.
 *
 * WHAT CAN AND CANNOT BE TESTED HERE. jsdom does not implement the bidi
 * algorithm — there is no layout, so no assertion can observe the visual
 * reversal. What these tests pin down is the mechanism that prevents it:
 * the rendered element must carry `dir="ltr"` (which the HTML UA stylesheet
 * pairs with `unicode-bidi: isolate`), and the string form must carry a real
 * LRI…PDI pair. Those are the two things that, if removed, bring the bug
 * back — so they are what the tests guard.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NumericExpression } from './NumericExpression';
import { isolateNumericExpression } from '@utils';

// Vitest runs without `globals`, so Testing Library's automatic unmount is
// never registered for us.
afterEach(cleanup);

const LRI = '\u2066'; // LEFT-TO-RIGHT ISOLATE
const PDI = '\u2069'; // POP DIRECTIONAL ISOLATE

describe('NumericExpression', () => {
  it('renders the expression in its written order', () => {
    render(<NumericExpression>240×160</NumericExpression>);
    expect(screen.getByText('240×160').textContent).toBe('240×160');
  });

  /*
   * The whole fix. Without `dir`, the element inherits the RTL paragraph
   * direction and the neutral separator lets the numbers swap.
   */
  it('forces a left-to-right run so the numbers cannot swap', () => {
    render(<NumericExpression>240×160</NumericExpression>);
    expect(screen.getByText('240×160').getAttribute('dir')).toBe('ltr');
  });

  it('stays inline so it does not break the sentence it sits in', () => {
    render(<NumericExpression>240×160</NumericExpression>);
    // A `span`, not a block: this appears mid-sentence in the media list.
    expect(screen.getByText('240×160').tagName).toBe('SPAN');
  });
});

describe('isolateNumericExpression', () => {
  it('wraps the expression in a directional isolate', () => {
    expect(isolateNumericExpression('240×160')).toBe(`${LRI}240×160${PDI}`);
  });

  /*
   * `16:9` reversed is `9:16` — not a formatting blemish but a different
   * aspect ratio, which is why the ratio is isolated as well as the size.
   */
  it('protects ratios, where a reversal names a different shape', () => {
    const isolated = isolateNumericExpression('16:9');
    expect(isolated.startsWith(LRI)).toBe(true);
    expect(isolated.endsWith(PDI)).toBe(true);
    expect(isolated.slice(1, -1)).toBe('16:9');
  });

  it('uses an isolate, not a bare left-to-right mark', () => {
    // U+200E only overrides direction; it does not seal the run off from
    // the neutrals around it, so it is not sufficient here.
    expect(isolateNumericExpression('4:3')).not.toContain('\u200e');
  });
});
