/**
 * Every retired dashboard learner URL still leads somewhere real.
 *
 * WHY THIS IS WORTH A TEST. D2 deletes the learner surface from the
 * management dashboard, and §S is explicit that the redirects ship BEFORE
 * the routes are deleted — because these URLs are in bookmarks, in sent
 * email and in notification templates, and none of those can be edited
 * retroactively. A redirect table is the kind of thing that looks obviously
 * correct and is silently wrong in exactly one entry, which nobody notices
 * until a learner reports a dead link months later. A table is also cheap
 * to assert exhaustively, which is the other half of the reason.
 *
 * The parameter-carrying case is the one that actually breaks: dropping
 * `:courseId` still produces a working page, so nothing errors — the
 * learner is just quietly dumped on a list and asked to find their course
 * again.
 */
import { describe, expect, it } from 'vitest';
import {
  LEARNER_ROUTES,
  RETIRED_DASHBOARD_LEARNER_ROUTES,
} from './route-paths';
import {
  resolveRetiredAcademyLearnerTarget,
  resolveRetiredLearnerTarget,
} from './retired-learner-routes';

describe('retired dashboard learner routes', () => {
  it('sends each retired section to its own replacement', () => {
    expect(resolveRetiredLearnerTarget('/dashboard/learning')).toBe(
      LEARNER_ROUTES.root
    );
    expect(resolveRetiredLearnerTarget('/dashboard/learning/my-courses')).toBe(
      LEARNER_ROUTES.courses
    );
    expect(resolveRetiredLearnerTarget('/dashboard/learning/my-results')).toBe(
      LEARNER_ROUTES.assessments
    );
    expect(resolveRetiredLearnerTarget('/dashboard/learning/courses')).toBe(
      LEARNER_ROUTES.courses
    );
  });

  it('sends a lesson bookmark to that lesson in the unified player', () => {
    expect(
      resolveRetiredLearnerTarget('/dashboard/learning/courses/c-1/learn/l-9')
    ).toBe('/my/courses/c-1/learn/l-9');
  });

  it('carries the course id across, from every other in-course URL', () => {
    const inCourse = [
      '/dashboard/learning/courses/c-1',
      '/dashboard/learning/courses/c-1/learn',
      '/dashboard/learning/courses/c-1/quizzes/q-2',
      '/dashboard/learning/courses/c-1/assignments/a-3',
      '/dashboard/learning/courses/c-1/live-sessions/s-4',
      '/dashboard/learning/courses/c-1/discussions',
      '/dashboard/learning/courses/c-1/discussions/t-5',
    ];

    for (const path of inCourse) {
      expect(resolveRetiredLearnerTarget(path), path).toBe('/my/courses/c-1');
    }
  });

  /*
   * A template that resolves to itself, or to a path outside `/my`, means
   * the redirect loops or leaves the learner surface entirely. Asserted
   * over the table rather than per entry so a row added later is covered
   * without anyone remembering to add a case here.
   */
  it('resolves every declared entry to a real learner path', () => {
    for (const { from } of RETIRED_DASHBOARD_LEARNER_ROUTES) {
      const concrete = from.replace(/:[^/]+/g, 'x');
      const target = resolveRetiredLearnerTarget(concrete);

      expect(target, from).toMatch(/^\/my(\/|$)/);
      expect(target, from).not.toContain(':');
      expect(target, from).not.toBe(concrete);
    }
  });

  it('falls back to the learner home for an unmapped learning URL', () => {
    expect(
      resolveRetiredLearnerTarget('/dashboard/learning/something/older/still')
    ).toBe(LEARNER_ROUTES.root);
  });
});

describe('retired academy-website learner routes', () => {
  it('sends the two dashboard-era pages to their sections', () => {
    expect(resolveRetiredAcademyLearnerTarget('/my-learning')).toBe(
      LEARNER_ROUTES.courses
    );
    expect(resolveRetiredAcademyLearnerTarget('/my-account')).toBe(
      LEARNER_ROUTES.profile
    );
  });

  it('sends the legacy course page and learn entry to the course outline', () => {
    expect(resolveRetiredAcademyLearnerTarget('/my-learning/courses/c-1')).toBe(
      '/my/courses/c-1'
    );
    expect(
      resolveRetiredAcademyLearnerTarget('/my-learning/courses/c-1/learn')
    ).toBe('/my/courses/c-1');
  });

  it('sends a legacy lesson URL to the same lesson in the unified player', () => {
    expect(
      resolveRetiredAcademyLearnerTarget('/my-learning/courses/c-1/learn/l-9')
    ).toBe('/my/courses/c-1/learn/l-9');
  });

  it('leaves quiz and assignment URLs alone until Phase 3 moves them', () => {
    // Not in the table: the resolver falls back, and the router never
    // maps these paths to a redirect in the first place.
    expect(
      resolveRetiredAcademyLearnerTarget('/my-learning/courses/c-1/quizzes/q-2')
    ).toBe(LEARNER_ROUTES.root);
  });
});
