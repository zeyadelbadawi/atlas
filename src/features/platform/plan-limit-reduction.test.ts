/**
 * Detecting a limit REDUCTION (P57).
 *
 * WHAT BREAKS IF THIS IS WRONG. A reduction that goes unrecognised is saved
 * with no impact check, no warning and no confirmation — the Platform Owner
 * cuts a plan's academy limit from unlimited to 1 and the first anyone
 * hears of it is a customer who can no longer create an academy. The
 * product decision was explicitly "warning + explicit confirmation + no
 * destructive changes", and every part of that hangs off this function
 * returning the right keys.
 *
 * The opposite failure matters too: flagging a WIDENING as a reduction puts
 * a scary confirmation in front of a harmless edit, which trains the
 * operator to tick the box without reading it.
 */
import { describe, expect, it } from 'vitest';
import {
  UNLIMITED,
  draftToLimits,
  findReducedLimitKeys,
  isCompleteDraft,
  limitsToDraft,
} from './utils/plan-limit-changes.utils';
import type { PlanLimitKey, PlanResourceLimits } from '@types';

const KEYS: readonly PlanLimitKey[] = [
  'academies',
  'students',
  'instructors',
  'staff',
  'courses',
  'generalStorage',
  'videoStorage',
  'recordedSessions',
];

function limits(overrides: Partial<PlanResourceLimits> = {}): PlanResourceLimits {
  return {
    academies: 5,
    students: 100,
    instructors: 10,
    staff: 5,
    courses: 50,
    generalStorage: 20,
    videoStorage: 20,
    recordedSessions: 10,
    ...overrides,
  };
}

describe('findReducedLimitKeys', () => {
  it('reports nothing when nothing changed', () => {
    expect(findReducedLimitKeys(limits(), limits(), KEYS)).toEqual([]);
  });

  it('reports a smaller number', () => {
    expect(findReducedLimitKeys(limits(), limits({ students: 50 }), KEYS)).toEqual([
      'students',
    ]);
  });

  it('reports EVERY reduced key, not just the first', () => {
    const reduced = findReducedLimitKeys(
      limits(),
      limits({ students: 50, courses: 10, videoStorage: 1 }),
      KEYS
    );
    expect(reduced.sort()).toEqual(['courses', 'students', 'videoStorage']);
  });

  it('treats unlimited → a finite number as a reduction', () => {
    // The case most easily missed by a naive `next < current` comparison:
    // `'unlimited' < 1` is not a meaningful numeric test, and going from no
    // ceiling to a ceiling of 1 is the most destructive change available.
    const reduced = findReducedLimitKeys(
      limits({ academies: UNLIMITED }),
      limits({ academies: 1 }),
      KEYS
    );
    expect(reduced).toEqual(['academies']);
  });

  it('does NOT treat a widening as a reduction', () => {
    expect(findReducedLimitKeys(limits(), limits({ students: 500 }), KEYS)).toEqual([]);
    expect(
      findReducedLimitKeys(limits(), limits({ academies: UNLIMITED }), KEYS)
    ).toEqual([]);
    expect(
      findReducedLimitKeys(
        limits({ academies: UNLIMITED }),
        limits({ academies: UNLIMITED }),
        KEYS
      )
    ).toEqual([]);
  });

  it('does not treat a limit of zero as unchanged when it was positive', () => {
    expect(findReducedLimitKeys(limits(), limits({ staff: 0 }), KEYS)).toEqual(['staff']);
  });

  it('ignores a value that is not a finite number', () => {
    // A cleared field parses to NaN through the draft. Reporting that as a
    // cut to zero would flash the destructive warning on every keystroke
    // that empties an input.
    const next = { ...limits(), students: Number.NaN } as PlanResourceLimits;
    expect(findReducedLimitKeys(limits(), next, KEYS)).toEqual([]);
  });
});

describe('limitsToDraft / draftToLimits', () => {
  it('round-trips a plan through the editor unchanged', () => {
    const original = limits({ academies: UNLIMITED });
    expect(draftToLimits(limitsToDraft(original, KEYS), KEYS)).toEqual(original);
  });

  it('keeps unlimited as the explicit string, never as a number', () => {
    const draft = limitsToDraft(limits({ academies: UNLIMITED }), KEYS);
    expect(draft.academies).toBe(UNLIMITED);
    expect(draftToLimits(draft, KEYS).academies).toBe(UNLIMITED);
  });

  it('turns an emptied field into NaN rather than a real limit of zero', () => {
    // `Number('')` is 0. If the draft resolved that way, a half-typed edit
    // would look exactly like a deliberate "nobody may create anything".
    const value = draftToLimits({ ...limitsToDraft(limits(), KEYS), students: '' }, KEYS)
      .students;
    expect(Number.isNaN(value)).toBe(true);
  });

  it('trims whitespace around a typed number', () => {
    expect(
      draftToLimits({ ...limitsToDraft(limits(), KEYS), students: '  42  ' }, KEYS).students
    ).toBe(42);
  });
});

describe('isCompleteDraft', () => {
  it('accepts a fully filled draft, including unlimited and zero', () => {
    expect(isCompleteDraft(limitsToDraft(limits(), KEYS), KEYS)).toBe(true);
    expect(
      isCompleteDraft(limitsToDraft(limits({ academies: UNLIMITED, staff: 0 }), KEYS), KEYS)
    ).toBe(true);
  });

  it('refuses a draft with an emptied field', () => {
    // This is what stops a cleared-and-forgotten input from being saved.
    expect(
      isCompleteDraft({ ...limitsToDraft(limits(), KEYS), students: '' }, KEYS)
    ).toBe(false);
    expect(
      isCompleteDraft({ ...limitsToDraft(limits(), KEYS), students: '   ' }, KEYS)
    ).toBe(false);
  });

  it('refuses non-numeric and negative values', () => {
    expect(
      isCompleteDraft({ ...limitsToDraft(limits(), KEYS), students: 'lots' }, KEYS)
    ).toBe(false);
    expect(
      isCompleteDraft({ ...limitsToDraft(limits(), KEYS), students: '-1' }, KEYS)
    ).toBe(false);
  });

  it('refuses a key that is missing from the draft entirely', () => {
    const draft = limitsToDraft(limits(), KEYS);
    delete draft.videoStorage;
    expect(isCompleteDraft(draft, KEYS)).toBe(false);
  });
});
