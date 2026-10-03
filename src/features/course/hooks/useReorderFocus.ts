import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * useReorderFocus — keeps keyboard focus on the row that moved (course
 * builder reorders).
 *
 * Moving a row re-parents its DOM node, and browsers drop focus from a node
 * that is moved — so after "move down" focus used to land on `<body>`. A
 * caller registers each focusable control under a key (`register(key)`),
 * then `requestFocus([preferred, fallback…], expectedOrder)` once it
 * reorders; focus is restored after the list has actually rendered in
 * `expectedOrder` (pass `null` to restore on the next render regardless,
 * e.g. after a rollback or a refetch). A candidate that is really
 * `disabled` (the "up" button of a row that reached the top) is skipped in
 * favour of the next one.
 */
export function useReorderFocus(currentIds: readonly string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const refCallbacks = useRef(
    new Map<string, (element: HTMLElement | null) => void>()
  );
  const [pending, setPending] = useState<{
    readonly candidates: readonly string[];
    readonly order: string | null;
  } | null>(null);
  const orderKey = currentIds.join('|');

  const register = useCallback((key: string) => {
    let callback = refCallbacks.current.get(key);
    if (!callback) {
      callback = (element: HTMLElement | null) => {
        if (element) nodes.current.set(key, element);
        else nodes.current.delete(key);
      };
      refCallbacks.current.set(key, callback);
    }
    return callback;
  }, []);

  useLayoutEffect(() => {
    if (!pending) return;
    if (pending.order !== null && pending.order !== orderKey) return;
    const target = pending.candidates
      .map((key) => nodes.current.get(key))
      .find(
        (element): element is HTMLElement =>
          !!element &&
          !(element as HTMLButtonElement).disabled &&
          element.isConnected
      );
    target?.focus();
    setPending(null);
  }, [pending, orderKey]);

  const requestFocus = useCallback(
    (
      candidates: readonly string[],
      expectedOrder: readonly string[] | null
    ) => {
      setPending({
        candidates,
        order: expectedOrder ? expectedOrder.join('|') : null,
      });
    },
    []
  );

  return { register, requestFocus };
}
