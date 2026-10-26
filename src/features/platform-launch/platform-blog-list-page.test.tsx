/**
 * B3 — Blog list: rows with status, topic, languages and date (EN and AR,
 * no raw keys); filters are server-side query params; empty states.
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
import userEvent from '@testing-library/user-event';
import { apiClient } from '@api';
import { blogPost, page } from './__tests__/fixtures';
import { RAW_KEY, installDomShims, renderPage } from './__tests__/render';

vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));
const { default: Page } = await import('./pages/PlatformBlogListPage');

const get = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;
beforeAll(installDomShims);
beforeEach(() => {
  get.mockImplementation(
    async (_path: string, options?: { params?: Record<string, unknown> }) =>
      options?.params?.status === 'archived'
        ? page([])
        : page([
            blogPost({
              status: 'published',
              publishAt: '2026-10-26T09:00:00.000Z',
            }),
            blogPost({
              id: 'post-2',
              slug: 'season-plan',
              topic: 'season',
              translations: {
                en: null,
                ar: {
                  title: 'خطة الموسم',
                  excerpt: 'مقتطف عربي طويل بما يكفي ليكون صالحًا هنا.',
                  body: 'نص',
                  coverAlt: '',
                  seoTitle: '',
                  seoDescription: '',
                },
              },
            }),
          ])
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

const open = (language: 'en' | 'ar' = 'en', url = '/dashboard/platform/blog') =>
  renderPage(<Page />, { language, url, path: '/dashboard/platform/blog' });

describe('Blog list page', () => {
  it('lists posts with status, topic, languages and dates (EN)', async () => {
    const { container } = open();
    const table = await screen.findByRole('table');
    expect(table.textContent).toContain('Protect your recorded lessons');
    expect(table.textContent).toContain('Published');
    expect(table.textContent).toContain('Content protection');
    expect(table.textContent).toContain('/blog/season-plan');
    // The Arabic-only post falls back to its Arabic title.
    expect(table.textContent).toContain('خطة الموسم');
    expect(
      screen.getAllByText('English version not written').length
    ).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(RAW_KEY);
  });

  it('renders in Arabic with no raw keys', async () => {
    const { container } = open('ar');
    const table = await screen.findByRole('table');
    expect(table.textContent).toContain('منشور');
    expect(table.textContent).toContain('حماية المحتوى');
    expect(container.textContent).not.toMatch(RAW_KEY);
  });

  it('sends filters to the server and shows the no-results state', async () => {
    open();
    await screen.findByRole('table');
    await userEvent
      .setup(USER)
      .selectOptions(screen.getByLabelText('Status'), 'archived');
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(
        'platform-blog-posts',
        expect.objectContaining({
          params: expect.objectContaining({
            status: 'archived',
            sortBy: 'updatedAt',
          }),
        })
      )
    );
    expect(await screen.findByText('No posts match')).toBeTruthy();
  });
});
