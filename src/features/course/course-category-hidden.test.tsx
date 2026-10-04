/**
 * Course categories are not shown to Academy Owners and Managers (Task 9):
 * no column or filter in the course list, no Select Category on create or
 * edit — and, because the data stays, an edit never sends `categoryId`
 * (omitting it keeps the course's existing category; sending '' would
 * disconnect it, and categories cannot be created from the dashboard at
 * all, so the select was always empty for real academies).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import type { Course, PaginatedResult } from '@types';
import { courseService } from './services/CourseService';

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUnsavedChanges: () => ({ markSaved: () => undefined }),
  // The list's W6 "Continue setup" action reads permissions.
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('./components/CourseInstructorsCard', () => ({
  CourseInstructorsCard: () => null,
}));

const { default: CourseCreatePage } = await import('./pages/CourseCreatePage');
const { default: CourseEditPage } = await import('./pages/CourseEditPage');
const { default: CourseListPage } = await import('./pages/CourseListPage');

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const course = {
  id: 'course-1',
  academyId: 'aca-1',
  title: 'Chemistry 101',
  slug: 'chemistry-101',
  shortDescription: 'Intro',
  description: '',
  status: 'draft',
  visibility: 'public',
  pricing: { type: 'free', amount: null, currency: 'USD' },
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Science' },
  outcomes: [],
  requirements: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as unknown as Course;

// Loosely typed: only call arguments are inspected.
let getCategories: { mock: { calls: unknown[][] } };
let createCourse: { mock: { calls: unknown[][] } };
let updateCourse: { mock: { calls: unknown[][] } };

beforeEach(() => {
  getCategories = vi.spyOn(courseService, 'getCourseCategories');
  createCourse = vi
    .spyOn(courseService, 'createCourse')
    .mockResolvedValue({ ...course, id: 'course-9' } as Course);
  updateCourse = vi
    .spyOn(courseService, 'updateCourse')
    .mockResolvedValue(course);
  vi.spyOn(courseService, 'getCourse').mockResolvedValue(course);
  vi.spyOn(courseService, 'getCourses').mockResolvedValue({
    items: [course],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  } as PaginatedResult<Course>);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderAt(path: string, pattern: string, element: JSX.Element) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <AtlasDialogProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route path={pattern} element={element} />
                <Route path="*" element={<span />} />
              </Routes>
            </MemoryRouter>
          </AtlasDialogProvider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('course categories are hidden from Academy Owners and Managers', () => {
  it('create: no Select Category, and the payload carries no category', async () => {
    const user = userEvent.setup();
    renderAt(
      '/dashboard/academy/aca-1/courses/create',
      '/dashboard/academy/:academyId/courses/create',
      <CourseCreatePage />
    );
    await user.type(screen.getByLabelText('Course Title'), 'Arabic 101');
    expect(screen.queryByText('Category')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Create Course' }));
    await waitFor(() => expect(createCourse).toHaveBeenCalledTimes(1));
    expect(createCourse.mock.calls[0][1]).not.toHaveProperty('categoryId');
    expect(getCategories).not.toHaveBeenCalled();
  });

  it('edit: no Select Category, and saving keeps the existing category', async () => {
    const user = userEvent.setup();
    renderAt(
      '/dashboard/academy/aca-1/courses/course-1/edit',
      '/dashboard/academy/:academyId/courses/:courseId/edit',
      <CourseEditPage />
    );
    const title = await screen.findByLabelText('Course Title');
    expect(screen.queryByText('Category')).toBeNull();
    await user.clear(title);
    await user.type(title, 'Chemistry 102');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(1));
    const payload = updateCourse.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.title).toBe('Chemistry 102');
    expect(payload).not.toHaveProperty('categoryId');
    expect(getCategories).not.toHaveBeenCalled();
  });

  it('list: no Category column or filter', async () => {
    renderAt(
      '/dashboard/academy/aca-1/courses',
      '/dashboard/academy/:academyId/courses',
      <CourseListPage />
    );
    expect(await screen.findByText('Chemistry 101')).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Category' })).toBeNull();
    expect(screen.queryByText('Science')).toBeNull();
    expect(getCategories).not.toHaveBeenCalled();
  });
});
