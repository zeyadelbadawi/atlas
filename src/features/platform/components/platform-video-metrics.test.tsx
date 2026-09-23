/**
 * PlatformVideoMetrics — the Platform Owner's video inventory card.
 *
 * Native DOM assertions only (this repo has no jest-dom). What is pinned:
 * the headline totals, the per-tier and per-provider breakdowns, and the
 * provider-health signal — a failed count must be announced in words via a
 * status region, never by colour alone.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
    render(<PlatformVideoMetrics />);
    expect(screen.queryByText('platform:video.byTier')).toBeNull();
  });

  it('renders the headline totals', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    render(<PlatformVideoMetrics />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('35')).toBeTruthy();
    expect(screen.getByText('platform:video.gb:4')).toBeTruthy();
  });

  it('renders every tier and provider row', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    render(<PlatformVideoMetrics />);
    expect(screen.getByText('platform:video.tierNormal')).toBeTruthy();
    expect(screen.getByText('platform:video.tierPremium')).toBeTruthy();
    expect(screen.getByText('platform:video.tierNone')).toBeTruthy();
    expect(screen.getByText('r2_worker')).toBeTruthy();
    expect(screen.getByText('cloudflare_stream')).toBeTruthy();
  });

  it('announces failed processing in a status region, not by colour alone', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    render(<PlatformVideoMetrics />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('platform:video.failedNotice');
  });

  it('omits the failure notice when nothing has failed', () => {
    mockQuery.mockReturnValue({
      data: { ...data, processing: { ...data.processing, failed: 0 } },
      isLoading: false,
    });
    render(<PlatformVideoMetrics />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders an error state with a retry when the read fails', () => {
    const refetch = vi.fn();
    mockQuery.mockReturnValue({
      error: new Error('boom'),
      isLoading: false,
      refetch,
    });
    render(<PlatformVideoMetrics />);
    expect(screen.queryByText('platform:video.byTier')).toBeNull();
  });
});
