/**
 * The jsdom top-layer shim (`setup-jsdom.ts`): `:modal`, `:popover-open`
 * and `:fullscreen` answer `false` at once (jsdom has no top layer), and
 * every other selector still goes to jsdom.
 */
import { describe, expect, it } from 'vitest';

describe('jsdom top-layer pseudo-classes', () => {
  it('match nothing, without the recursive nwsapi path', () => {
    const element = document.createElement('div');
    document.body.append(element);
    const started = performance.now();
    for (const selector of [':modal', ':popover-open', ':fullscreen']) {
      expect(element.matches(selector)).toBe(false);
    }
    // The unshimmed path overflows the stack on every call (seconds).
    expect(performance.now() - started).toBeLessThan(50);
    element.remove();
  });

  it('leaves every other selector to jsdom', () => {
    const element = document.createElement('button');
    element.className = 'cta';
    expect(element.matches('button.cta')).toBe(true);
    expect(element.matches('a')).toBe(false);
    expect(() => element.matches('::not-a-selector(')).toThrow();
  });
});
