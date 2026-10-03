/**
 * W6 — the wizard keeps its step in the URL and saves per step.
 *
 *   - No `?step=` → resumes at the first INCOMPLETE step (from data) and
 *     writes it into the URL; a "refresh" (fresh mount at the URL) lands on
 *     the same step.
 *   - Next PATCHes only the changed fields (nothing when nothing changed),
 *     then moves on.
 *   - Leaving a dirty step through the stepper asks first; "Stay" keeps
 *     the edits.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { UnsavedChangesProvider } from '@features/unsaved-changes';
import type { Course, CoursePublishReadiness } from '@types';
import { courseService } from '../services/CourseService';
import CourseWizardPage from '../pages/CourseWizardPage';

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, organization: { id: 'org-1' } }),
}));
// The media picker is not under test here.
vi.mock('@features/media', () => ({ MediaLibraryDialog: () => null }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({}) }));

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

const COURSE: Course = {
  id: 'c1',
  academyId: 'aca-1',
  title: 'Arabic 101',
  slug: 'arabic-101',
  status: 'draft',
  visibility: 'private',
  pricing: { type: 'free' },
  instructors: [],
  stats: { totalSections: 0, totalLessons: 0 },
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const READINESS: CoursePublishReadiness = {
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
  },
};

let updateCourse: MockInstance<typeof courseService.updateCourse>;

beforeEach(() => {
  vi.spyOn(courseService, 'getCourse').mockResolvedValue(COURSE);
  vi.spyOn(courseService, 'getPublishReadiness').mockResolvedValue(READINESS);
  updateCourse = vi
    .spyOn(courseService, 'updateCourse')
    .mockImplementation(
      async (_a, _c, payload) => ({ ...COURSE, ...payload }) as Course
    );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Where(): JSX.Element {
  const location = useLocation();
  return (
    <output data-testid="where">{`${location.pathname}${location.search}`}</output>
  );
}

function renderAt(url: string) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <AtlasDialogProvider>
            <UnsavedChangesProvider>
              <MemoryRouter initialEntries={[url]}>
                <Routes>
                  <Route
                    path="/dashboard/academy/:academyId/courses/:courseId/setup"
                    element={
                      <>
                        <CourseWizardPage />
                        <Where />
                      </>
                    }
                  />
                </Routes>
              </MemoryRouter>
            </UnsavedChangesProvider>
          </AtlasDialogProvider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const BASE = '/dashboard/academy/aca-1/courses/c1/setup';
const where = () => screen.getByTestId('where').textContent;
const heading = () => screen.findByTestId('wizard-step-heading');

describe(
  'Course wizard — step persistence and per-step save',
  { timeout: 20_000 },
  () => {
    it('without ?step= it resumes at the first incomplete step and writes it to the URL', async () => {
      renderAt(BASE);
      expect((await heading()).textContent).toBe('Course details');
      await waitFor(() => expect(where()).toBe(`${BASE}?step=details`));
      const nav = screen.getByRole('navigation', {
        name: 'Course setup steps',
      });
      expect(
        within(nav)
          .getByRole('button', { name: /^2\. Details/ })
          .getAttribute('aria-current')
      ).toBe('step');
    });

    it('a refresh at ?step= lands on that same step (the step lives in the URL)', async () => {
      const first = renderAt(`${BASE}?step=pricing`);
      expect((await heading()).textContent).toBe('Pricing and access');
      first.unmount();
      renderAt(`${BASE}?step=pricing`);
      expect((await heading()).textContent).toBe('Pricing and access');
      expect(screen.getByText('Step 6 of 8')).toBeTruthy();
      expect(where()).toBe(`${BASE}?step=pricing`);
    });

    it('Next on an untouched step saves nothing and moves on; Back returns', async () => {
      const user = userEvent.setup();
      renderAt(`${BASE}?step=details`);
      await heading();
      await user.click(
        screen.getByRole('button', { name: /Save and continue/ })
      );
      await waitFor(() => expect(where()).toBe(`${BASE}?step=media`));
      expect(updateCourse).not.toHaveBeenCalled();
      expect((await heading()).textContent).toBe('Course image');
      await user.click(screen.getByRole('button', { name: 'Back' }));
      await waitFor(() => expect(where()).toBe(`${BASE}?step=details`));
    });

    it('Next PATCHes only the changed fields, then advances', async () => {
      const user = userEvent.setup();
      renderAt(`${BASE}?step=details`);
      await heading();
      await user.type(
        screen.getByRole('textbox', { name: /Description/ }),
        'What this course covers'
      );
      await user.click(
        screen.getByRole('button', { name: /Save and continue/ })
      );
      await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(1));
      expect(updateCourse.mock.calls[0][2]).toEqual({
        description: 'What this course covers',
      });
      await waitFor(() => expect(where()).toBe(`${BASE}?step=media`));
    });

    it('leaving a dirty step from the stepper asks first; Stay keeps the edits', async () => {
      const user = userEvent.setup();
      renderAt(`${BASE}?step=details`);
      await heading();
      const description = screen.getByRole('textbox', { name: /Description/ });
      await user.type(description, 'Draft text');
      await user.click(screen.getByRole('button', { name: /^3\. Media/ }));
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Leave without saving?')).toBeTruthy();
      await user.click(
        within(dialog).getByRole('button', { name: 'Stay on this page' })
      );
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(where()).toBe(`${BASE}?step=details`);
      expect(
        (
          screen.getByRole('textbox', {
            name: /Description/,
          }) as HTMLTextAreaElement
        ).value
      ).toBe('Draft text');

      // Leave and discard: moves on, nothing saved.
      await user.click(screen.getByRole('button', { name: /^3\. Media/ }));
      const again = await screen.findByRole('alertdialog');
      await user.click(
        within(again).getByRole('button', { name: 'Leave and discard' })
      );
      await waitFor(() => expect(where()).toBe(`${BASE}?step=media`));
      expect(updateCourse).not.toHaveBeenCalled();
    });
  }
);
