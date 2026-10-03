import type { LearningState } from '@types';
/**
 * Which counts to show next to a course's progress percentage.
 *
 * The percentage covers the whole sequence — lessons, quizzes and
 * assignments. "N of M lessons" beside it is only right for a lesson-only
 * course: a quiz-only course read "0 of 0 lessons completed" next to 50%.
 * When the course has anything besides lessons (`totalItems` differs from
 * `totalLessons`), the counts are items — "activities" in the UI; otherwise
 * the familiar lesson wording stays. Responses from before the backend
 * reported items fall back to lessons.
 */
export interface ProgressCountsSource {
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly completedItems?: number;
  readonly totalItems?: number;
}

// A type alias (not an interface) so it can be passed straight to `t()` as
// interpolation values.
export type ProgressCounts = {
  readonly completed: number;
  readonly total: number;
  readonly unit: 'lessons' | 'items';
};

export function progressCounts(source: ProgressCountsSource): ProgressCounts {
  if (
    typeof source.totalItems === 'number' &&
    source.totalItems !== source.totalLessons
  ) {
    return {
      completed: source.completedItems ?? 0,
      total: source.totalItems,
      unit: 'items',
    };
  }
  return {
    completed: source.completedLessons,
    total: source.totalLessons,
    unit: 'lessons',
  };
}

/** Has the learner finished anything in the course — a lesson, a quiz, an assignment? */
export function hasFinishedAnything(
  source: Partial<ProgressCountsSource> | null | undefined
): boolean {
  return (source?.completedItems ?? source?.completedLessons ?? 0) > 0;
}

/**
 * Start / Continue / Completed for a course (Task E): the backend's own
 * answer when it sent one; otherwise (an older response) the same rule
 * from what is here — completed, anything finished, or nothing yet.
 */
export function learningStateOf(
  progress:
    | (Partial<ProgressCountsSource> & {
        readonly learningState?: LearningState;
        readonly completionState?: string;
      })
    | null
    | undefined,
  fallback: { readonly completed?: boolean } = {}
): LearningState {
  if (progress?.learningState) return progress.learningState;
  if (fallback.completed || progress?.completionState === 'completed')
    return 'completed';
  return hasFinishedAnything(progress) ? 'in_progress' : 'not_started';
}
