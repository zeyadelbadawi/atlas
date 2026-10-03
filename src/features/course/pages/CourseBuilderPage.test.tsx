/**
 * Course Builder page — section-level reordering and processing feedback.
 *
 * Pins the section bugs the audit found: move up/down was not disabled
 * while saving (a double-click sent two reorders built on the same stale
 * order), there was no saving indicator, and a section being deleted stayed
 * clickable with no sign anything was happening. Real hooks, real
 * QueryClient, stubbed HTTP service; the unit list and live-session block
 * are stubbed (they have their own tests).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { CourseSection, PaginatedResult } from '@types';

const service = vi.hoisted(() => ({
  getCourse: vi.fn(async () => ({ id: 'c1', title: 'Course One' })),
  getCourseSections: vi.fn(),
  reorderCourseSections: vi.fn(),
  deleteCourseSection: vi.fn(),
}));
const confirmSpy = vi.hoisted(() => vi.fn(async () => true));

vi.mock('../services/CourseService', () => ({ courseService: service }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({}) }));
// Leaf modules, not the `@app/providers` barrel: the page's import graph
// re-enters the barrel while a barrel mock would still be evaluating.
vi.mock('@app/providers/toast/useToast', () => ({
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
vi.mock('@app/providers/dialog/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: confirmSpy }),
}));
vi.mock('../components/UnitCurriculum', () => ({
  UnitCurriculum: ({ locked }: { locked?: boolean }) => (
    <div data-testid="unit" data-locked={locked ? 'true' : 'false'} />
  ),
}));
vi.mock('@features/live-sessions', () => ({
  LiveSessionCurriculumBlock: () => null,
}));

import CourseBuilderPage from './CourseBuilderPage';

const section = (id: string, title: string, order: number): CourseSection => ({
  id,
  courseId: 'c1',
  title,
  order,
  lessons: [],
  createdAt: '',
  updatedAt: '',
});

const SECTIONS = {
  items: [section('s1', 'Basics', 0), section('s2', 'Advanced', 1)],
  pagination: { page: 1, pageSize: 2, totalItems: 2, totalPages: 1 },
} as unknown as PaginatedResult<CourseSection>;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const i18n = createI18nInstance('en');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/a/acad/courses/c1/builder']}>
          <Routes>
            <Route
              path="/a/:academyId/courses/:courseId/builder"
              element={children}
            />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return render(<CourseBuilderPage />, { wrapper });
}

const sectionTitles = () =>
  screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CourseBuilderPage — sections', () => {
  it('gives every section a named drag handle next to the move buttons', async () => {
    service.getCourseSections.mockResolvedValue(SECTIONS);
    renderPage();
    expect(
      await screen.findByRole('button', { name: 'Reorder section Basics' })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Reorder section Advanced' })
    ).toBeTruthy();
  });

  it('a double-click on "move down" while saving sends ONE reorder, optimistically, with the order seen', async () => {
    service.getCourseSections.mockResolvedValue(SECTIONS);
    const save = deferred();
    service.reorderCourseSections.mockReturnValue(save.promise);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('1. Basics');

    const moveDown = screen.getAllByRole('button', {
      name: /move section down/i,
    })[0];
    await user.dblClick(moveDown);

    await waitFor(() =>
      expect(sectionTitles()).toEqual(['1. Advanced', '2. Basics'])
    );
    expect(service.reorderCourseSections).toHaveBeenCalledTimes(1);
    expect(service.reorderCourseSections).toHaveBeenCalledWith('acad', 'c1', {
      orderedIds: ['s2', 's1'],
      expectedOrderedIds: ['s1', 's2'],
    });
    // Saving is visible on the moved section and every move control refuses.
    const basicsCard = screen.getByText('2. Basics').closest('li')!;
    expect(within(basicsCard).getByText(/Saving order/)).toBeTruthy();
    screen
      .getAllByRole('button', { name: /move section (up|down)/i })
      .forEach((button) => {
        if (!(button as HTMLButtonElement).disabled) {
          expect(button.getAttribute('aria-disabled')).toBe('true');
        }
      });

    service.getCourseSections.mockResolvedValue({
      ...SECTIONS,
      items: [section('s2', 'Advanced', 0), section('s1', 'Basics', 1)],
    });
    await act(async () => save.resolve());
    await waitFor(() => expect(screen.queryByText(/Saving order/)).toBeNull());
    expect(sectionTitles()).toEqual(['1. Advanced', '2. Basics']);
  });

  it('a section being deleted shows it, stops taking clicks and locks its unit', async () => {
    service.getCourseSections.mockResolvedValue(SECTIONS);
    const removal = deferred();
    service.deleteCourseSection.mockReturnValue(removal.promise);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('1. Basics');

    const basicsCard = screen.getByText('1. Basics').closest('li')!;
    await user.click(
      within(basicsCard).getByRole('button', { name: /edit section/i })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /delete section/i })
    );

    await waitFor(() =>
      expect(within(basicsCard).getByText(/Deleting/)).toBeTruthy()
    );
    expect(basicsCard.className).toMatch(/pointer-events-none/);
    expect(
      within(basicsCard).getByTestId('unit').getAttribute('data-locked')
    ).toBe('true');
    expect(
      (
        within(basicsCard).getByRole('button', {
          name: /edit section/i,
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

    service.getCourseSections.mockResolvedValue({
      ...SECTIONS,
      items: [SECTIONS.items[1]],
    });
    await act(async () => removal.resolve());
    await waitFor(() => expect(sectionTitles()).toEqual(['1. Advanced']));
  });
});
