/**
 * Task 3 — no empty band between the Academy's header and My Learn.
 *
 * The shell's toolbar (the "Sections" drawer button and the notification
 * bell) exists only below the rail breakpoint. From `lg` up the rail is on
 * screen, so the row would hold a lone bell above the page — the band of
 * empty space the learner saw under the header. There, the unread count
 * rides on the rail's Notifications entry instead, so it is never lost.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { PublicWebsiteLocale } from '@types';

let unread = 0;
vi.mock('@features/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNotificationSummary: () => ({ data: { unread } }),
}));

import { LearnerSurfaceProvider } from './context/LearnerSurface.context';
import { LearnerNavigationList } from './components/LearnerNavigationList';
import { LearnerNotificationBell } from './components/LearnerNotificationBell';
import { LearnerShell } from './components/LearnerShell';

function renderWith(ui: JSX.Element, locale: PublicWebsiteLocale = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(locale)}>
      <MemoryRouter initialEntries={[locale === 'en' ? '/my' : '/ar/my']}>
        <LearnerSurfaceProvider
          academyId="aca-1"
          locale={locale}
          buildHref={(path) => (locale === 'en' ? path : `/ar${path}`)}
        >
          {ui}
        </LearnerSurfaceProvider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  unread = 0;
});

describe('learner shell spacing', () => {
  it('the toolbar row is not drawn from the rail breakpoint up', () => {
    renderWith(<LearnerShell />);
    // The bell (it carries a tooltip); the rail's entry has the same name.
    const bell = screen
      .getAllByRole('link', { name: 'Notifications' })
      .find((link) => link.hasAttribute('title'))!;
    const row = bell.parentElement!;
    expect(row.className.split(/\s+/)).toContain('lg:hidden');
    // Nothing else on the row is shown at lg on its own.
    for (const child of Array.from(row.children)) {
      expect(child.className).not.toMatch(/\blg:(flex|block|inline-flex)\b/);
    }
  });

  it('the bell keeps the unread count where the toolbar is shown', () => {
    unread = 3;
    renderWith(<LearnerNotificationBell />);
    expect(
      screen.getByRole('link', { name: 'Notifications (3 unread)' })
    ).toBeTruthy();
  });

  it('the rail carries the unread count on its Notifications entry', () => {
    unread = 3;
    renderWith(<LearnerNavigationList />);
    const link = screen.getByRole('link', { name: /Notifications/ });
    expect(
      within(link).getByTestId('learner-nav-unread-badge').textContent
    ).toBe('3');
    expect(link.textContent).toContain('3 unread');
  });

  it('no badge with nothing unread, and 99+ past 99', () => {
    renderWith(<LearnerNavigationList />);
    expect(screen.queryByTestId('learner-nav-unread-badge')).toBeNull();
    cleanup();
    unread = 120;
    renderWith(<LearnerNavigationList />);
    expect(screen.getByTestId('learner-nav-unread-badge').textContent).toBe(
      '99+'
    );
  });

  it('Arabic: the rail badge is announced in Arabic', () => {
    unread = 2;
    renderWith(<LearnerNavigationList />, 'ar');
    const badge = screen.getByTestId('learner-nav-unread-badge');
    expect(badge.parentElement!.textContent).toContain('2 غير مقروءة');
  });
});
