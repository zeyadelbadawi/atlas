/**
 * B3 — Banners & pop-ups: the list (live state, dates, results; EN/AR) and
 * the editor (both-language live preview, per-surface payload, validation,
 * version on save, confirmed activation).
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
import { announcement, page } from './__tests__/fixtures';
import {
  RAW_KEY,
  apiError,
  installDomShims,
  renderPage,
} from './__tests__/render';
import type { SiteAnnouncement } from './types';

vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));
const { default: ListPage } = await import('./pages/PlatformAnnouncementsPage');
const {
  default: EditorPage,
  announcementPayload,
  announcementStateOf,
  validateAnnouncement,
} = await import('./pages/PlatformAnnouncementEditorPage');

const notifySuccess = vi.fn();
const notifyError = vi.fn();
const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;
let current: SiteAnnouncement;

beforeAll(installDomShims);
beforeEach(() => {
  current = announcement();
  get.mockImplementation(async (path: string) => {
    if (path === 'platform-site-announcements')
      return page([
        announcement({ status: 'active' }),
        announcement({
          id: 'ann-2',
          name: 'Exam popup',
          surface: 'marketing_popup',
          status: 'active',
          startsAt: '2099-01-01T00:00:00.000Z',
        }),
        announcement({
          id: 'ann-3',
          name: 'Old notice',
          surface: 'dashboard_banner',
          status: 'archived',
        }),
      ]);
    return current;
  });
  post.mockImplementation(
    async (path: string, body: Record<string, unknown>) => {
      if (path === 'platform-site-announcements')
        return announcement({
          ...(body as Partial<SiteAnnouncement>),
          id: 'created-1',
        });
      if (path.endsWith('/activate')) {
        current = {
          ...current,
          status: 'active',
          version: current.version + 1,
        };
        return current;
      }
      throw new Error(`unexpected POST ${path}`);
    }
  );
  patch.mockImplementation(
    async (_path: string, body: Record<string, unknown>) => {
      current = {
        ...current,
        ...(body as Partial<SiteAnnouncement>),
        version: current.version + 1,
      };
      return current;
    }
  );
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
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  [get, post, patch, notifySuccess, notifyError].forEach((fn) =>
    fn.mockReset()
  );
});

const EDIT = '/dashboard/platform/announcements/:announcementId';
const openEditor = (url: string, path: string, language: 'en' | 'ar' = 'en') =>
  renderPage(<EditorPage />, {
    language,
    url,
    path,
    toast: { notifySuccess, notifyError },
    extra: [{ path: EDIT, element: <p>edit page</p> }],
  });

describe('announcement helpers', () => {
  it('sends only the fields a surface uses', () => {
    const banner = announcementPayload(
      announcementStateOf(announcement(), 'marketing_banner')
    );
    expect(banner).toHaveProperty('pages');
    expect(banner).not.toHaveProperty('audience');
    expect(banner).not.toHaveProperty('popupFrequency');
    const dash = announcementPayload(
      announcementStateOf(
        announcement({ surface: 'dashboard_banner' }),
        'dashboard_banner'
      )
    );
    expect(dash).toHaveProperty('audience', 'all');
    expect(dash).not.toHaveProperty('pages');
    const popup = announcementPayload(
      announcementStateOf(
        announcement({ surface: 'marketing_popup' }),
        'marketing_popup'
      )
    );
    expect(popup).toMatchObject({
      popupDelaySeconds: 5,
      popupFrequency: 'once',
      imageUrl: null,
    });
  });

  it('requires a popup title, a CTA link when a label exists, and a safe link', () => {
    const state = announcementStateOf(
      announcement({
        surface: 'marketing_popup',
        content: { en: { title: '', body: 'Hi', ctaLabel: 'Go' }, ar: null },
        ctaUrl: null,
      }),
      'marketing_popup'
    );
    const errors = validateAnnouncement(state);
    expect(errors.content.en.title).toBe('announcementEditor.validation.title');
    expect(errors.ctaUrl).toBe('announcementEditor.validation.ctaUrlRequired');
    expect(
      validateAnnouncement({ ...state, ctaUrl: 'javascript:x' }).ctaUrl
    ).toBe('announcementEditor.validation.ctaUrl');
    expect(
      validateAnnouncement({
        ...state,
        startsAt: '2026-10-27T10:00',
        endsAt: '2026-10-26T10:00',
      }).endsAt
    ).toBeDefined();
  });
});

describe('Banners & pop-ups list', () => {
  it('shows live state, surface and results in EN and AR', async () => {
    const view = renderPage(<ListPage />, {
      url: '/dashboard/platform/announcements',
      path: '/dashboard/platform/announcements',
    });
    const table = await screen.findByRole('table');
    expect(table.textContent).toContain('Launch week banner');
    expect(table.textContent).toContain('Live');
    expect(table.textContent).toContain('Starts later');
    expect(table.textContent).toContain('Archived');
    expect(table.textContent).toMatch(/1,200 · 85 · 40/);
    expect(view.container.textContent).not.toMatch(RAW_KEY);
    view.unmount();
    const ar = renderPage(<ListPage />, {
      language: 'ar',
      url: '/dashboard/platform/announcements',
      path: '/dashboard/platform/announcements',
    });
    expect((await screen.findByRole('table')).textContent).toContain(
      'ظاهر الآن'
    );
    expect(ar.container.textContent).not.toMatch(RAW_KEY);
  });
});

describe('Banner / pop-up editor', () => {
  it('previews both languages live', async () => {
    const user = userEvent.setup(USER);
    openEditor('/dashboard/platform/announcements/ann-1', EDIT);
    const en = await screen.findByText('Preview in English');
    const enFigure = en.closest('figure') as HTMLElement;
    const arFigure = screen
      .getByText('Preview in Arabic')
      .closest('figure') as HTMLElement;
    expect(enFigure.textContent).toContain('Atlas is open for every teacher.');
    expect(
      arFigure.querySelector('[lang="ar"][dir="rtl"]')?.textContent
    ).toContain('أطلس متاح الآن لكل مدرس.');
    await user.clear(screen.getByLabelText(/^Message/));
    await user.type(
      screen.getByLabelText(/^Message/),
      'Founding seats are open.'
    );
    expect(enFigure.textContent).toContain('Founding seats are open.');
  });

  it('saves with the version and confirms activation', async () => {
    const user = userEvent.setup(USER);
    openEditor('/dashboard/platform/announcements/ann-1', EDIT);
    await user.type(await screen.findByLabelText(/^Internal name/), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][1]).toMatchObject({
      version: 2,
      name: 'Launch week banner!',
      pages: [],
    });
    await user.click(await screen.findByRole('button', { name: 'Activate' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Activate' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        'platform-site-announcements/ann-1/activate',
        { version: 3 }
      )
    );
    expect(notifySuccess).toHaveBeenCalledWith(
      'platformLaunch:announcementEditor.toasts.activated'
    );
  });

  it('explains a stale save', async () => {
    const user = userEvent.setup(USER);
    patch.mockRejectedValueOnce(apiError(409, 'errors.siteAnnouncement.stale'));
    openEditor('/dashboard/platform/announcements/ann-1', EDIT);
    await user.type(await screen.findByLabelText(/^Internal name/), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Someone else saved this while you were editing')
    ).toBeTruthy();
  });

  it('creates a pop-up with page targeting from ?surface=', async () => {
    const user = userEvent.setup(USER);
    openEditor(
      '/dashboard/platform/announcements/new?surface=marketing_popup',
      '/dashboard/platform/announcements/new'
    );
    await user.type(
      await screen.findByLabelText(/^Internal name/),
      'Exam season pop-up'
    );
    await user.type(screen.getByLabelText(/^Title \(required/), 'Exam season');
    await user.type(
      screen.getByLabelText(/^Message/),
      'Quizzes with automatic marking.'
    );
    await user.type(screen.getByLabelText('Pages'), 'ar/pricing/');
    await user.click(screen.getByRole('button', { name: 'Add path' }));
    expect(
      screen.getByRole('button', { name: 'Remove /pricing' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1]).toMatchObject({
      surface: 'marketing_popup',
      pages: ['/pricing'],
      popupFrequency: 'once',
      content: { en: { title: 'Exam season' }, ar: null },
    });
    expect(await screen.findByText('edit page')).toBeTruthy();
  });

  it('renders the editor in Arabic with no raw keys', async () => {
    const { container } = openEditor(
      '/dashboard/platform/announcements/ann-1',
      EDIT,
      'ar'
    );
    expect(await screen.findByText('معاينة الإنجليزية')).toBeTruthy();
    expect(container.textContent).not.toMatch(RAW_KEY);
  });
});
