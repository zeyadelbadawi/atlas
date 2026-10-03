/**
 * Curriculum ordering helpers.
 *
 * The builder offers two equivalent ways to reorder: drag-and-drop
 * (`@dnd-kit`, pointer/touch/keyboard) and explicit move-up/move-down
 * buttons, which stay as the always-available accessible alternative. Both
 * compute the complete new order client-side and send it as `orderedIds`,
 * together with the order the author was looking at (`expectedOrderedIds`)
 * so the server can refuse a stale write (409 `stale_resource_version`).
 */
import { isApiError } from '@api';

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

/** Moves the item at `from` to `to` (drag-and-drop semantics). Returns a new array. */
export function moveItemTo<TItem>(
  items: readonly TItem[],
  from: number,
  to: number
): TItem[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Re-sorts `items` to match `orderedIds` and rewrites each item's `order`
 * to its new 0-based position — the optimistic cache shape after a reorder.
 * Items whose id is not in `orderedIds` keep their relative order at the end.
 */
export function applyOrder<
  TItem extends { readonly id: string; readonly order: number },
>(items: readonly TItem[], orderedIds: readonly string[]): TItem[] {
  const position = new Map(orderedIds.map((id, index) => [id, index]));
  const known = items
    .filter((item) => position.has(item.id))
    .sort((a, b) => position.get(a.id)! - position.get(b.id)!);
  const rest = items.filter((item) => !position.has(item.id));
  return [...known, ...rest].map((item, index) =>
    item.order === index ? item : { ...item, order: index }
  );
}

/** The server refused a reorder because the order changed since the author loaded it. */
export function isStaleOrderError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.code === 'stale_resource_version' ||
      (error.kind === 'conflict' &&
        error.messageKey === 'errors.concurrency.staleVersion'))
  );
}
