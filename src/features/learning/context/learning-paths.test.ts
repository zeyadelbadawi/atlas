import { describe, expect, it } from 'vitest';
import { LEARNER_SURFACE_PATHS } from './LearningPaths.context';

/**
 * Pre-Phase-3 learner baseline: every path a reused learning page can
 * navigate to for a COURSE or a LESSON must land in the learner app, so a
 * learner never meets the retired legacy pages through an in-app link.
 * Quizzes and assignments stay on their legacy pages until Phase 3.
 */
describe('LEARNER_SURFACE_PATHS', () => {
  it('points the course page and learn entry at the course outline', () => {
    expect(LEARNER_SURFACE_PATHS.courseDetail('c-1')).toBe('/my/courses/c-1');
    expect(LEARNER_SURFACE_PATHS.courseLearn('c-1')).toBe('/my/courses/c-1');
  });

  it('points a lesson at the unified player', () => {
    expect(LEARNER_SURFACE_PATHS.lesson('c-1', 'l-9')).toBe(
      '/my/courses/c-1/learn/l-9'
    );
  });

  it('points quizzes and assignments at the unified player (P64 Phase 3)', () => {
    expect(LEARNER_SURFACE_PATHS.quiz('c-1', 'q-2')).toBe(
      '/my/courses/c-1/activities/q-2'
    );
    expect(LEARNER_SURFACE_PATHS.assignment('c-1', 'a-3')).toBe(
      '/my/courses/c-1/activities/a-3'
    );
  });
});
