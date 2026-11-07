/**
 * B6 (UX audit) V17 — quiz results filters, applied by the server.
 *
 * Paging is server-side, so a filter applied to the rows on screen would
 * only ever narrow one page. The filters travel with the page request
 * (`status`, `gradingStatus`, `flagged`, `late`, `search`), a change goes
 * back to page 1, and an empty filtered list says so and offers to clear.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import type { CollectionQuery } from '@types';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??=
  ResizeObserverStub;
// Radix Select measures and scrolls; jsdom implements neither.
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;

const state = vi.hoisted(() => ({
  queries: [] as CollectionQuery[],
  items: [] as unknown[],
}));

vi.mock('./hooks', () => ({
  useInstructorQuizAttempts: (
    _courseId: string,
    _quizId: string,
    options: { query: CollectionQuery }
  ) => {
    state.queries.push(options.query);
    return {
      data: {
        items: state.items,
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: state.items.length,
          totalPages: 1,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useIntegrityCsv: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useQuizOverrides: () => ({ data: [], isLoading: false, error: null }),
  useCourseStudents: () => ({ data: { items: [] } }),
  useUpsertQuizOverride: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useDeleteQuizOverride: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@features/learning', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQuiz: () => ({ data: { title: 'Spanish Basics Quiz' } }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // The search box is debounced in the app; immediate here.
  useDebounce: <T,>(value: T) => value,
  usePermissions: () => ({ hasPermission: () => true }),
}));

const {
  default: InstructorQuizResultsPage,
  attemptFilterParams,
  NO_ATTEMPT_FILTERS,
} = await import('./pages/InstructorQuizResultsPage');

afterEach(() => {
  cleanup();
  state.queries = [];
  state.items = [];
});

function renderPage(language: 'en' | 'ar' = 'en') {
  return render(
    <AtlasLocalizationProvider initialLanguage={language}>
      <AtlasDialogProvider>
        <MemoryRouter initialEntries={['/results/c-1/q-1']}>
          <Routes>
            <Route
              path="/results/:courseId/:quizId"
              element={<InstructorQuizResultsPage />}
            />
          </Routes>
        </MemoryRouter>
      </AtlasDialogProvider>
    </AtlasLocalizationProvider>
  );
}

const lastQuery = () => state.queries.at(-1)!;

async function choose(testId: string, option: string) {
  fireEvent.keyDown(screen.getByTestId(testId), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

describe('B6 V17 — quiz results filters', () => {
  it('sends no filter at first, only the page', () => {
    renderPage();
    expect(lastQuery()).toEqual({
      pagination: { page: 1, pageSize: expect.any(Number) },
      search: undefined,
      filters: {},
    });
  });

  it('sends the chosen grading status, status, flag and lateness to the server', async () => {
    renderPage();
    await choose('attempt-filter-gradingStatus', 'Awaiting a grade');
    await waitFor(() =>
      expect(lastQuery().filters).toEqual({ gradingStatus: 'pending' })
    );
    await choose('attempt-filter-status', 'Submitted');
    await choose('attempt-filter-flagged', 'Flagged');
    await choose('attempt-filter-late', 'On time');
    await waitFor(() =>
      expect(lastQuery().filters).toEqual({
        gradingStatus: 'pending',
        status: 'submitted',
        flagged: true,
        late: false,
      })
    );
    expect(lastQuery().pagination?.page).toBe(1);
  });

  it('searches by student name and clears everything at once', async () => {
    renderPage();
    fireEvent.change(screen.getByTestId('attempt-filter-search'), {
      target: { value: ' Sara ' },
    });
    await waitFor(() => expect(lastQuery().search).toBe('Sara'));
    await choose('attempt-filter-late', 'Late');
    fireEvent.click(screen.getByTestId('attempt-filter-clear'));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ search: undefined, filters: {} })
    );
    expect(screen.queryByTestId('attempt-filter-clear')).toBeNull();
  });

  it('an empty filtered list says the filters matched nothing', async () => {
    renderPage();
    expect(screen.getByText('No attempts yet')).toBeTruthy();
    await choose('attempt-filter-flagged', 'Flagged');
    expect(
      await screen.findByText('No attempts match these filters')
    ).toBeTruthy();
  });

  it('is labelled in Arabic', () => {
    renderPage('ar');
    expect(screen.getByText('التصحيح')).toBeTruthy();
    expect(screen.getByLabelText('الطالب')).toBe(
      screen.getByTestId('attempt-filter-search')
    );
  });

  it('maps the choices to the server’s parameters', () => {
    expect(attemptFilterParams(NO_ATTEMPT_FILTERS)).toEqual({});
    expect(
      attemptFilterParams({
        status: 'failed',
        gradingStatus: 'graded',
        flagged: 'no',
        late: 'yes',
      })
    ).toEqual({
      status: 'failed',
      gradingStatus: 'graded',
      flagged: false,
      late: true,
    });
  });
});
