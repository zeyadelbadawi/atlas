/**
 * B3 (UX audit, V21) — a due date or quiz window end the author SETS must
 * be in the future; a date the item already had may stay in the past so
 * an old assignment or quiz can still be edited.
 */
import { describe, expect, it } from 'vitest';
import {
  assignmentAuthoringSchemaFor,
  isNewPastDate,
} from './assignment-authoring.schemas';
import { emptyQuizForTest } from './authoring-past-dates.fixtures';
import { quizAuthoringSchemaFor } from './quiz-authoring.schemas';

const PAST = '2020-01-01T09:00';
const FUTURE = '2999-01-01T09:00';

const assignment = (dueAt: string) => ({
  title: 'Essay',
  description: '',
  instructions: '',
  status: 'draft' as const,
  dueAt,
  allowResubmission: false,
  latePolicy: 'accept_flagged' as const,
  requiredForCompletion: false,
});

describe('isNewPastDate', () => {
  it('flags a new past date, not an unchanged one or a future one', () => {
    expect(isNewPastDate(PAST, undefined)).toBe(true);
    expect(isNewPastDate(PAST, PAST)).toBe(false);
    expect(isNewPastDate(FUTURE, undefined)).toBe(false);
    expect(isNewPastDate('', undefined)).toBe(false);
  });
});

describe('assignment due date (V21)', () => {
  it('refuses a new due date in the past', () => {
    const result = assignmentAuthoringSchemaFor().safeParse(assignment(PAST));
    expect(result.error?.issues[0]).toMatchObject({
      path: ['dueAt'],
      message: 'course:assignmentAuthoring.validation.dueInPast',
    });
  });

  it('keeps an existing past due date editable', () => {
    expect(
      assignmentAuthoringSchemaFor(PAST).safeParse(assignment(PAST)).success
    ).toBe(true);
  });

  it('refuses CHANGING an existing past due date to another past one', () => {
    expect(
      assignmentAuthoringSchemaFor(PAST).safeParse(
        assignment('2021-05-05T10:00')
      ).success
    ).toBe(false);
  });
});

describe('quiz window (V21)', () => {
  it('refuses a new past due date and window end, not a past start', () => {
    const result = quizAuthoringSchemaFor().safeParse(
      emptyQuizForTest({
        availableFrom: PAST,
        availableUntil: '2020-02-01T09:00',
        dueAt: '2020-01-15T09:00',
      })
    );
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toContain(
      'course:quizAuthoring.validation.windowEndInPast'
    );
    expect(messages).toContain('course:quizAuthoring.validation.dueInPast');
    expect(
      result.error?.issues.some((i) => i.path[0] === 'availableFrom')
    ).toBe(false);
  });

  it('keeps the dates an existing quiz already has', () => {
    const until = '2020-02-01T09:00';
    const dueAt = '2020-01-15T09:00';
    expect(
      quizAuthoringSchemaFor({ availableUntil: until, dueAt }).safeParse(
        emptyQuizForTest({ availableUntil: until, dueAt })
      ).success
    ).toBe(true);
  });
});
