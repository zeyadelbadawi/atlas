/**
 * jsdom has no top layer: no element can be `:modal`, `:popover-open` or
 * `:fullscreen` there (it implements neither `showModal()`, the Popover
 * API nor the Fullscreen API), so those pseudo-classes match nothing.
 *
 * Why this is answered here rather than left to jsdom: its selector
 * engine (nwsapi 2.2.27, a transitive dependency of jsdom) resolves
 * `:modal` by calling `matches(':modal')` on the element again, which
 * routes straight back into nwsapi — a recursion that only ends when the
 * stack overflows, which nwsapi then catches and turns into `false`.
 * Floating UI asks exactly that (`isTopLayer`) on every position update
 * of a Radix popover, so one open popover blocked the test worker for
 * seconds per update — long enough to trip Vitest's worker RPC timeout
 * (`Timeout calling "onTaskUpdate"`) and fail the run with every test
 * passing. The answer is the same `false`; only the stack overflow is
 * skipped. Every other selector goes to jsdom unchanged.
 */
const TOP_LAYER_ONLY = new Set([':modal', ':popover-open', ':fullscreen']);

const nativeMatches = Element.prototype.matches;
Element.prototype.matches = function matches(
  this: Element,
  selectors: string
): boolean {
  if (TOP_LAYER_ONLY.has(String(selectors).trim())) return false;
  return nativeMatches.call(this, selectors);
};
