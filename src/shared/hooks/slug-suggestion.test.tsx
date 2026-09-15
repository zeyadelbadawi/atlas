/**
 * P55 — slug suggestion: generation, and the generated-vs-customized rule.
 *
 * The second half is the one that matters. "The suggestion updates as you
 * type" is pleasant; "a title change silently overwrote the address I
 * deliberately chose" is lost work, and it is the failure this hook exists
 * to make impossible. Every override case below is written so that removing
 * the latch in `useSlugSuggestion` makes it fail.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { slugifyTitle } from './../utils/string.utils';
import { useSlugSuggestion } from './useSlugSuggestion';

/** The shape rule every slug schema in this codebase independently declares. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('slugifyTitle', () => {
  it('kebab-cases an ordinary English title', () => {
    expect(slugifyTitle('ABC Academy')).toBe('abc-academy');
    expect(slugifyTitle('ABC International Academy')).toBe(
      'abc-international-academy'
    );
  });

  it('collapses punctuation and repeated spaces into single hyphens', () => {
    expect(slugifyTitle('ABC   International  Academy')).toBe(
      'abc-international-academy'
    );
    expect(slugifyTitle('Maths & Science: Level 1!')).toBe('maths-science-level-1');
    expect(slugifyTitle('--Leading and trailing--')).toBe('leading-and-trailing');
  });

  it('returns an empty candidate for an Arabic-only title rather than transliterating', () => {
    // A subdomain is a DNS label; inventing a romanization would make a
    // guess into a customer's permanent public address.
    expect(slugifyTitle('أكاديمية النور')).toBe('');
  });

  it('keeps the Latin part of a mixed-script title', () => {
    expect(slugifyTitle('أكاديمية ABC')).toBe('abc');
    expect(slugifyTitle('ABC أكاديمية 2026')).toBe('abc-2026');
  });

  it('truncates without leaving a trailing hyphen', () => {
    // Truncating "abc-international-academy" at 12 lands mid-word on a
    // hyphen boundary; a trailing hyphen would fail the slug regex.
    const result = slugifyTitle('abc international academy', 12);
    expect(result).toBe('abc-internat');
    expect(result.endsWith('-')).toBe(false);
  });

  it('always produces something the slug regex accepts, or nothing at all', () => {
    const titles = [
      'ABC Academy',
      'Maths & Science: Level 1!',
      '   ',
      '...',
      'أكاديمية النور',
      'أكاديمية ABC',
      'A'.repeat(500),
      '2026',
      'café-école',
    ];
    for (const title of titles) {
      const slug = slugifyTitle(title, 50);
      // Either a valid slug, or empty (meaning "no suggestion"). Never a
      // value the form would immediately reject.
      expect(slug === '' || SLUG_REGEX.test(slug)).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(50);
    }
  });
});

/** Drives the hook the way a form does: title in, slug out, slug fed back. */
function renderSuggestion(initialTitle = '') {
  const onSuggest = vi.fn();
  const state = { title: initialTitle, slug: '' };

  const view = renderHook(
    (props: { title: string; slug: string }) =>
      useSlugSuggestion({
        title: props.title,
        slug: props.slug,
        maxLength: 50,
        onSuggest: (next) => {
          // Mirror a real form: the suggestion lands in the field.
          state.slug = next;
          onSuggest(next);
        },
      }),
    { initialProps: state }
  );

  const typeTitle = (title: string) => {
    state.title = title;
    act(() => view.rerender({ ...state }));
  };

  const editSlug = (slug: string) => {
    act(() => {
      view.result.current.onSlugEdited();
      state.slug = slug;
    });
    act(() => view.rerender({ ...state }));
  };

  return { view, state, onSuggest, typeTitle, editSlug };
}

describe('useSlugSuggestion', () => {
  it('suggests as the title is typed, while the slug is untouched', () => {
    const { state, typeTitle } = renderSuggestion();

    typeTitle('ABC Academy');
    expect(state.slug).toBe('abc-academy');

    // Still following: the user has not expressed a preference yet.
    typeTitle('ABC International Academy');
    expect(state.slug).toBe('abc-international-academy');
  });

  it('PRESERVES a manual edit when the title changes afterwards', () => {
    const { state, typeTitle, editSlug } = renderSuggestion();

    typeTitle('ABC Academy');
    expect(state.slug).toBe('abc-academy');

    editSlug('my-own-address');
    typeTitle('Completely Different Name');

    // The whole point: the deliberate choice survives.
    expect(state.slug).toBe('my-own-address');
  });

  it('treats CLEARING the slug as a deliberate edit, not as "still untouched"', () => {
    const { state, typeTitle, editSlug } = renderSuggestion();

    typeTitle('ABC Academy');
    editSlug('');
    typeTitle('ABC International Academy');

    // Refilling a field the user just emptied would be the same class of
    // bug as overwriting an edit.
    expect(state.slug).toBe('');
  });

  it('does not reclaim an edit that happens to match the title again', () => {
    const { state, typeTitle, editSlug } = renderSuggestion();

    typeTitle('ABC Academy');
    editSlug('abc-academy');
    typeTitle('ABC Academy Two');

    // A value-comparison implementation would wrongly resume here, because
    // the slug still equals `slugifyTitle(previous title)`. The latch does not.
    expect(state.slug).toBe('abc-academy');
  });

  it('reports whether the slug is customized, for the help text', () => {
    const { view, typeTitle, editSlug } = renderSuggestion();

    typeTitle('ABC Academy');
    expect(view.result.current.isCustomized).toBe(false);

    editSlug('my-own-address');
    expect(view.result.current.isCustomized).toBe(true);
  });

  it('writes nothing for an Arabic-only title, leaving the field to the user', () => {
    const { state, onSuggest, typeTitle } = renderSuggestion();

    typeTitle('أكاديمية النور');

    expect(state.slug).toBe('');
    expect(onSuggest).not.toHaveBeenCalled();
  });

  it('suggests from the Latin part of a mixed title', () => {
    const { state, typeTitle } = renderSuggestion();

    typeTitle('أكاديمية ABC');
    expect(state.slug).toBe('abc');
  });

  it('never fires a redundant update when the suggestion is unchanged', () => {
    const { onSuggest, typeTitle } = renderSuggestion();

    typeTitle('ABC Academy');
    expect(onSuggest).toHaveBeenCalledTimes(1);

    // Trailing punctuation slugifies to the same candidate; re-setting the
    // field would move the caret and mark the form dirty for nothing.
    typeTitle('ABC Academy!');
    expect(onSuggest).toHaveBeenCalledTimes(1);
  });

  it('respects maxLength so a suggestion is never born invalid', () => {
    const { state, typeTitle } = renderSuggestion();

    typeTitle('A very long academy name that keeps going well past the limit');

    expect(state.slug.length).toBeLessThanOrEqual(50);
    expect(SLUG_REGEX.test(state.slug)).toBe(true);
  });
});
