/**
 * The Teaching Dashboard's course overview links an assigned instructor
 * to the course's curriculum builder. The builder is academy-scoped by
 * route, so the link uses the `academyId` the overview carries (the
 * backend now sends it); without one there is no honest URL and no link.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { InstructorCourseOverview } from '@types';

const overview = vi.hoisted(() => ({
  value: undefined as unknown as InstructorCourseOverview,
}));

vi.mock('./hooks', () => ({
  useInstructorCourseOverview: () => ({
    data: overview.value,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import InstructorCourseOverviewPage from './pages/InstructorCourseOverviewPage';

const BASE = {
  courseId: 'c-1',
  title: 'Calculus Essentials',
  status: 'published',
  visibility: 'public',
  enrolledCount: 3,
  totalSections: 2,
  totalLessons: 5,
  pendingSubmissionsCount: 0,
  pendingGradingCount: 0,
  recentActivity: [],
} as unknown as InstructorCourseOverview;

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderPage() {
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter initialEntries={['/dashboard/instructor/courses/c-1']}>
        <Routes>
          <Route
            path="/dashboard/instructor/courses/:courseId"
            element={<InstructorCourseOverviewPage />}
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe('instructor course overview — Edit curriculum', () => {
  it('opens the academy-scoped curriculum builder of this course', () => {
    overview.value = { ...BASE, academyId: 'aca-1' };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit curriculum' }));
    expect(screen.getByTestId('where').textContent).toBe(
      '/dashboard/academy/aca-1/courses/c-1/builder'
    );
  });

  it('shows no link when the response has no academy to build the address from', () => {
    overview.value = BASE;
    renderPage();
    expect(screen.queryByRole('button', { name: 'Edit curriculum' })).toBeNull();
  });
});
