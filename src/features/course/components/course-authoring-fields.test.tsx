/**
 * The two authoring fields that were wrong, and the exact way they were wrong.
 *
 * `LinesTextarea` replaces a textarea that could not accept the Enter key:
 * the old handler ran `split('\n').map(trim).filter(Boolean)` on every
 * keystroke, so the empty line Enter had just created was deleted before
 * the author could type into it. The first test below is that keystroke.
 *
 * `parseCourseLanguages` replaces a free-text box people were typing
 * comma-separated languages into. The risk in swapping it for a picker is
 * not the picker — it is the courses that already have a value in that
 * column, authored by hand, in whatever shape. Those tests are about not
 * destroying them.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { LinesTextarea, normalizeLines } from './LinesTextarea';
import {
  parseCourseLanguages,
  serializeCourseLanguages,
  courseLanguageLabel,
} from '../constants/course-languages';

afterEach(cleanup);

describe('LinesTextarea', () => {
  it('lets the author press Enter and start a second item', () => {
    const onChange = vi.fn();
    render(<LinesTextarea value={['Item one']} onChange={onChange} />);
    const field = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(field.value).toBe('Item one');

    // THE BUG, exactly: Enter at the end of the first item.
    fireEvent.change(field, { target: { value: 'Item one\n' } });
    // The newline must survive in what the author sees…
    expect(field.value).toBe('Item one\n');
    // …and the blank line must reach the form rather than being filtered
    // away, because that is the line item two gets typed into.
    expect(onChange).toHaveBeenLastCalledWith(['Item one', '']);

    fireEvent.change(field, { target: { value: 'Item one\nItem two' } });
    expect(field.value).toBe('Item one\nItem two');
    expect(onChange).toHaveBeenLastCalledWith(['Item one', 'Item two']);
  });

  it('keeps a space typed at the end of a line', () => {
    // The old `trim()` on every keystroke ate this too.
    const onChange = vi.fn();
    render(<LinesTextarea value={['Item']} onChange={onChange} />);
    const field = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'Item ' } });
    expect(field.value).toBe('Item ');
  });

  it('normalises on blur, so the stored array stays one item per line', () => {
    const onChange = vi.fn();
    render(<LinesTextarea value={[]} onChange={onChange} />);
    const field = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(field, {
      target: { value: '  One  \n\n Two \n' },
    });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenLastCalledWith(['One', 'Two']);
    expect(field.value).toBe('One\nTwo');
  });

  it('renders saved items as separate lines when a course is loaded', () => {
    render(<LinesTextarea value={['First', 'Second']} onChange={vi.fn()} />);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'First\nSecond'
    );
  });

  it('normalizeLines drops blanks and trims', () => {
    expect(normalizeLines(' a \n\n  b\n')).toEqual(['a', 'b']);
  });
});

describe('course languages', () => {
  it('reads a value that was typed by hand as comma-separated text', () => {
    expect(parseCourseLanguages('English, Arabic')).toEqual(['en', 'ar']);
    expect(parseCourseLanguages('EN , ar')).toEqual(['en', 'ar']);
  });

  it('keeps a value it does not recognise instead of destroying it', () => {
    // An existing course must not silently lose its language the first
    // time somebody opens the edit form after this change.
    expect(parseCourseLanguages('Egyptian Arabic')).toEqual(['Egyptian Arabic']);
    expect(parseCourseLanguages('en, Klingon')).toEqual(['en', 'Klingon']);
  });

  it('collapses a value that names the same language twice', () => {
    expect(parseCourseLanguages('en, English')).toEqual(['en']);
  });

  it('treats an absent or empty value as no languages', () => {
    expect(parseCourseLanguages(undefined)).toEqual([]);
    expect(parseCourseLanguages('')).toEqual([]);
    expect(parseCourseLanguages(' , ')).toEqual([]);
  });

  it('round-trips through the single string column the API already has', () => {
    const stored = serializeCourseLanguages(['en', 'ar', 'fr']);
    expect(stored).toBe('en,ar,fr');
    expect(parseCourseLanguages(stored)).toEqual(['en', 'ar', 'fr']);
  });

  it('serialises an empty selection as absence, not an empty string', () => {
    // `language: data.language || undefined` was the old behaviour and the
    // API contract has not changed.
    expect(serializeCourseLanguages([])).toBeUndefined();
  });

  it('labels a known code in the reader’s locale and an unknown one verbatim', () => {
    expect(courseLanguageLabel('ar', 'en')).toBe('Arabic');
    expect(courseLanguageLabel('Egyptian Arabic', 'en')).toBe('Egyptian Arabic');
  });
});
