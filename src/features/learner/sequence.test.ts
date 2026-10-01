/**
 * Reading the one ordered sequence (§E.2).
 *
 * THREE THINGS WORTH PINNING:
 *
 * 1. PREVIOUS/NEXT DOES NOT SKIP A LOCKED ITEM. It is tempting to "help"
 *    by stepping over one, and that help is a bug: a learner pressing
 *    Next past a drip-scheduled lesson would land two activities away
 *    with no explanation of what they jumped. The neighbour is returned,
 *    the control is disabled, and the sidebar says why.
 *
 * 2. THE "2.3" LABEL USES THE READER'S OWN DIGITS AND SURVIVES ARABIC.
 *    `2.3` is two left-to-right runs with a bidi-NEUTRAL separator
 *    between them, which is exactly the shape that renders as `3.2`
 *    inside an Arabic paragraph. The isolate is invisible, so nothing
 *    about a missing one is visible in a diff, in a screenshot, or to
 *    anyone who does not read Arabic — which is precisely why it is
 *    asserted here.
 *
 * 3. GROUPING PRESERVES THE SERVER'S ORDER. The sidebar, Previous/Next
 *    and Continue are three views of one array; a helper that sorted or
 *    re-keyed on the way past would reintroduce the disagreement the
 *    sequence endpoint exists to end (finding F3).
 */
import { describe, expect, it } from 'vitest';
import type { CourseSequenceItem } from '@types';
import {
  findSequenceNeighbours,
  formatSequenceOrdinal,
  groupSequenceByUnit,
  isSequenceItemFinished,
  sequenceCompletionPercentage,
} from './utils/sequence.utils';

function item(
  overrides: Partial<CourseSequenceItem> & Pick<CourseSequenceItem, 'id'>
): CourseSequenceItem {
  return {
    type: 'lesson',
    title: 'Untitled',
    sectionId: 's-1',
    sectionTitle: 'Unit one',
    unitNumber: 1,
    itemNumber: 1,
    position: 1,
    state: 'available',
    lockReason: null,
    durationSeconds: null,
    isPreview: false,
    dueAt: null,
    availableAt: null,
    ...overrides,
  };
}

const SEQUENCE: readonly CourseSequenceItem[] = [
  item({
    id: 'a',
    unitNumber: 1,
    itemNumber: 1,
    position: 1,
    state: 'completed',
  }),
  item({
    id: 'b',
    unitNumber: 1,
    itemNumber: 2,
    position: 2,
    type: 'quiz',
    state: 'locked',
    lockReason: 'previousIncomplete',
  }),
  item({
    id: 'c',
    sectionId: 's-2',
    sectionTitle: 'Unit two',
    unitNumber: 2,
    itemNumber: 1,
    position: 3,
  }),
];

describe('sequence navigation', () => {
  it('returns the neighbours either side of the current item', () => {
    const { previous, current, next, index } = findSequenceNeighbours(
      SEQUENCE,
      'b'
    );

    expect(index).toBe(1);
    expect(current?.id).toBe('b');
    expect(previous?.id).toBe('a');
    expect(next?.id).toBe('c');
  });

  it('returns a LOCKED neighbour rather than stepping over it', () => {
    const { next } = findSequenceNeighbours(SEQUENCE, 'a');

    expect(next?.id).toBe('b');
    expect(next?.state).toBe('locked');
  });

  it('has no neighbours at the ends, and nothing at all for an unknown id', () => {
    expect(findSequenceNeighbours(SEQUENCE, 'a').previous).toBeUndefined();
    expect(findSequenceNeighbours(SEQUENCE, 'c').next).toBeUndefined();

    const missing = findSequenceNeighbours(SEQUENCE, 'nope');
    expect(missing.index).toBe(-1);
    expect(missing.current).toBeUndefined();
  });
});

describe('sequence numbering', () => {
  it('numbers "2.3" in English digits', () => {
    const label = formatSequenceOrdinal({ unitNumber: 2, itemNumber: 3 }, 'en');

    // The isolate characters wrap it; the expression itself is what a
    // reader sees.
    expect(label).toContain('2.3');
  });

  it('numbers it in Arabic-Indic digits for Arabic', () => {
    const label = formatSequenceOrdinal({ unitNumber: 2, itemNumber: 3 }, 'ar');

    expect(label).toContain('٢');
    expect(label).toContain('٣');
    expect(label).not.toContain('2');
  });

  it('isolates the expression so Arabic cannot reverse it', () => {
    const label = formatSequenceOrdinal({ unitNumber: 2, itemNumber: 3 }, 'ar');

    // U+2066 LEFT-TO-RIGHT ISOLATE … U+2069 POP DIRECTIONAL ISOLATE.
    expect(label.startsWith('⁦')).toBe(true);
    expect(label.endsWith('⁩')).toBe(true);
  });
});

describe('sequence grouping and progress', () => {
  it('groups back into units in the server’s order', () => {
    const units = groupSequenceByUnit(SEQUENCE);

    expect(units.map((unit) => unit.sectionId)).toEqual(['s-1', 's-2']);
    expect(units[0].items.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(units[1].items.map((entry) => entry.id)).toEqual(['c']);
  });

  it('treats a passed quiz and a graded assignment as finished, like a completed lesson', () => {
    // One vocabulary across four types is the point of the state enum —
    // the sidebar renders them side by side.
    expect(isSequenceItemFinished('completed')).toBe(true);
    expect(isSequenceItemFinished('passed')).toBe(true);
    expect(isSequenceItemFinished('graded')).toBe(true);

    expect(isSequenceItemFinished('submitted')).toBe(false);
    expect(isSequenceItemFinished('failed')).toBe(false);
    expect(isSequenceItemFinished('locked')).toBe(false);
  });

  it('computes progress across every activity type, not just lessons', () => {
    expect(sequenceCompletionPercentage(1, 3)).toBe(33);
    expect(sequenceCompletionPercentage(3, 3)).toBe(100);
    // An empty course is 0%, never a division by zero.
    expect(sequenceCompletionPercentage(0, 0)).toBe(0);
  });
});
