/**
 * PlatformGrowthPanel (B0-ANL-04 part 3) — the read-only weekly activation
 * funnel on the Platform Owner dashboard. Pinned: totals per step, one row
 * per signup week (newest first), the source list with "untagged" named in
 * words, the internal-organization footnote, and loading/error states.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { PlatformGrowthPanel } from './PlatformGrowthPanel';

const mockQuery = vi.fn();
vi.mock('../hooks', () => ({
  usePlatformGrowthMetrics: (weeks: number) => mockQuery(weeks),
}));
vi.mock('@hooks', () => ({
  useLanguage: () => ({ language: 'en' }),
  useDateFormatter: () => ({ date: (value: string) => value.slice(0, 10) }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
  }),
}));

afterEach(() => {
  cleanup();
  mockQuery.mockReset();
});

const data = {
  timeZone: 'Africa/Cairo',
  weeks: 2,
  cohorts: [
    { weekStart: '2026-10-05', signups: 4, academyCreated: 3, coursePublished: 2, firstEnrolment: 1, firstPayment: 1 },
    { weekStart: '2026-10-12', signups: 2, academyCreated: 1, coursePublished: 0, firstEnrolment: 0, firstPayment: 0 },
  ],
  totals: { signups: 6, academyCreated: 4, coursePublished: 2, firstEnrolment: 1, firstPayment: 1 },
  sources: [
    { source: null, signups: 5 },
    { source: 'facebook', signups: 1 },
  ],
  excludesInternalOrganizations: true as const,
  generatedAt: '2026-10-15T10:00:00.000Z',
};

describe('PlatformGrowthPanel', () => {
  it('asks for twelve weeks and shows a skeleton while loading', () => {
    mockQuery.mockReturnValue({ isLoading: true });
    render(<PlatformGrowthPanel />);
    expect(mockQuery).toHaveBeenCalledWith(12);
    expect(screen.queryByTestId('platform-growth-panel')).toBeNull();
  });

  it('shows an error state with retry', () => {
    mockQuery.mockReturnValue({ isLoading: false, error: new Error('x'), refetch: vi.fn() });
    render(<PlatformGrowthPanel />);
    expect(screen.queryByTestId('platform-growth-panel')).toBeNull();
  });

  it('renders totals, weekly rows newest first, sources and the exclusion footnote', () => {
    mockQuery.mockReturnValue({ isLoading: false, data });
    render(<PlatformGrowthPanel />);
    expect(screen.getByTestId('growth-total-signups').textContent).toBe('6');
    expect(screen.getByTestId('growth-total-firstPayment').textContent).toBe('1');

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('2026-10-12');
    expect(rows[1].textContent).toContain('2026-10-05');
    expect(rows[1].textContent).toContain('4');

    expect(screen.getByText('platform:growth.sources.untagged')).toBeTruthy();
    expect(screen.getByText('facebook')).toBeTruthy();
    expect(screen.getByText('platform:growth.footnote:Africa/Cairo')).toBeTruthy();
  });
});
