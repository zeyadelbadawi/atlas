/**
 * Owner Reports page (P64 Phase 4 §E.5) — the presentation contract.
 *
 * The backend half (who may read the two report endpoints, what a window
 * outside 1–90 does) is enforced and tested server-side; nothing here is a
 * security test. What THESE pin is the page's own promises:
 *
 *   - the real figures render as figures (headline numbers, per-type rows);
 *   - the window selector drives the query — changing it asks BOTH hooks
 *     for the new `days`, so a 7-day label is never shown over 30-day data;
 *   - a 403 is a permission state with copy, never a blank page;
 *   - `truncated` is announced exactly when the backend set it;
 *   - the quota card reuses the tenant usage read and its status labels.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type {
  AcademyIntegrityReport,
  AcademySharingReport,
  TenantUsage,
} from '@types';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ academyId: 'academy-1' }),
}));

const useAcademyIntegrityReport = vi.fn();
const useAcademySharingReport = vi.fn();
vi.mock('../hooks/useAcademyReports', () => ({
  useAcademyIntegrityReport: (academyId: string, days: number) =>
    useAcademyIntegrityReport(academyId, days) as unknown,
  useAcademySharingReport: (academyId: string, days: number) =>
    useAcademySharingReport(academyId, days) as unknown,
}));

// Only the usage READ is faked; the constants and entitlement utilities the
// quota card renders with stay real, so the test exercises the same
// limit/percentage/status functions the Usage page uses.
const useTenantUsage = vi.fn();
vi.mock('@features/tenant', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useTenantUsage: () => useTenantUsage() as unknown,
  };
});

const { default: AcademyReportsPage } = await import('./AcademyReportsPage');

// Radix Select relies on three DOM APIs jsdom does not implement.
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: vi.fn(),
    hasPointerCapture: vi.fn(() => false),
    releasePointerCapture: vi.fn(),
  });
});

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WINDOW = {
  from: '2026-08-24T00:00:00.000Z',
  to: '2026-09-23T00:00:00.000Z',
  days: 30,
};

function integrityReport(
  overrides: Partial<AcademyIntegrityReport> = {}
): AcademyIntegrityReport {
  return {
    academyId: 'academy-1',
    window: WINDOW,
    totalEvents: 1234,
    countedEvents: 567,
    attemptsWithEvents: 89,
    byType: { visibility_hidden: 800, copy: 400, mystery_event: 34 },
    topCourses: [
      {
        courseId: 'c1',
        courseTitle: 'Network Security 101',
        events: 900,
        attemptsWithEvents: 60,
      },
    ],
    truncated: false,
    ...overrides,
  };
}

function sharingReport(
  overrides: Partial<AcademySharingReport> = {}
): AcademySharingReport {
  return {
    academyId: 'academy-1',
    window: WINDOW,
    granted: 5000,
    refused: 250,
    refusedByReason: { deviceLimit: 200, sessionConflict: 50 },
    distinctUsersRefused: 12,
    distinctDevicesRefused: 31,
    topCourses: [
      { courseId: 'c1', courseTitle: 'Network Security 101', refusals: 180 },
    ],
    topUsers: [
      { userId: 'u1', userName: 'Layla Hassan', refusals: 40 },
      { userId: 'u2', refusals: 9 },
    ],
    truncated: false,
    ...overrides,
  };
}

const usage: TenantUsage = {
  organizationId: 'org-1',
  academies: { used: 1, limit: 1 },
  students: { used: 42, limit: 100 },
  instructors: { used: 3, limit: 'unlimited' },
  staff: { used: 2, limit: 5 },
  courses: { used: 7, limit: 20 },
  generalStorage: { used: 12, limit: 50 },
  videoStorage: { used: 3, limit: 25 },
  updatedAt: '2026-09-23T00:00:00.000Z',
};

function ready<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function failed(kind: 'forbidden' | 'server') {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: createApiError(kind, { status: kind === 'forbidden' ? 403 : 500 }),
    refetch: vi.fn(),
  };
}

function arrange({
  integrity = ready(integrityReport()),
  sharing = ready(sharingReport()),
  tenantUsage = ready(usage),
}: {
  integrity?: unknown;
  sharing?: unknown;
  tenantUsage?: unknown;
} = {}) {
  useAcademyIntegrityReport.mockReturnValue(integrity);
  useAcademySharingReport.mockReturnValue(sharing);
  useTenantUsage.mockReturnValue(tenantUsage);
}

function renderPage(locale: 'en' | 'ar' = 'en') {
  const i18n = createI18nInstance(locale);
  return render(
    <I18nextProvider i18n={i18n}>
      <AcademyReportsPage />
    </I18nextProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AcademyReportsPage', () => {
  it('renders the headline numbers of both reports as formatted figures', () => {
    arrange();
    renderPage();

    // Integrity headlines.
    expect(screen.getByText('1,234')).toBeTruthy();
    expect(screen.getByText('567')).toBeTruthy();
    expect(screen.getByText('89')).toBeTruthy();
    // Sharing headlines.
    expect(screen.getByText('5,000')).toBeTruthy();
    expect(screen.getByText('250')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  it('renders one row per event type, labelled when known and raw when not', () => {
    arrange();
    renderPage();

    const list = screen.getByRole('list', { name: 'By event type' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    // Sorted largest first.
    expect(rows[0]?.textContent).toContain('Tab hidden');
    expect(rows[0]?.textContent).toContain('800');
    expect(rows[1]?.textContent).toContain('Copy');
    // An event type this build does not know renders as its own key rather
    // than vanishing or showing a missing-translation string.
    expect(rows[2]?.textContent).toContain('mystery_event');
  });

  it('renders refusal reasons and the top learners by name only', () => {
    arrange();
    renderPage();

    const reasons = screen.getByRole('list', { name: 'Refusals by reason' });
    expect(within(reasons).getByText('Device limit reached')).toBeTruthy();
    expect(within(reasons).getByText('Another session active')).toBeTruthy();

    expect(screen.getByText('Layla Hassan')).toBeTruthy();
    expect(screen.getByText('Unnamed learner')).toBeTruthy();
    // The user id is a React key, never copy.
    expect(screen.queryByText('u1')).toBeNull();
    expect(screen.queryByText('u2')).toBeNull();
  });

  it('asks both hooks for the default 30-day window on first render', () => {
    arrange();
    renderPage();

    expect(useAcademyIntegrityReport).toHaveBeenLastCalledWith('academy-1', 30);
    expect(useAcademySharingReport).toHaveBeenLastCalledWith('academy-1', 30);
  });

  it('re-queries both reports with the new days when the window changes', () => {
    arrange();
    renderPage();

    const trigger = screen.getByRole('combobox', { name: 'Window' });
    expect(trigger.textContent).toContain('Last 30 days');

    // Keyboard, not pointer: Radix Select's pointer path depends on
    // pointer-capture APIs jsdom lacks, and the keyboard path is the one
    // an assistive-tech user takes anyway. Enter on the trigger opens the
    // listbox; Enter on an option commits it.
    act(() => {
      fireEvent.keyDown(trigger, { key: 'Enter' });
    });
    const option = screen.getByRole('option', { name: 'Last 7 days' });
    act(() => {
      fireEvent.keyDown(option, { key: 'Enter' });
    });

    expect(useAcademyIntegrityReport).toHaveBeenLastCalledWith('academy-1', 7);
    expect(useAcademySharingReport).toHaveBeenLastCalledWith('academy-1', 7);
    expect(
      screen.getByRole('combobox', { name: 'Window' }).textContent
    ).toContain('Last 7 days');
  });

  it('shows a permission state, not a blank page, when the reports are refused', () => {
    arrange({ integrity: failed('forbidden'), sharing: failed('forbidden') });
    renderPage();

    expect(
      screen.getByText("You can't view reports for this academy")
    ).toBeTruthy();
    // No retry — a 403 is not something trying again will fix.
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    // The quota card is a different read with its own rule and still renders.
    expect(screen.getByText('Plan usage')).toBeTruthy();
  });

  it('offers retry for a non-permission failure', () => {
    const integrity = failed('server');
    arrange({ integrity });
    renderPage();

    expect(screen.getByText("Couldn't load this report")).toBeTruthy();
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.click();
    expect(integrity.refetch).toHaveBeenCalledTimes(1);
  });

  it('announces the truncated notice exactly when the backend set it', () => {
    arrange({ integrity: ready(integrityReport({ truncated: true })) });
    renderPage();

    const notices = screen.getAllByRole('status');
    expect(notices).toHaveLength(1);
    expect(notices[0]?.textContent).toContain(
      'Some lists were shortened to their top entries.'
    );

    cleanup();
    arrange();
    renderPage();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders empty states when a window holds no events or no access activity', () => {
    arrange({
      integrity: ready(
        integrityReport({
          totalEvents: 0,
          countedEvents: 0,
          attemptsWithEvents: 0,
          byType: {},
          topCourses: [],
        })
      ),
      sharing: ready(
        sharingReport({
          granted: 0,
          refused: 0,
          refusedByReason: {},
          distinctUsersRefused: 0,
          distinctDevicesRefused: 0,
          topCourses: [],
          topUsers: [],
        })
      ),
    });
    renderPage();

    expect(screen.getByText('No integrity events')).toBeTruthy();
    expect(screen.getByText('No access activity')).toBeTruthy();
  });

  it('renders the quota card from the tenant usage read with its status badges', () => {
    arrange();
    renderPage();

    // `used / limit` for a bounded metric, and the reached-limit badge text
    // (colour is never the only carrier of the status).
    expect(screen.getByText('42 / 100')).toBeTruthy();
    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getAllByText('Limit reached').length).toBeGreaterThan(0);
    // Unlimited is a label, not a number, and storage carries its unit.
    expect(screen.getByText('3 / Unlimited')).toBeTruthy();
    expect(screen.getByText('12 GB / 50 GB')).toBeTruthy();
  });

  it('renders the Arabic page without falling back to English', () => {
    arrange();
    const { container } = renderPage('ar');

    expect(container.textContent ?? '').toMatch(/[ء-ي]/);
    expect(screen.getByText('ملخّص النزاهة')).toBeTruthy();
    expect(screen.getByText('مؤشرات المشاركة')).toBeTruthy();
  });
});
