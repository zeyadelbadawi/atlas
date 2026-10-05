/**
 * Theme 2 (WS-O) — the Theme tab offers every selectable theme with its
 * feature image: Modern Education and Atelier. A theme without one (a
 * retired theme) keeps the live miniature. The picture is decoration
 * (hidden from assistive tech, unreachable by keyboard), each card's action
 * names its theme, and choosing Atelier on a Theme 1 site writes the draft
 * at once (no retired-theme confirmation).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { WebsiteThemeTab } from './WebsiteThemeTab';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import type { WebsiteConfiguration, WebsitePage } from '@types';

// Stand-in for the real renderer: records which theme each miniature uses
// and carries a link, to prove the miniature is unreachable.
vi.mock('../renderer', () => ({
  WebsiteRenderer: ({
    configuration,
  }: {
    configuration: { themeKey: string };
  }) => (
    <a href="/courses" data-testid="miniature">
      {configuration.themeKey}
    </a>
  ),
}));

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
          <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
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
          </div>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('Theme tab — both selectable themes', () => {
  it('shows Modern Education and Atelier, each with its own feature image', () => {
    renderTab('modern-education');
    expect(
      screen.getByRole('heading', { level: 3, name: 'Modern Education' })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Atelier' })
    ).toBeTruthy();
    const frames = screen.getAllByTestId('theme-preview-frame');
    expect(
      frames.map((frame) => frame.querySelector('img')?.getAttribute('src'))
    ).toEqual([
      expect.stringMatching(
        /\/theme-assets\/modern-education\/v2\/theme-card-/
      ),
      expect.stringMatching(/\/theme-assets\/atelier\/v3\/theme-card-/),
    ]);
    expect(screen.queryByTestId('miniature')).toBeNull();
  });

  it('a retired theme without a feature image keeps its live miniature', () => {
    renderTab('premium-academy');
    expect(
      screen.getAllByTestId('miniature').map((node) => node.textContent)
    ).toEqual(['premium-academy']);
  });

  it('pictures are hidden from assistive tech and inert', () => {
    renderTab('premium-academy');
    const frames = screen.getAllByTestId('theme-preview-frame');
    expect(frames).toHaveLength(3);
    for (const frame of frames) {
      expect(frame.getAttribute('aria-hidden')).toBe('true');
      expect(frame.hasAttribute('inert')).toBe(true);
    }
    // The miniature's link is not exposed as a link.
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('names each action with its theme; the active one is "Current theme"', () => {
    renderTab('modern-education');
    const current = screen.getByRole('button', {
      name: 'Current theme Modern Education',
    }) as HTMLButtonElement;
    expect(current.disabled).toBe(true);
    const select = screen.getByRole('button', {
      name: 'Select theme Atelier',
    }) as HTMLButtonElement;
    expect(select.disabled).toBe(false);
  });

  it('selecting Atelier on a Theme 1 site writes the draft at once', async () => {
    const user = userEvent.setup({ delay: null });
    renderTab('modern-education');
    await user.click(
      screen.getByRole('button', { name: 'Select theme Atelier' })
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]).toEqual(['a1', { themeKey: 'atelier' }]);
  });

  it('Arabic: both themes listed, actions translated and named', () => {
    renderTab('atelier', 'ar');
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    // Each accessible name = the translated action + the translated theme name.
    for (const button of buttons) {
      const name = (button.getAttribute('aria-labelledby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');
      expect(name).not.toMatch(/[A-Za-z]/);
      expect(name.trim().split(' ').length).toBeGreaterThan(1);
    }
  });
});
