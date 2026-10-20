/**
 * My Courses — the card badge says where the learner IS in the course
 * (Not started / In progress / Completed), the same answer as the card's
 * button and the tabs. It used to read the enrolment row's status, whose
 * `enrolled` is labelled "Not started": a learner at 8 of 8 activities was
 * told they had not started.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { Enrollment } from '@types';

const enrollments = vi.hoisted(() => ({ items: [] as Enrollment[] }));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'u-1' } }),
}));
vi.mock('@features/learning', () => ({
  useLearningPaths: () => ({ courses: () => '/courses' }),
  useEnrollments: () => ({
    data: {
      items: enrollments.items,
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: enrollments.items.length,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('./hooks', () => ({
  useLearnerOverview: () => ({ data: undefined }),
}));
vi.mock('./context/LearnerSurface.context', () => ({
  useLearnerSurface: () => ({
    academyId: 'aca-1',
    buildHref: (path: string) => path,
  }),
}));

import LearnerCoursesPage from './pages/LearnerCoursesPage';

function enrollment(
  id: string,
  title: string,
  progress: Partial<NonNullable<Enrollment['progress']>>,
  status: Enrollment['status'] = 'enrolled'
): Enrollment {
  return {
    id,
    studentId: 'u-1',
    courseId: `course-${id}`,
    academyId: 'aca-1',
    status,
    isActive: true,
    course: { id: `course-${id}`, title } as Enrollment['course'],
    progress: {
      totalLessons: 8,
      completedLessons: 0,
      totalItems: 8,
      completedItems: 0,
      percentage: 0,
      completionState: 'incomplete',
      certificateStatus: 'not_eligible',
      ...progress,
    } as NonNullable<Enrollment['progress']>,
  } as Enrollment;
}

afterEach(() => cleanup());

/** The badge sits on the first line of the card body, above the title link. */
function badgeOf(courseTitle: string): string {
  const body = screen
    .getByRole('link', { name: courseTitle })
    .closest('div.flex-col') as HTMLElement;
  return body.firstElementChild?.textContent?.trim() ?? '';
}

function renderPage(language: 'en' | 'ar' = 'en') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <LearnerCoursesPage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('My Courses — card status badge', () => {
  it('8 of 8 done but the course is not marked complete yet reads "In progress", never "Not started"', () => {
    enrollments.items = [
      enrollment('a', 'Algebra', {
        completedLessons: 8,
        completedItems: 8,
        percentage: 100,
        completionState: 'in_progress',
        learningState: 'in_progress',
      }),
      enrollment('b', 'Biology', { learningState: 'not_started' }),
      enrollment(
        'c',
        'Chemistry',
        {
          completedLessons: 8,
          completedItems: 8,
          percentage: 100,
          completionState: 'completed',
          learningState: 'completed',
        },
        'completed'
      ),
    ];
    renderPage();
    expect(badgeOf('Algebra')).toBe('In progress');
    expect(badgeOf('Biology')).toBe('Not started');
    expect(badgeOf('Chemistry')).toBe('Completed');
  });

  it('works from the counts when the server sent no learning state (older response)', () => {
    enrollments.items = [
      enrollment('d', 'Drawing', { completedLessons: 8, completedItems: 8 }),
    ];
    renderPage();
    expect(badgeOf('Drawing')).toBe('In progress');
  });

  it('is translated in Arabic', () => {
    enrollments.items = [
      enrollment('e', 'Economics', {
        completedItems: 3,
        completedLessons: 3,
        learningState: 'in_progress',
      }),
    ];
    renderPage('ar');
    expect(badgeOf('Economics')).toBe('قيد التقدّم');
  });
});
