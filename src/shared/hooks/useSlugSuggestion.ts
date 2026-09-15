/**
 * Keeps a slug field in step with the title above it — until the person
 * decides otherwise.
 *
 * THE RULE THIS ENCODES. A slug field the user has never touched is a
 * SUGGESTION: it should keep tracking the title, because someone still
 * typing "ABC Internat…" has not chosen anything yet, and a suggestion that
 * freezes on the first keystroke is worse than none. The moment the user
 * edits the slug themselves it becomes THEIR value, and no later title
 * change may overwrite it — silently rewriting a deliberate choice is the
 * one failure mode that actually loses work.
 *
 * "TOUCHED" IS A LATCH, NOT A COMPARISON. The alternative — treating the
 * field as customized whenever its value differs from
 * `slugifyTitle(title)` — looks equivalent and is not: a user who edits the
 * slug and then happens to change the title back to the matching one would
 * have their edit silently reclaimed. Once latched, this hook never
 * proposes again for the lifetime of the form, which is exactly what
 * "the user remains in control" means.
 *
 * CLEARING IS AN EDIT, TOO. Emptying the field is a deliberate act ("I want
 * to type my own"), so it latches like any other edit rather than being
 * read as "empty, therefore still untouched" — otherwise the next keystroke
 * in the title would refill a field the user just cleared. `reset()` is the
 * explicit way back, for a form that is genuinely starting over.
 *
 * NOTHING IS WRITTEN WHEN THERE IS NOTHING TO SUGGEST. A title with no
 * Latin characters slugifies to `''` (see `slugifyTitle`), and this hook
 * never writes an empty suggestion over anything — an Arabic-only title
 * simply leaves the field alone.
 */
import { useCallback, useEffect, useRef } from 'react';
import { slugifyTitle } from '@utils';

export interface UseSlugSuggestionOptions {
  /** The title to derive from — watch this from your form. */
  readonly title: string;
  /** The slug field's current value. */
  readonly slug: string;
  /** Called with a new suggestion. Wire it to your form's setter. */
  readonly onSuggest: (slug: string) => void;
  /** Mirrors the field's own max length so a suggestion is never born invalid. */
  readonly maxLength?: number;
  /** Set to false to stop suggesting (e.g. an edit form, where a slug already exists). */
  readonly enabled?: boolean;
}

export interface UseSlugSuggestionResult {
  /** True once the user has edited the slug themselves — suggestions have stopped. */
  readonly isCustomized: boolean;
  /** Call from the slug input's own change handler. */
  readonly onSlugEdited: () => void;
  /** Returns to "following the title" — for a form that is genuinely reset. */
  readonly reset: () => void;
}

export function useSlugSuggestion({
  title,
  slug,
  onSuggest,
  maxLength = 100,
  enabled = true,
}: UseSlugSuggestionOptions): UseSlugSuggestionResult {
  /*
    A ref, not state: latching must take effect synchronously within the
    same interaction. React batches state updates, so a title change landing
    in the same tick as the user's first slug keystroke would still read the
    stale "not customized" value and overwrite the edit — the precise bug
    this hook exists to prevent.
  */
  const isCustomizedRef = useRef(false);

  // The latest values, so the effect below can react to the TITLE alone
  // without re-running every time the slug changes (which is what
  // `onSuggest` itself causes, and would loop).
  const slugRef = useRef(slug);
  slugRef.current = slug;
  const onSuggestRef = useRef(onSuggest);
  onSuggestRef.current = onSuggest;

  useEffect(() => {
    if (!enabled || isCustomizedRef.current) return;

    const suggestion = slugifyTitle(title, maxLength);
    // Never write an empty suggestion, and never fire a no-op update.
    if (!suggestion || suggestion === slugRef.current) return;

    onSuggestRef.current(suggestion);
  }, [title, maxLength, enabled]);

  const onSlugEdited = useCallback(() => {
    isCustomizedRef.current = true;
  }, []);

  const reset = useCallback(() => {
    isCustomizedRef.current = false;
  }, []);

  return {
    // Read from the ref for callers that only need it for display; a change
    // to it always coincides with a user interaction that re-renders anyway.
    isCustomized: isCustomizedRef.current,
    onSlugEdited,
    reset,
  };
}
