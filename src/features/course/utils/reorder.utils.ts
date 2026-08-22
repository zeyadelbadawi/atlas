/**
 * Curriculum ordering helpers.
 *
 * Explicit move-up/move-down controls (rather than drag-and-drop) keep
 * reordering keyboard-accessible and RTL-safe by construction, with no new
 * dependency.
 */

/** Swaps an item with its neighbor in the given direction. Returns a new array. */
export function moveItem<TItem>(
  items: readonly TItem[],
  index: number,
  direction: 'up' | 'down'
): TItem[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return [...items];

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
