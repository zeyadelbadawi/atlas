/**
 * What the editor tells an author when the server refuses their content.
 *
 * WHAT WAS WRONG. Saving a page whose sections did not validate rendered a
 * generic "Something went wrong · Please try again" strip with a Retry
 * button. The backend had said exactly what was wrong — `violations:
 * [{ field: '0.config.title.en', messageKey: 'validation:required' }, ...]`
 * — and the editor discarded every bit of it. Reproduced in production: add
 * an About section, press Save, and the only thing on offer is Retry, which
 * resubmits the identical invalid payload and fails identically. On a page
 * with several sections the author cannot even tell which one is at fault.
 *
 * Two separate things are pinned here: reading the section index out of a
 * violation path, and deciding whether Retry is help or a trap.
 */
import { describe, expect, it } from 'vitest';
import {
  isContentValidationFailure,
  rejectedSections,
} from './utils/save-validation.utils';

const sections = [
  { type: 'hero' },
  { type: 'about' },
  { type: 'faq' },
] as const;

describe('which sections the server rejected', () => {
  it('reads the section index from the violation path', () => {
    const result = rejectedSections(
      [{ field: '1.config.title.en', messageKey: 'validation:required' }],
      sections
    );
    expect(result).toEqual([{ index: 1, type: 'about' }]);
  });

  /*
   * Several bad fields in one section are ONE thing for the author to go
   * and fix. Listing the section three times would be noise.
   */
  it('names a section once however many of its fields are bad', () => {
    const result = rejectedSections(
      [
        { field: '1.config.title.en', messageKey: 'validation:required' },
        { field: '1.config.body.en', messageKey: 'validation:required' },
        { field: '1.config.body.ar', messageKey: 'validation:maxLength' },
      ],
      sections
    );
    expect(result).toEqual([{ index: 1, type: 'about' }]);
  });

  it('lists several rejected sections in page order', () => {
    const result = rejectedSections(
      [
        {
          field: '2.config.items.0.question.en',
          messageKey: 'validation:required',
        },
        { field: '0.config.title.en', messageKey: 'validation:required' },
      ],
      sections
    );
    expect(result.map((r) => r.index)).toEqual([0, 2]);
    expect(result.map((r) => r.type)).toEqual(['hero', 'faq']);
  });

  it('handles a deep path into a repeated item', () => {
    const result = rejectedSections(
      [
        {
          field: '2.config.items.1.label.en',
          messageKey: 'validation:required',
        },
      ],
      sections
    );
    expect(result).toEqual([{ index: 2, type: 'faq' }]);
  });

  /*
   * A violation that is not about a section at all (a page-level field)
   * has no leading index and must not be mistaken for section zero.
   */
  it('ignores a violation with no section index', () => {
    expect(
      rejectedSections(
        [{ field: 'slug', messageKey: 'validation:invalid' }],
        sections
      )
    ).toEqual([]);
  });

  it('still reports an index the editor no longer holds', () => {
    const result = rejectedSections(
      [{ field: '9.config.title.en', messageKey: 'validation:required' }],
      sections
    );
    // No type to name, but the author is still told something was refused.
    expect(result).toEqual([{ index: 9, type: undefined }]);
  });

  it('returns nothing when there were no violations', () => {
    expect(rejectedSections(undefined, sections)).toEqual([]);
    expect(rejectedSections([], sections)).toEqual([]);
  });
});

describe('whether Retry is worth offering', () => {
  /*
   * The distinction that decides between a button that helps and a button
   * that lies: invalid content will be refused identically every time.
   */
  it('treats a validation failure with violations as not retryable', () => {
    expect(
      isContentValidationFailure({
        kind: 'validation',
        violations: [
          { field: '0.config.title.en', messageKey: 'validation:required' },
        ],
      })
    ).toBe(true);
  });

  it('leaves a server error retryable', () => {
    expect(isContentValidationFailure({ kind: 'server' })).toBe(false);
  });

  it('leaves a network error retryable', () => {
    expect(isContentValidationFailure({ kind: 'network' })).toBe(false);
  });

  /*
   * A validation error carrying no violations tells the author nothing
   * specific, so the generic retry strip is still the better of the two.
   */
  it('falls back to retryable when validation carried no detail', () => {
    expect(
      isContentValidationFailure({ kind: 'validation', violations: [] })
    ).toBe(false);
    expect(isContentValidationFailure({ kind: 'validation' })).toBe(false);
  });
});
