/**
 * `CourseCreatePage` — W6: "Create Course" opens the guided wizard at
 * Basics. The same fields (title, slug following the title), Cancel back to
 * the course list, and a create that sends an idempotency key and then
 * REPLACES the address with the new course's wizard at the Details step.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import type { Course } from '@types';
import { courseService } from './services/CourseService';
import CourseCreatePage from './pages/CourseCreatePage';

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

let createCourse: ReturnType<typeof vi.fn>;

beforeEach(() => {
  createCourse = vi.fn(
    async () => ({ id: 'course-9', title: 'Arabic 101' }) as Course
  );
  vi.spyOn(courseService, 'getCourseCategories').mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
  } as unknown as Awaited<
    ReturnType<typeof courseService.getCourseCategories>
  >);
  vi.spyOn(courseService, 'createCourse').mockImplementation(
    (academyId, payload) => createCourse(academyId, payload) as Promise<Course>
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Where(): JSX.Element {
  const location = useLocation();
  return (
    <span data-testid="where">{`${location.pathname}${location.search}`}</span>
  );
}

function renderPage() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <AtlasDialogProvider>
            <MemoryRouter
              initialEntries={['/dashboard/academy/aca-1/courses/create']}
            >
              <Routes>
                <Route
                  path="/dashboard/academy/:academyId/courses/create"
                  element={<CourseCreatePage />}
                />
                <Route path="*" element={<Where />} />
              </Routes>
            </MemoryRouter>
          </AtlasDialogProvider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('CourseCreatePage (wizard step 1)', () => {
  it('cancels back to the course list', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('where').textContent).toBe(
      '/dashboard/academy/aca-1/courses'
    );
  });

  it('creates the draft idempotently and continues to the Details step', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Course Title'), 'Arabic 101');
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Course Slug') as HTMLInputElement).value
      ).toBe('arabic-101')
    );
    await user.click(screen.getByRole('button', { name: 'Create Course' }));

    await waitFor(() => expect(createCourse).toHaveBeenCalledTimes(1));
    expect(createCourse.mock.calls[0][0]).toBe('aca-1');
    const payload = createCourse.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      title: 'Arabic 101',
      slug: 'arabic-101',
      visibility: 'private',
      pricing: { type: 'free' },
    });
    expect(typeof payload.idempotencyKey).toBe('string');
    expect((payload.idempotencyKey as string).length).toBeGreaterThanOrEqual(8);
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe(
        '/dashboard/academy/aca-1/courses/course-9/setup?step=details'
      )
    );
  });

  it('a second attempt after a failure reuses the same idempotency key', async () => {
    const user = userEvent.setup();
    createCourse.mockRejectedValueOnce(new Error('network'));
    renderPage();
    await user.type(screen.getByLabelText('Course Title'), 'Retry Course');
    await user.click(screen.getByRole('button', { name: 'Create Course' }));
    await waitFor(() => expect(createCourse).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'Create Course' }));
    await waitFor(() => expect(createCourse).toHaveBeenCalledTimes(2));
    const first = (createCourse.mock.calls[0][1] as { idempotencyKey: string })
      .idempotencyKey;
    const second = (createCourse.mock.calls[1][1] as { idempotencyKey: string })
      .idempotencyKey;
    expect(second).toBe(first);
  });
});
