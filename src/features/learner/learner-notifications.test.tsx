/**
 * The learner notification surface (`/my/notifications` and the shell bell).
 *
 * WHAT THESE PROTECT:
 *
 * 1. THE SECTION EXISTS AND IS REACHABLE. Before this, a learner had no
 *    notification surface at all — grades and certificates were written
 *    to an inbox with no door. The route, the nav entry and the shell
 *    bell are each asserted, because any one can be removed without
 *    breaking the others.
 *
 * 2. ACTION LINKS KEEP THE `/ar` PREFIX. A stored `actionUrl` is a bare
 *    `/my/...` path; a row that rendered it verbatim would drop an Arabic
 *    learner into English on the one click the notification exists for.
 *
 * The notification hooks are mocked at the feature's public barrel (the
 * only import path this feature may use); everything else is real.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext, ToastContext } from '@app/providers';
import type { IdentityContextValue, ToastContextValue } from '@app/providers';
import type { Notification, PublicWebsiteLocale } from '@types';

const useNotifications = vi.fn();
const useNotificationSummary = vi.fn();
const markRead = vi.fn();

vi.mock('@features/notifications', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNotifications: (options: unknown) => useNotifications(options) as unknown,
    useNotificationSummary: () => useNotificationSummary() as unknown,
    useMarkNotificationRead: () => ({
      mutate: markRead,
      isPending: false,
      variables: undefined,
    }),
    useMarkAllNotificationsRead: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    }),
  };
});

import { LearnerRouter } from './LearnerRouter';
import { LEARNER_NAVIGATION } from './constants/learner-navigation.constants';

const SIGNED_IN = {
  session: { status: 'authenticated' },
  isRestoring: false,
  user: { id: 'u-1', name: 'Lina', email: 'lina@example.test', roles: [] },
  organization: undefined,
  isAuthenticated: true,
  signIn: async () => undefined,
  completeTwoFactor: async () => undefined,
  signOut: async () => undefined,
  switchOrganization: () => undefined,
  refreshSession: async () => undefined,
} as unknown as IdentityContextValue;

const SILENT_TOASTS: ToastContextValue = {
  notify: () => undefined,
  notifySuccess: () => undefined,
  notifyError: () => undefined,
  dismissAll: () => undefined,
};

function hrefBuilder(locale: PublicWebsiteLocale) {
  return (path: string) => (locale === 'en' ? path : `/ar${path}`);
}

function renderLearner(path: string, locale: PublicWebsiteLocale = 'en') {
  const i18n = createI18nInstance(locale);
  const entry = locale === 'en' ? path : `/ar${path}`;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <IdentityContext.Provider value={SIGNED_IN}>
          <ToastContext.Provider value={SILENT_TOASTS}>
            <MemoryRouter initialEntries={[entry]}>
              <Routes>
                <Route
                  path={locale === 'en' ? '/my/*' : '/ar/my/*'}
                  element={
                    <LearnerRouter
                      academyId="aca-1"
                      locale={locale}
                      buildHref={hrefBuilder(locale)}
                    />
                  }
                />
              </Routes>
            </MemoryRouter>
          </ToastContext.Provider>
        </IdentityContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const LAZY_CHUNK_TIMEOUT = { timeout: 10_000 };

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    userId: 'u-1',
    type: 'activity',
    priority: 'medium',
    titleKey: 'notifications:events.certificateIssued.title',
    messageKey: 'notifications:events.certificateIssued.message',
    values: { courseTitle: 'Physics' },
    isRead: false,
    actionUrl: '/my/certificates',
    actionLabelKey: 'notifications:actions.viewDetails',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function listOf(items: readonly Notification[]) {
  return {
    data: {
      items,
      pagination: { page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('learner notifications', () => {
  it('is a navigation section, but not one of the four bottom-bar items', () => {
    const item = LEARNER_NAVIGATION.find((entry) => entry.id === 'notifications');
    expect(item?.path).toBe('/my/notifications');
    expect(item?.labelKey).toBe('learning:learnerDashboard.nav.notifications');
  });

  it('mounts the page under /my/notifications with the shared list', async () => {
    useNotificationSummary.mockReturnValue({
      data: { unread: 1, total: 1, byType: {}, byPriority: {} },
    });
    useNotifications.mockReturnValue(listOf([notification()]));

    renderLearner('/my/notifications');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notifications' }, LAZY_CHUNK_TIMEOUT)
    ).toBeTruthy();
    // Scoped to the notifications list: the learner shell's navigation is
    // also a list, so an unscoped `listitem` query matches its items too.
    const list = screen.getByRole('list', { name: 'Notifications' });
    const [row] = within(list).getAllByRole('listitem');
    expect(row!.textContent).toContain('Certificate issued');
    expect(
      within(row!).getByRole('link', { name: /View Details/ }).getAttribute('href')
    ).toBe('/my/certificates');
  });

  it('shows the unread count on the shell bell and links it to the page', async () => {
    useNotificationSummary.mockReturnValue({
      data: { unread: 3, total: 4, byType: {}, byPriority: {} },
    });
    useNotifications.mockReturnValue(listOf([]));

    renderLearner('/my/courses');

    const bell = await screen.findByRole(
      'link',
      { name: 'Notifications (3 unread)' },
      LAZY_CHUNK_TIMEOUT
    );
    expect(bell.getAttribute('href')).toBe('/my/notifications');
    expect(screen.getByTestId('learner-notification-badge').textContent).toBe('3');
  });

  it('keeps the /ar prefix on the bell and on every action link', async () => {
    useNotificationSummary.mockReturnValue({
      data: { unread: 1, total: 1, byType: {}, byPriority: {} },
    });
    useNotifications.mockReturnValue(
      listOf([notification({ actionUrl: '/my/courses/c-1' })])
    );

    renderLearner('/my/notifications', 'ar');

    await screen.findByRole('heading', { level: 1, name: 'الإشعارات' }, LAZY_CHUNK_TIMEOUT);

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/ar/my/courses/c-1');
    expect(hrefs).toContain('/ar/my/notifications');
    for (const href of hrefs) {
      expect(href, href ?? '').toMatch(/^\/ar\//);
    }
  });
});
