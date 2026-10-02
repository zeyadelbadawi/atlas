import { describe, expect, it } from 'vitest';
import { hasFinishedAnything, progressCounts } from './progress-counts.utils';

describe('progressCounts', () => {
  it('a quiz-only course counts its items, not "0 of 0" lessons', () => {
    expect(
      progressCounts({
        completedLessons: 0,
        totalLessons: 0,
        completedItems: 1,
        totalItems: 2,
      })
    ).toEqual({ completed: 1, total: 2, unit: 'items' });
  });

  it('a mixed course counts lessons and quizzes together', () => {
    expect(
      progressCounts({
        completedLessons: 2,
        totalLessons: 3,
        completedItems: 3,
        totalItems: 4,
      })
    ).toEqual({ completed: 3, total: 4, unit: 'items' });
  });

  it('a lesson-only course keeps the lesson wording', () => {
    expect(
      progressCounts({
        completedLessons: 1,
        totalLessons: 3,
        completedItems: 1,
        totalItems: 3,
      })
    ).toEqual({ completed: 1, total: 3, unit: 'lessons' });
  });

  it('falls back to lessons for a response without item counts', () => {
    expect(progressCounts({ completedLessons: 2, totalLessons: 5 })).toEqual({
      completed: 2,
      total: 5,
      unit: 'lessons',
    });
  });
});

describe('hasFinishedAnything', () => {
  it('counts a passed quiz in a course with no lessons', () => {
    expect(
      hasFinishedAnything({ completedLessons: 0, completedItems: 1 })
    ).toBe(true);
    expect(
      hasFinishedAnything({ completedLessons: 0, completedItems: 0 })
    ).toBe(false);
    expect(hasFinishedAnything(undefined)).toBe(false);
    expect(hasFinishedAnything({ completedLessons: 2 })).toBe(true);
  });
});
