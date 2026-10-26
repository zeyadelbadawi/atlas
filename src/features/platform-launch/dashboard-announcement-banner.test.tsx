/**
 * B3 — the dashboard banner: rendered from `/site-announcements/dashboard`
 * in the reading language, labelled region + dismiss button, dismissal
 * remembered per announcement version, and storage failures never break it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiClient } from '@api';
import { renderPage } from './__tests__/render';
import { DashboardAnnouncementBanner } from './components/DashboardAnnouncementBanner';
import type { PublicAnnouncement } from './types';

const BANNER: PublicAnnouncement = {
  id: 'ann-9',
  surface: 'dashboard_banner',
  tone: 'warning',
  title: 'Maintenance',
  body: 'Saturday 02:00–03:00 Cairo time.',
  ctaLabel: 'Details',
  ctaUrl: 'https://status.example.com',
  imageUrl: null,
  dismissible: true,
  popupDelaySeconds: 0,
  popupFrequency: 'always',
  updatedAt: '2026-10-26T10:00:00.000Z',
};

const get = vi.fn();
const post = vi.fn();
beforeEach(() => {
  window.localStorage.clear();
  get.mockResolvedValue({ banners: [BANNER] });
  post.mockResolvedValue(undefined);
  vi.spyOn(apiClient, 'get').mockImplementation(((
    path: string,
    options?: unknown
  ) => get(path, options)) as typeof apiClient.get);
  vi.spyOn(apiClient, 'post').mockImplementation(((
    path: string,
    payload?: unknown
  ) => post(path, payload)) as typeof apiClient.post);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  get.mockReset();
  post.mockReset();
});

const EVENTS = 'public/site-announcements/ann-9/events';

const open = (language: 'en' | 'ar' = 'en') =>
  renderPage(<DashboardAnnouncementBanner />, {
    language,
    url: '/dashboard',
    path: '/dashboard',
  });

describe('Dashboard announcement banner', () => {
  it('asks for the reading language and renders an accessible banner', async () => {
    open('ar');
    const region = await screen.findByRole('region', { name: 'إعلان' });
    expect(get).toHaveBeenCalledWith(
      'site-announcements/dashboard',
      expect.objectContaining({ params: { locale: 'ar' } })
    );
    expect(region.textContent).toContain('Maintenance');
    expect(region.getAttribute('data-tone')).toBe('warning');
    const cta = screen.getByRole('link', { name: 'Details' });
    expect(cta.getAttribute('href')).toBe('https://status.example.com');
    expect(cta.getAttribute('rel')).toContain('noopener');
    expect(screen.getByRole('button', { name: 'إغلاق الإعلان' })).toBeTruthy();
  });

  it('remembers a dismissal for this version only', async () => {
    const view = open();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Dismiss announcement' })
    );
    expect(screen.queryByRole('region', { name: 'Announcement' })).toBeNull();
    expect(
      window.localStorage.getItem(
        'atlas:ann:dismissed:ann-9:2026-10-26T10:00:00.000Z'
      )
    ).toBe('1');
    view.unmount();

    open();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('region', { name: 'Announcement' })).toBeNull();
    cleanup();

    get.mockResolvedValue({
      banners: [{ ...BANNER, updatedAt: '2026-10-27T10:00:00.000Z' }],
    });
    open();
    expect(
      await screen.findByRole('region', { name: 'Announcement' })
    ).toBeTruthy();
  });

  it('still works when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    open();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Dismiss announcement' })
    );
    expect(screen.queryByRole('region', { name: 'Announcement' })).toBeNull();
  });

  it('renders nothing when the feed fails or is empty', async () => {
    get.mockRejectedValue(new Error('down'));
    const { container } = open();
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.querySelector('[role="region"]')).toBeNull();
  });

  it('drops an unsafe CTA link', async () => {
    get.mockResolvedValue({
      banners: [{ ...BANNER, ctaUrl: 'javascript:alert(1)' }],
    });
    open();
    await screen.findByRole('region', { name: 'Announcement' });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('counts one view, a click and a close for the Platform Owner', async () => {
    open();
    await screen.findByRole('region', { name: 'Announcement' });
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(EVENTS, { type: 'view' })
    );
    expect(post).toHaveBeenCalledTimes(1);
    const cta = screen.getByRole('link', { name: 'Details' });
    // jsdom cannot navigate; only the counting matters here.
    cta.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(cta);
    expect(post).toHaveBeenCalledWith(EVENTS, { type: 'click' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Dismiss announcement' })
    );
    expect(post).toHaveBeenCalledWith(EVENTS, { type: 'dismiss' });
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('never breaks when counting fails', async () => {
    post.mockRejectedValue(new Error('down'));
    open();
    expect(
      await screen.findByRole('region', { name: 'Announcement' })
    ).toBeTruthy();
    await waitFor(() => expect(post).toHaveBeenCalled());
  });
});
