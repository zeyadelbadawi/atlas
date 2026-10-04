/**
 * W6 — wizard step order, `?step=` parsing and completion derived from
 * DATA (the saved course + the server's readiness verdict).
 */
import { describe, expect, it } from 'vitest';
import type { Course, CoursePublishReadiness } from '@types';
import {
  COURSE_WIZARD_STEPS,
  deriveCourseWizardStepStates,
  firstIncompleteCourseWizardStep,
  nextCourseWizardStep,
  parseCourseWizardStep,
  previousCourseWizardStep,
} from './course-wizard.steps';

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c1',
    academyId: 'a1',
    title: 'Course',
    slug: 'course',
    status: 'draft',
    visibility: 'private',
    pricing: { type: 'free' },
    instructors: [],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

function readiness(
  overrides: Partial<CoursePublishReadiness> = {},
  counts: Partial<CoursePublishReadiness['counts']> = {}
): CoursePublishReadiness {
  return {
    courseId: 'c1',
    ready: false,
    enforced: false,
    checks: [],
    counts: {
      sections: 0,
      emptySections: 0,
      lessons: 0,
      publishedLessons: 0,
      quizzes: 0,
      publishedQuizzes: 0,
      assignments: 0,
      publishedAssignments: 0,
      publishedLiveSessions: 0,
      draftItems: 0,
      ...counts,
    },
    ...overrides,
  };
}

describe('course wizard steps', () => {
  it('has the eight steps in order, with next/previous at the edges', () => {
    expect(COURSE_WIZARD_STEPS).toEqual([
      'basics',
      'details',
      'media',
      'curriculum',
      'assessments',
      'pricing',
      'review',
      'publish',
    ]);
    expect(previousCourseWizardStep('basics')).toBeNull();
    expect(nextCourseWizardStep('basics')).toBe('details');
    expect(nextCourseWizardStep('publish')).toBeNull();
    expect(previousCourseWizardStep('publish')).toBe('review');
  });

  it('parses ?step= strictly', () => {
    expect(parseCourseWizardStep('media')).toBe('media');
    expect(parseCourseWizardStep('MEDIA')).toBeNull();
    expect(parseCourseWizardStep('settings')).toBeNull();
    expect(parseCourseWizardStep(null)).toBeNull();
  });

  it('a fresh draft: basics and (free) pricing done, assessments optional, resume at details', () => {
    const states = deriveCourseWizardStepStates(course(), readiness());
    expect(states).toEqual({
      basics: 'complete',
      details: 'incomplete',
      media: 'incomplete',
      curriculum: 'incomplete',
      assessments: 'optional',
      pricing: 'complete',
      review: 'incomplete',
      publish: 'incomplete',
    });
    expect(firstIncompleteCourseWizardStep(states)).toBe('details');
  });

  it('completion follows the saved data, not visits', () => {
    const states = deriveCourseWizardStepStates(
      course({
        description: 'Long',
        thumbnail: 'https://cdn.example/x.png',
        pricing: { type: 'paid' }, // no price yet
      }),
      readiness({ ready: false }, { sections: 2, emptySections: 1, quizzes: 1 })
    );
    expect(states.details).toBe('complete');
    expect(states.media).toBe('complete');
    expect(states.curriculum).toBe('complete'); // one unit has content
    expect(states.assessments).toBe('complete');
    expect(states.pricing).toBe('incomplete');
    expect(firstIncompleteCourseWizardStep(states)).toBe('pricing');
  });

  it('review completes on ready; publish on a published course', () => {
    const ready = deriveCourseWizardStepStates(
      course({ status: 'published' }),
      readiness({ ready: true })
    );
    expect(ready.review).toBe('complete');
    expect(ready.publish).toBe('complete');
  });

  it('before the course exists every step is open work', () => {
    const states = deriveCourseWizardStepStates(undefined, undefined);
    expect(states.basics).toBe('incomplete');
    expect(firstIncompleteCourseWizardStep(states)).toBe('basics');
  });
});
