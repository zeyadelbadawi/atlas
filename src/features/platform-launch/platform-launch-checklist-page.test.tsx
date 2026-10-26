/**
 * B3 — Launch checklist page.
 *
 *  1. Sections, items and the progress bar render in EN and AR, no raw keys.
 *  2. Ticking an item PATCHes `{ done, version }` and updates progress at once.
 *  3. Move down sends the full new order (same-section swap) and announces it.
 *  4. Add validates the title, then POSTs the item.
 *  5. Delete is confirmed.
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
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiClient } from '@api';
import { checklistItem } from './__tests__/fixtures';
import { RAW_KEY, installDomShims, renderPage } from './__tests__/render';
import type { LaunchChecklistItem } from './types';

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));

const { default: Page, moveWithinSection } =
  await import('./pages/PlatformLaunchChecklistPage');

const ITEMS: LaunchChecklistItem[] = [
  checklistItem({
    id: 'a',
    section: 'content',
    title: 'Publish posts',
    position: 0,
  }),
  checklistItem({
    id: 'b',
    section: 'operations',
    title: 'Restore drill',
    position: 1,
    done: true,
    doneAt: '2026-10-26T08:00:00.000Z',
    doneByName: 'Ziad',
    linkUrl: null,
  }),
  checklistItem({
    id: 'c',
    section: 'content',
    title: 'Resources page live',
    position: 2,
    linkUrl: 'https://atlass.dpdns.org/resources',
  }),
];

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;

beforeAll(installDomShims);
beforeEach(() => {
  let items = [...ITEMS];
  get.mockImplementation(async () => ({
    items,
    progress: { done: items.filter((i) => i.done).length, total: items.length },
  }));
  patch.mockImplementation(
    async (path: string, body: Record<string, unknown>) => {
      const id = path.split('/').pop();
      items = items.map((item) =>
        item.id === id ? { ...item, ...body, version: item.version + 1 } : item
      );
      return items.find((item) => item.id === id);
    }
  );
  post.mockImplementation(
    async (path: string, body: Record<string, unknown>) =>
      path.endsWith('/reorder')
        ? { items: ITEMS, progress: { done: 1, total: 3 } }
        : checklistItem({ id: 'new', ...body })
  );
  del.mockResolvedValue(undefined);
  vi.spyOn(apiClient, 'get').mockImplementation(((path: string) =>
    get(path)) as typeof apiClient.get);
  vi.spyOn(apiClient, 'post').mockImplementation(((
    path: string,
    body: unknown
  ) => post(path, body)) as typeof apiClient.post);
  vi.spyOn(apiClient, 'patch').mockImplementation(((
    path: string,
    body: unknown
  ) => patch(path, body)) as typeof apiClient.patch);
  vi.spyOn(apiClient, 'delete').mockImplementation(((path: string) =>
    del(path)) as typeof apiClient.delete);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  [get, post, patch, del].forEach((fn) => fn.mockReset());
  notifySuccess.mockClear();
  notifyError.mockClear();
});

const open = (language: 'en' | 'ar' = 'en') =>
  renderPage(<Page />, {
    language,
    url: '/dashboard/platform/launch-checklist',
    path: '/dashboard/platform/launch-checklist',
    toast: { notifySuccess, notifyError },
  });

describe('moveWithinSection', () => {
  it('swaps with the nearest item of the same section, skipping others', () => {
    expect(moveWithinSection(ITEMS, 'a', 1)).toEqual(['c', 'b', 'a']);
    expect(moveWithinSection(ITEMS, 'c', -1)).toEqual(['c', 'b', 'a']);
    expect(moveWithinSection(ITEMS, 'a', -1)).toBeNull();
    expect(moveWithinSection(ITEMS, 'b', 1)).toBeNull();
  });
});

describe('Launch checklist page', () => {
  it('renders sections, items and progress in English and Arabic with no raw keys', async () => {
    const { container, unmount } = open('en');
    expect(
      await screen.findByRole('heading', { name: 'Content' })
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Operations' })).toBeTruthy();
    const bar = screen.getByRole('progressbar', { name: 'Checklist progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('3');
    expect(screen.getByText(/Done .* by Ziad/)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Open link: Publish posts' })
        .getAttribute('href')
    ).toBe('/dashboard/platform/blog');
    expect(container.textContent).not.toMatch(RAW_KEY);
    unmount();

    const ar = open('ar');
    expect(
      await screen.findByRole('heading', { name: 'المحتوى' })
    ).toBeTruthy();
    expect(
      screen.getByRole('progressbar', { name: 'تقدّم القائمة' })
    ).toBeTruthy();
    expect(ar.container.textContent).not.toMatch(RAW_KEY);
  });

  it('ticks an item with its version and updates the progress at once', async () => {
    open();
    const box = await screen.findByRole('checkbox', {
      name: 'Mark “Publish posts” done',
    });
    await userEvent.setup(USER).click(box);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('platform-launch-checklist/a', {
        done: true,
        version: 1,
      })
    );
    expect(
      screen
        .getByRole('progressbar', { name: 'Checklist progress' })
        .getAttribute('aria-valuenow')
    ).toBe('2');
  });

  it('moves an item down within its section and announces the move', async () => {
    open();
    const down = await screen.findByRole('button', {
      name: 'Move “Publish posts” down',
    });
    expect(
      (
        screen.getByRole('button', {
          name: 'Move “Publish posts” up',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    await userEvent.setup(USER).click(down);
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('platform-launch-checklist/reorder', {
        ids: ['c', 'b', 'a'],
      })
    );
    expect(screen.getByRole('status').textContent).toContain(
      '“Publish posts” moved to position 2'
    );
  });

  it('validates and adds an item', async () => {
    const user = userEvent.setup(USER);
    open();
    await user.click(await screen.findByRole('button', { name: 'Add item' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      within(dialog).getByText('Write a title of 1 to 160 characters.')
    ).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    await user.type(
      within(dialog).getByLabelText(/^Title/),
      'Search Console sitemap submitted'
    );
    await user.type(
      within(dialog).getByLabelText(/^Link/),
      'javascript:alert(1)'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      within(dialog).getByText('Use https://… or a path that starts with /.')
    ).toBeTruthy();
    await user.clear(within(dialog).getByLabelText(/^Link/));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('platform-launch-checklist', {
        section: 'product',
        title: 'Search Console sitemap submitted',
        description: '',
        linkUrl: null,
        notes: '',
      })
    );
    expect(notifySuccess).toHaveBeenCalledWith(
      'platformLaunch:checklist.toasts.added'
    );
  });

  it('confirms before deleting', async () => {
    const user = userEvent.setup(USER);
    open();
    await user.click(
      await screen.findByRole('button', { name: 'Delete “Restore drill”' })
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain(
      '“Restore drill” is removed from the checklist.'
    );
    expect(del).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith('platform-launch-checklist/b')
    );
  });
});
