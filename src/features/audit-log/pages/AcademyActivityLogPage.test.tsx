/**
 * Task 3 — the Academy activity log page's presentation contract.
 *
 * Who may read the log, and what the server returns, is enforced and
 * tested server-side; these pin the page's own promises:
 *   - entries read as sentences, with actor, role and category;
 *   - a 403 is a permission state with its own copy, never a blank page;
 *   - an empty log and an empty FILTERED log say different things;
 *   - "Load more" asks for the next cursor page;
 *   - choosing a category / clicking a person narrows the query;
 *   - opening a row shows the before/after table from the detail request;
 *   - Arabic renders Arabic sentences.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { TenantAuditLogEntry } from '@types';

const useAcademyActivityLog = vi.fn();
const useAcademyActivityEntry = vi.fn();
vi.mock('../hooks/useAuditLogFeed', () => ({
  useAcademyActivityLog: (...args: unknown[]) =>
    useAcademyActivityLog(...args) as unknown,
  useAcademyActivityEntry: (...args: unknown[]) =>
    useAcademyActivityEntry(...args) as unknown,
}));

const { default: AcademyActivityLogPage } =
  await import('./AcademyActivityLogPage');

beforeAll(() => {
  // Radix Select relies on DOM APIs jsdom does not implement.
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: vi.fn(),
    hasPointerCapture: vi.fn(() => false),
    releasePointerCapture: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  useAcademyActivityLog.mockReset();
  useAcademyActivityEntry.mockReset();
});

const ENTRY: TenantAuditLogEntry = {
  id: '11111111-1111-4111-8111-111111111111',
  action: 'course_lesson.created',
  category: 'courses',
  targetType: 'course_lesson',
  targetId: 'lesson-1',
  targetLabel: 'Intro to Chemistry',
  actor: { id: 'user-1', name: 'Sara', isPlatformStaff: false },
  role: 'manager',
  academyId: 'academy-1',
  occurredAt: '2026-10-01T10:00:00.000Z',
  context: { sectionTitle: 'Reactions' },
};

function feed(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      pages: [{ items: [ENTRY], nextCursor: 'next' }],
      pageParams: [undefined],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...overrides,
  };
}

function renderPage(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter initialEntries={['/dashboard/academy/academy-1/activity']}>
        <Routes>
          <Route
            path="/dashboard/academy/:academyId/activity"
            element={<AcademyActivityLogPage />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('AcademyActivityLogPage', () => {
  it('renders entries as readable sentences for this academy', () => {
    useAcademyActivityLog.mockReturnValue(feed());
    useAcademyActivityEntry.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    renderPage();

    expect(useAcademyActivityLog.mock.calls[0][0]).toBe('academy-1');
    const row = screen.getByTestId('audit-entry');
    expect(row.textContent).toContain(
      'Sara created the lesson “Intro to Chemistry” in the unit “Reactions”'
    );
    expect(row.textContent).toContain('Manager');
    expect(row.textContent).toContain('Courses');
  });

  it('renders Arabic sentences in Arabic', () => {
    useAcademyActivityLog.mockReturnValue(
      feed({
        data: {
          pages: [
            {
              items: [
                {
                  ...ENTRY,
                  actor: { ...ENTRY.actor, name: 'محمد' },
                  targetLabel: 'مقدمة في الكيمياء',
                  context: { sectionTitle: 'التفاعلات' },
                },
              ],
              nextCursor: null,
            },
          ],
          pageParams: [undefined],
        },
        hasNextPage: false,
      })
    );
    useAcademyActivityEntry.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    renderPage('ar');
    expect(screen.getByTestId('audit-entry').textContent).toContain(
      'محمد أنشأ درسًا بعنوان «مقدمة في الكيمياء» داخل وحدة «التفاعلات»'
    );
    expect(screen.getByText('وصلت إلى أقدم نشاط مسجّل.')).toBeTruthy();
  });

  it('shows the permission state on 403', () => {
    useAcademyActivityLog.mockReturnValue(
      feed({
        data: undefined,
        error: createApiError('forbidden'),
        hasNextPage: false,
      })
    );
    useAcademyActivityEntry.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(
      screen.getByText('Only the academy owner can view the activity log')
    ).toBeTruthy();
  });

  it('distinguishes an empty log from an empty filtered log', () => {
    useAcademyActivityLog.mockReturnValue(
      feed({
        data: { pages: [{ items: [], nextCursor: null }] },
        hasNextPage: false,
      })
    );
    useAcademyActivityEntry.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText('No activity yet')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'pricing' },
    });
    expect(screen.getByText('No activity matches these filters')).toBeTruthy();
  });

  it('asks for the next cursor page on "Load more"', () => {
    const fetchNextPage = vi.fn();
    useAcademyActivityLog.mockReturnValue(feed({ fetchNextPage }));
    useAcademyActivityEntry.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('narrows the query to one person from a row', () => {
    useAcademyActivityLog.mockReturnValue(feed());
    useAcademyActivityEntry.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Show only activity by Sara' })
    );
    const lastCall = useAcademyActivityLog.mock.calls.at(-1)!;
    expect(lastCall[1]).toMatchObject({ actorUserId: 'user-1' });
    expect(screen.getByText('Person: Sara')).toBeTruthy();
  });

  it('opens the details with the before/after table', () => {
    useAcademyActivityLog.mockReturnValue(feed());
    useAcademyActivityEntry.mockReturnValue({
      data: {
        ...ENTRY,
        changes: { title: { from: 'Intro', to: 'Intro to Chemistry' } },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    fireEvent.click(
      screen.getByRole('button', {
        name: /Sara created the lesson “Intro to Chemistry” in the unit “Reactions”/,
      })
    );
    const details = screen.getByTestId('audit-details');
    const table = within(details).getByTestId('audit-changes-table');
    expect(table.textContent).toContain('Title');
    expect(table.textContent).toContain('Intro');
    expect(table.textContent).toContain('Intro to Chemistry');
    expect(useAcademyActivityEntry.mock.calls.at(-1)).toEqual([
      'academy-1',
      ENTRY.id,
    ]);
  });
});
