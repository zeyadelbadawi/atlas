/**
 * Undo / redo for the visual editor's sections.
 *
 * Every change the author makes goes through `record(next, group?)`, which
 * keeps the list as it was so it can be put back. Changes with the same
 * `group` arriving close together (typing into one section's fields) are
 * one step, not one per keystroke. `revision` changes on every undo and
 * redo: the settings form is keyed by it, so it re-reads the restored
 * values instead of keeping what was typed.
 *
 * A change that is not the author's (the server's copy adopted after a
 * save) does not go through `record`, so it is never an undo step.
 *
 * `{ sticky: true }` keeps a group one step however long the author takes
 * between changes — an inline text edit on the canvas is one step from the
 * moment it starts to the moment it is committed. A grouped change that
 * brings the sections back to where its step began (an edit cancelled)
 * removes that step instead of leaving an empty one.
 */
import { useCallback, useRef, useState } from 'react';
import type { SectionInstance } from '@types';
import { stableJsonKey } from '../utils/stable-json.utils';

/** How many steps back the author can go. */
export const HISTORY_LIMIT = 50;
/** Changes of one group closer together than this are one step. */
export const HISTORY_COALESCE_MS = 800;

type Sections = SectionInstance[];

export interface RecordOptions {
  /** Coalesce with the same group regardless of the time between changes. */
  readonly sticky?: boolean;
}

export interface EditHistory {
  readonly record: (
    next: Sections,
    group?: string,
    options?: RecordOptions
  ) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly revision: number;
  /** Forgets every step (another version of the page was loaded). */
  readonly reset: () => void;
}

export function useEditHistory(
  current: Sections,
  apply: (sections: Sections) => void,
  now: () => number = Date.now
): EditHistory {
  const past = useRef<Sections[]>([]);
  const future = useRef<Sections[]>([]);
  const last = useRef<{ group?: string; at: number }>({ at: 0 });
  const currentRef = useRef(current);
  currentRef.current = current;
  const [, setVersion] = useState(0);
  const [revision, setRevision] = useState(0);
  const changed = () => setVersion((n) => n + 1);

  const record = useCallback(
    (next: Sections, group?: string, options?: RecordOptions) => {
      // Nothing changed (a control set to the value it had): no step.
      const nextKey = stableJsonKey(next);
      if (nextKey === stableJsonKey(currentRef.current)) return;
      const at = now();
      const coalesce =
        group !== undefined &&
        last.current.group === group &&
        (options?.sticky || at - last.current.at < HISTORY_COALESCE_MS) &&
        past.current.length > 0;
      let returnedToStart = false;
      if (!coalesce) {
        past.current = [...past.current, currentRef.current].slice(
          -HISTORY_LIMIT
        );
      } else {
        const start = past.current[past.current.length - 1];
        // Back where this step began: the step is gone, not empty.
        if (start && stableJsonKey(start) === nextKey) {
          past.current = past.current.slice(0, -1);
          returnedToStart = true;
        }
      }
      future.current = [];
      // A removed step has nothing left to join: the next change starts one.
      last.current = returnedToStart ? { at: 0 } : { group, at };
      apply(next);
      changed();
    },
    [apply, now]
  );

  const undo = useCallback(() => {
    const previous = past.current[past.current.length - 1];
    if (!previous) return;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, currentRef.current];
    last.current = { at: 0 };
    apply(previous);
    setRevision((n) => n + 1);
  }, [apply]);

  const redo = useCallback(() => {
    const next = future.current[future.current.length - 1];
    if (!next) return;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, currentRef.current];
    last.current = { at: 0 };
    apply(next);
    setRevision((n) => n + 1);
  }, [apply]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    last.current = { at: 0 };
    changed();
    // The sections were replaced from outside (a reload, a restored
    // version): forms re-read them, as after an undo.
    setRevision((n) => n + 1);
  }, []);

  return {
    record,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    revision,
    reset,
  };
}
