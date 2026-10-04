/**
 * Audit F-12 — leaving a retired theme (Themes 2–5) is one-way: the Theme
 * tab says so up front, and switching asks for confirmation first. Nothing
 * is written until the Owner confirms; a Theme 1 site sees no notice and
 * no extra step.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { WebsiteThemeTab } from './WebsiteThemeTab';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import type { WebsiteConfiguration, WebsitePage } from '@types';

// The cards' miniature previews render the real site; not under test here.
vi.mock('../renderer', () => ({ WebsiteRenderer: () => null }));

const toast = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
} as unknown as ToastContextValue;

let update: MockInstance<
  typeof websiteConfigurationService.updateConfiguration
>;
beforeEach(() => {
  update = vi
    .spyOn(websiteConfigurationService, 'updateConfiguration')
    .mockResolvedValue({} as WebsiteConfiguration);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderTab(themeKey: string, locale: 'en' | 'ar' = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <ToastContext.Provider value={toast}>
          <WebsiteThemeTab
            academyId="a1"
            academyName="Nile"
            configuration={
              { themeKey, brand: {} } as unknown as WebsiteConfiguration
            }
            pages={
              [
                { id: 'p1', coreType: 'home', title: 'Home', sections: [] },
              ] as unknown as WebsitePage[]
            }
          />
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('Theme tab — retired themes (F-12)', () => {
  it('explains, before anything is clicked, that the current theme is retired and leaving it is one-way', () => {
    renderTab('bold-creative');
    expect(screen.getByText('Bold Creative is no longer offered')).toBeTruthy();
    expect(screen.getByText(/can't be undone/)).toBeTruthy();
  });

  it('asks for confirmation; Cancel writes nothing', async () => {
    const user = userEvent.setup({ delay: null });
    renderTab('bold-creative');
    // One card per selectable theme, Theme 1 first.
    await user.click(screen.getAllByRole('button', { name: 'Select theme' })[0]);
    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText('Switch to Modern Education?')
    ).toBeTruthy();
    expect(
      within(dialog).getByText(/won't be able to switch back/)
    ).toBeTruthy();
    expect(
      within(dialog).getByText(/doesn't change until you publish/)
    ).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(update).not.toHaveBeenCalled();
  });

  it('switches the draft only after confirming', async () => {
    const user = userEvent.setup({ delay: null });
    renderTab('premium-academy');
    await user.click(screen.getAllByRole('button', { name: 'Select theme' })[0]);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Switch theme',
      })
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]).toEqual([
      'a1',
      { themeKey: 'modern-education' },
    ]);
  });

  it('Arabic: the notice is translated', () => {
    renderTab('corporate-learning', 'ar');
    expect(screen.getByText(/لم يعد مظهر/)).toBeTruthy();
  });

  it('a Theme 1 site: no notice, and no extra step', () => {
    renderTab('modern-education');
    expect(screen.queryByText(/no longer offered/)).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
