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
  /** Marks an id dirty or clean. Safe to call on every render. */
  readonly setDirty: (
    id: string,
    dirty: boolean,
    handlers?: DirtyFormHandlers
  ) => void;
  /** Removes an id entirely — used on unmount. */
  readonly clear: (id: string) => void;
  /** Saves every dirty form that can save itself. Returns false if any failed. */
  readonly saveAll: () => Promise<boolean>;
  /** Forgets all dirty state without saving — used after "Leave without saving". */
  readonly discardAll: () => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<readonly string[]>([]);
  // Handlers live in a ref, not state: they change identity on every
  // render of the consuming form, and storing them in state would loop.
  const handlersRef = useRef(new Map<string, DirtyFormHandlers>());

  const setDirty = useCallback(
    (id: string, dirty: boolean, handlers?: DirtyFormHandlers) => {
      if (handlers) handlersRef.current.set(id, handlers);
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
    setDirtyIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current
    );
  }, []);

  // `saveAll` reads the dirty list through a ref rather than closing over
  // it, so the callback identity never changes. See the note on `value`
  // below for why that matters so much here.
  const dirtyIdsRef = useRef(dirtyIds);
  dirtyIdsRef.current = dirtyIds;

  const saveAll = useCallback(async () => {
    let allSucceeded = true;
    for (const id of dirtyIdsRef.current) {
      const save = handlersRef.current.get(id)?.save;
      if (!save) continue;
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
    setDirtyIds([]);
  }, []);

  const isDirty = dirtyIds.length > 0;

  /**
   * KEYED ON `isDirty`, NOT ON `dirtyIds` — THIS IS LOAD-BEARING.
   *
   * A first version depended on the `dirtyIds` array, so the context value
   * got a new identity every time any id was added or removed. Consumers
   * depend on this value in effects, and an effect whose cleanup calls
   * `clear` then re-runs on the new identity, clearing again — an infinite
   * render loop that hung the test runner outright the moment a single
   * form became dirty. Every callback above is now identity-stable, so the
   * value changes only when the answer to "should navigation be blocked?"
   * actually changes.
   */
  const value = useMemo<UnsavedChangesContextValue>(
    () => ({ isDirty, setDirty, clear, saveAll, discardAll }),
    [isDirty, setDirty, clear, saveAll, discardAll]
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
