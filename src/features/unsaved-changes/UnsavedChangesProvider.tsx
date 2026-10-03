/**
 * Unsaved-changes registry.
 *
 * WHY A REGISTRY AND NOT ONE HOOK PER FORM. Navigation is blocked in ONE
 * place — `NavigationBlockDialog` — but "is anything dirty?" is known by
 * whichever form happens to be mounted. Several editable surfaces can be
 * mounted at once (a page editor with a modal open over it), so the
 * blocker needs the union of their states, not whichever one rendered
 * last. Each form registers itself under a stable id and deregisters on
 * unmount; the provider holds the set of currently-dirty ids.
 *
 * WHY IDS AND NOT A COUNTER. A counter would drift: React 18 Strict Mode
 * double-invokes effects in development, and a form that re-registers
 * before deregistering would leave the count permanently above zero,
 * blocking every navigation forever with no dirty form in sight. A set of
 * ids is idempotent — registering the same id twice is a no-op.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** What a registered form can be asked to do when the user picks "Save". */
export interface DirtyFormHandlers {
  /**
   * Saves and resolves true on success, false on failure. Optional: a form
   * that cannot save from outside its own UI simply omits it, and the
   * dialog then offers only Stay and Leave.
   */
  readonly save?: () => Promise<boolean>;
}

interface UnsavedChangesContextValue {
  readonly isDirty: boolean;
  /**
   * True only when EVERY dirty form registered a save handler. "Save and
   * leave" is offered only then: saving some forms and silently dropping
   * the others would lose work behind a button that promised to keep it.
   */
  readonly canSaveAll: boolean;
  /**
   * The live answer, read synchronously. Navigation is decided against
   * this, not `isDirty`: React state reaches the router's blocker one
   * effect late, so a form that saves and navigates in the same tick
   * (`markSaved()` then `navigate()`) would otherwise be blocked by the
   * dirt it just saved.
   */
  readonly isDirtyNow: () => boolean;
  /** Marks an id dirty or clean. Safe to call on every render. */
  readonly setDirty: (
    id: string,
    dirty: boolean,
    handlers?: DirtyFormHandlers
  ) => void;
  /** Removes an id entirely — used on unmount. */
  readonly clear: (id: string) => void;
  /** Saves every dirty form. Returns false if any failed or cannot save. */
  readonly saveAll: () => Promise<boolean>;
  /** Forgets all dirty state without saving — used after "Leave without saving". */
  readonly discardAll: () => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<readonly string[]>([]);
  // The same set, updated synchronously (see `isDirtyNow`). State drives
  // rendering; the ref drives navigation decisions.
  const liveDirtyRef = useRef(new Set<string>());
  // Handlers live in a ref, not state: they change identity on every
  // render of the consuming form, and storing them in state would loop.
  const handlersRef = useRef(new Map<string, DirtyFormHandlers>());
  // Bumped when a form gains or loses a save handler without its dirty
  // flag changing, so `canSaveAll` (derived from the ref) re-renders.
  const [, setHandlerTick] = useState(0);

  const setDirty = useCallback(
    (id: string, dirty: boolean, handlers?: DirtyFormHandlers) => {
      const couldSave = !!handlersRef.current.get(id)?.save;
      if (handlers) handlersRef.current.set(id, handlers);
      else handlersRef.current.delete(id);
      if (couldSave !== !!handlers?.save) setHandlerTick((tick) => tick + 1);
      if (dirty) liveDirtyRef.current.add(id);
      else liveDirtyRef.current.delete(id);
      setDirtyIds((current) => {
        const has = current.includes(id);
        if (dirty === has) return current; // No change — do not re-render.
        return dirty
          ? [...current, id]
          : current.filter((value) => value !== id);
      });
    },
    []
  );

  const clear = useCallback((id: string) => {
    handlersRef.current.delete(id);
    liveDirtyRef.current.delete(id);
    setDirtyIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current
    );
  }, []);

  const isDirtyNow = useCallback(() => liveDirtyRef.current.size > 0, []);

  const saveAll = useCallback(async () => {
    let allSucceeded = true;
    for (const id of [...liveDirtyRef.current]) {
      const save = handlersRef.current.get(id)?.save;
      // A dirty form that cannot save is a failure, never a skip: skipping
      // it made "Save and leave" discard that form's work.
      if (!save) {
        allSucceeded = false;
        continue;
      }
      // A save that throws is a failure, not a crash: the dialog stays
      // open and the user keeps their work.
      try {
        if (!(await save())) allSucceeded = false;
      } catch {
        allSucceeded = false;
      }
    }
    return allSucceeded;
  }, []);

  const discardAll = useCallback(() => {
    handlersRef.current.clear();
    liveDirtyRef.current.clear();
    setDirtyIds([]);
  }, []);

  const isDirty = dirtyIds.length > 0;
  const canSaveAll =
    isDirty && dirtyIds.every((id) => !!handlersRef.current.get(id)?.save);

  /**
   * KEYED ON BOOLEANS, NOT ON `dirtyIds` — THIS IS LOAD-BEARING.
   *
   * A first version depended on the `dirtyIds` array, so the context value
   * got a new identity every time any id was added or removed. Consumers
   * depend on this value in effects, and an effect whose cleanup calls
   * `clear` then re-runs on the new identity, clearing again — an infinite
   * render loop that hung the test runner outright the moment a single
   * form became dirty. Every callback above is identity-stable, so the
   * value changes only when what the dialog shows actually changes.
   */
  const value = useMemo<UnsavedChangesContextValue>(
    () => ({
      isDirty,
      canSaveAll,
      isDirtyNow,
      setDirty,
      clear,
      saveAll,
      discardAll,
    }),
    [isDirty, canSaveAll, isDirtyNow, setDirty, clear, saveAll, discardAll]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Returns null outside the provider rather than throwing.
 *
 * Deliberate, and the opposite of `useCookieConsent`: an editable form
 * rendered in a test or a Storybook-style harness without the provider
 * should still work, just without navigation protection. A consent
 * control that silently does nothing is a correctness bug; a form that
 * merely loses its "are you sure" is not.
 */
export function useUnsavedChangesRegistry(): UnsavedChangesContextValue | null {
  return useContext(UnsavedChangesContext);
}
