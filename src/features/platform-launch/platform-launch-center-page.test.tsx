/**
 * B3 — Launch center: checklist progress and next items, live
 * announcements only (not scheduled or ended), blog counts by status, and
 * the quick actions (Compose & Send for the launch email).
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { apiClient } from '@api';
import { announcement, checklistItem, page } from './__tests__/fixtures';
import { RAW_KEY, installDomShims, renderPage } from './__tests__/render';

const { default: Page } = await import('./pages/PlatformLaunchCenterPage');
const get = vi.fn();
beforeAll(installDomShims);
beforeEach(() => {
  get.mockImplementation(
    async (path: string, options?: { params?: Record<string, unknown> }) => {
      if (path === 'platform-launch-checklist')
        return {
          items: [
            checklistItem({ id: 'a', title: 'Publish posts', position: 0 }),
            checklistItem({
              id: 'b',
              title: 'Restore drill',
              position: 1,
              done: true,
            }),
          ],
          progress: { done: 1, total: 2 },
        };
      if (path === 'platform-site-announcements')
        return page([
          announcement({ status: 'active', name: 'Live banner' }),
          announcement({
            id: 'x',
            status: 'active',
            name: 'Future banner',
            startsAt: '2099-01-01T00:00:00.000Z',
          }),
        ]);
      if (path === 'platform-blog-posts') {
        const totals: Record<string, number> = {
          published: 11,
          scheduled: 2,
          draft: 3,
        };
        return {
          items: [],
          pagination: {
            page: 1,
            pageSize: 1,
            totalItems: totals[String(options?.params?.status)] ?? 0,
            totalPages: 1,
          },
        };
      }
      throw new Error(`unexpected GET ${path}`);
    }
  );
  vi.spyOn(apiClient, 'get').mockImplementation(((
    path: string,
    options?: unknown
  ) => get(path, options)) as typeof apiClient.get);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  get.mockReset();
});

describe('Launch center page', () => {
  it('summarises the checklist, live announcements and blog counts', async () => {
    const { container } = renderPage(<Page />, {
      url: '/dashboard/platform/launch',
      path: '/dashboard/platform/launch',
    });
    expect(
      await screen.findByRole('progressbar', {
        name: 'Launch checklist progress',
      })
    ).toBeTruthy();
    expect(screen.getAllByText('1 of 2 done').length).toBeGreaterThan(0);
    expect(screen.getByText('Publish posts')).toBeTruthy();
    expect(screen.queryByText('Restore drill')).toBeNull();
    expect(
      await screen.findByRole('link', { name: 'Live banner' })
    ).toBeTruthy();
    expect(screen.queryByText('Future banner')).toBeNull();
    await waitFor(() => expect(screen.getByText('11')).toBeTruthy());
    expect(screen.getByText('2')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Compose launch email' })
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(RAW_KEY);
  });

  it('renders in Arabic with no raw keys', async () => {
    const { container } = renderPage(<Page />, {
      language: 'ar',
      url: '/dashboard/platform/launch',
      path: '/dashboard/platform/launch',
    });
    expect(
      await screen.findByRole('heading', { name: 'إجراءات سريعة' })
    ).toBeTruthy();
    await screen.findByRole('progressbar');
    expect(container.textContent).not.toMatch(RAW_KEY);
  });
});
