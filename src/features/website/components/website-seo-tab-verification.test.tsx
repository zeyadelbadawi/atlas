/**
 * SEO/AEO/GEO pass — the Website SEO tab: the owner can paste Google Search
 * Console's and Bing Webmaster Tools' verification tags (only the token is
 * saved), and the tab says what search and AI engines get and what the
 * owner still has to do in those tools.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { UnsavedChangesProvider } from '@features/unsaved-changes';
import type { WebsiteConfiguration } from '@types';
import { WebsiteSeoTab } from './WebsiteSeoTab';

// The Radix checkbox measures itself.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const mutateAsync = vi.fn();

vi.mock('../hooks', () => ({
  useUpdateWebsiteConfiguration: () => ({
    mutateAsync,
    isPending: false,
    error: null,
  }),
}));
vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: () => undefined,
}));
vi.mock('@features/academy', () => ({
  useAcademy: () => ({
    data: {
      id: 'a1',
      name: 'Horizon',
      description: 'Design courses.',
      contactEmail: 'hi@horizon.example',
    },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('./WebsiteImageField', () => ({ WebsiteImageField: () => null }));

const configuration = {
  id: 'c1',
  academyId: 'a1',
  seo: { googleSiteVerification: 'existing_1' },
} as unknown as WebsiteConfiguration;

const i18n = createI18nInstance('en');

function renderTab() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <UnsavedChangesProvider>
            <WebsiteSeoTab academyId="a1" configuration={configuration} />
          </UnsavedChangesProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(configuration);
});
afterEach(cleanup);

describe('WebsiteSeoTab — search engine verification', () => {
  it('saves only the token of a pasted Search Console / Bing tag', async () => {
    renderTab();
    const google = screen.getByLabelText(
      'Google Search Console verification'
    ) as HTMLInputElement;
    expect(google.value).toBe('existing_1');
    fireEvent.change(
      screen.getByLabelText('Bing Webmaster Tools verification'),
      {
        target: { value: '<meta name="msvalidate.01" content="0123ABCDEF" />' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const payload = mutateAsync.mock.calls[0][0].payload;
    expect(payload.seo.googleSiteVerification).toBe('existing_1');
    expect(payload.seo.bingSiteVerification).toBe('0123ABCDEF');
  });

  it('refuses anything that is not a token', async () => {
    renderTab();
    fireEvent.change(
      screen.getByLabelText('Google Search Console verification'),
      {
        target: { value: 'not a token"><script>' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() =>
      expect(
        screen
          .getByLabelText('Google Search Console verification')
          .getAttribute('aria-invalid')
      ).toBe('true')
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('explains what the site gets and what the owner does in Search Console and Bing', () => {
    renderTab();
    expect(screen.getByText('Search engines and AI assistants')).toBeTruthy();
    expect(screen.getByText(/llms\.txt/)).toBeTruthy();
    expect(
      screen.getByText(/Google Search Console, add a URL-prefix property/)
    ).toBeTruthy();
  });
});
