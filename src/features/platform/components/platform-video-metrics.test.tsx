/**
 * PlatformVideoMetrics — the dashboard's compact video summary card
 * (P64 Phase 4).
 *
 * Native DOM assertions only (this repo has no jest-dom). What is pinned:
 * the three headline totals, the link to the Content delivery report where
 * the per-tier / per-provider / pipeline detail now lives, and the
 * provider-health signal — a failed count must be announced in words via a
 * status region, never by colour alone.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlatformVideoMetrics } from './PlatformVideoMetrics';

const mockQuery = vi.fn();
vi.mock('../hooks', () => ({
  usePlatformVideoMetrics: () => mockQuery(),
}));
vi.mock('@hooks', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Echo the key plus any interpolated values so assertions stay on
    // structure rather than copy.
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
  }),
}));

afterEach(() => {
  cleanup();
  mockQuery.mockReset();
});

function renderCard() {
  return render(
    <MemoryRouter>
      <PlatformVideoMetrics />
    </MemoryRouter>
  );
}

const data = {
  totalVideoAssets: 5,
  totalStoredMinutes: 35,
  totalStoredGb: 4,
  byTier: [
    { tier: 'normal' as const, assets: 2, storedMinutes: 15, storedGb: 2 },
    { tier: 'premium' as const, assets: 2, storedMinutes: 20, storedGb: 2 },
    { tier: 'none' as const, assets: 1, storedMinutes: 0, storedGb: 0 },
  ],
  byProvider: { r2_worker: 2, cloudflare_stream: 2, r2: 1 },
  processing: { pending: 0, processing: 1, ready: 3, failed: 1 },
  generatedAt: new Date().toISOString(),
};

describe('PlatformVideoMetrics', () => {
  it('renders a skeleton while loading', () => {
    mockQuery.mockReturnValue({ isLoading: true });
    renderCard();
    expect(screen.queryByText('platform:video.totalAssets')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders the headline totals', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    renderCard();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('35')).toBeTruthy();
    expect(screen.getByText('platform:video.gb:4')).toBeTruthy();
  });

  it('keeps the detail off the dashboard and links to the delivery report', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    renderCard();
    // The per-tier / per-provider lists moved to Analysis › Content delivery.
    expect(screen.queryByText('platform:video.tierNormal')).toBeNull();
    expect(screen.queryByText('r2_worker')).toBeNull();
    const link = screen.getByRole('link', { name: 'platform:video.openReport' });
    expect(link.getAttribute('href')).toBe('/dashboard/analytics/delivery');
  });

  it('announces failed processing in a status region, not by colour alone', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    renderCard();
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('platform:video.failedNotice');
  });

  it('omits the failure notice when nothing has failed', () => {
    mockQuery.mockReturnValue({
      data: { ...data, processing: { ...data.processing, failed: 0 } },
      isLoading: false,
    });
    renderCard();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders an error state with a retry when the read fails', () => {
    const refetch = vi.fn();
    mockQuery.mockReturnValue({
      error: new Error('boom'),
      isLoading: false,
      refetch,
    });
    renderCard();
    expect(screen.queryByText('platform:video.totalAssets')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
