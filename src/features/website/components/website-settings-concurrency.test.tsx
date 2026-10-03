/**
 * Website settings: no silent overwrites, no silent discards (Task H).
 *
 *  - Navigation, header and footer are full replaces built from the copy
 *    on screen. A save now carries that copy's `updatedAt`, and a refusal
 *    reloads the latest copy and says so instead of a generic failure.
 *  - Switching settings tabs unmounts the tab's form; with unsaved edits
 *    that used to drop them without a word.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { useUnsavedChanges } from '@hooks';
import { UnsavedChangesProvider } from '@features/unsaved-changes';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import { WebsiteNavigationTab } from './WebsiteNavigationTab';
import WebsiteSettingsPage from '../pages/WebsiteSettingsPage';

const mutate = vi.fn();
const invalidate = vi.fn();
const toast = vi.fn();
const confirm = vi.fn();

vi.mock('../hooks', () => ({
  useUpdateWebsiteConfiguration: () => ({ mutate, isPending: false }),
  useWebsiteConfiguration: () => ({
    data: configuration,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWebsitePages: () => ({
    data: { items: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useInvalidate: () => ({ invalidate }),
}));
vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: (arg: unknown) => toast(arg),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
  // `@hooks` and `@/shared/hooks` are the same module.
  useInvalidate: () => ({ invalidate }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm }),
}));
vi.mock('@features/academy', () => ({
  useAcademy: () => ({
    data: { id: 'a1', name: 'Academy', slug: 'academy' },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@features/domain', () => ({ WebsiteDomainTab: () => null }));
vi.mock('./WebsitePublishBar', () => ({ WebsitePublishBar: () => null }));
vi.mock('./WebsiteThemeTab', () => ({ WebsiteThemeTab: () => null }));
// A dirty-able SEO form stands in for any tab with unsaved edits.
vi.mock('./WebsiteSeoTab', () => ({
  WebsiteSeoTab: function SeoStub() {
    const [value, setValue] = useState('');
    useUnsavedChanges({ isDirty: value !== '' });
    return (
      <input
        aria-label="seo-title"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    );
  },
}));

const configuration = {
  id: 'a1',
  academyId: 'a1',
  status: 'draft',
  updatedAt: '2026-10-03T00:00:00.000Z',
  navigation: [],
  header: {},
  footer: { copyrightText: { en: '', ar: '' }, socialLinks: [], groups: [] },
  brand: {},
  seo: {},
} as unknown as WebsiteConfiguration;

const page = { id: 'p1', title: 'About', coreType: 'about' } as WebsitePage;

const i18n = createI18nInstance('en');
const withClient = (ui: JSX.Element) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
);

beforeEach(() => {
  mutate.mockReset();
  invalidate.mockReset();
  toast.mockReset();
  confirm.mockReset();
});
afterEach(cleanup);

describe('navigation tab — saves are based on the copy on screen', () => {
  const renderTab = () =>
    render(
      withClient(
        <I18nextProvider i18n={i18n}>
          <WebsiteNavigationTab
            academyId="a1"
            configuration={configuration}
            pages={[page]}
          />
        </I18nextProvider>
      )
    );

  it("carries the copy's updatedAt", () => {
    renderTab();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0].payload).toMatchObject({
      expectedUpdatedAt: '2026-10-03T00:00:00.000Z',
      navigation: [expect.objectContaining({ pageId: 'p1' })],
    });
  });

  it('a refused save reloads the latest copy and says why', () => {
    renderTab();
    fireEvent.click(screen.getByRole('checkbox'));
    act(() => mutate.mock.calls[0][1].onError({ kind: 'conflict' }));
    expect(invalidate).toHaveBeenCalledWith(['website', 'configuration', 'a1']);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Someone else changed these settings'),
      })
    );
  });

  it('any other failure is the ordinary save error', () => {
    renderTab();
    fireEvent.click(screen.getByRole('checkbox'));
    act(() => mutate.mock.calls[0][1].onError({ kind: 'network' }));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to save navigation' })
    );
  });
});

describe('settings tabs — switching away from unsaved edits asks first', () => {
  const renderPage = () =>
    render(
      withClient(
        <I18nextProvider i18n={i18n}>
          <UnsavedChangesProvider>
            <MemoryRouter initialEntries={['/a1/settings?tab=seo']}>
              <Routes>
                <Route
                  path="/:academyId/settings"
                  element={<WebsiteSettingsPage />}
                />
              </Routes>
            </MemoryRouter>
          </UnsavedChangesProvider>
        </I18nextProvider>
      )
    );
  // Radix tabs switch on mousedown, not click.
  const openTab = (name: string) =>
    act(async () => {
      fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0 });
    });

  it('with nothing unsaved, switches without asking', async () => {
    renderPage();
    await openTab('Navigation');
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('seo-title')).toBeNull();
  });

  it('Stay keeps the tab and the edit', async () => {
    confirm.mockResolvedValue(false);
    renderPage();
    fireEvent.change(screen.getByLabelText('seo-title'), {
      target: { value: 'draft' },
    });
    await openTab('Navigation');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('seo-title') as HTMLInputElement).value).toBe(
      'draft'
    );
  });

  it('Leave discards and switches', async () => {
    confirm.mockResolvedValue(true);
    renderPage();
    fireEvent.change(screen.getByLabelText('seo-title'), {
      target: { value: 'draft' },
    });
    await openTab('Navigation');
    expect(screen.queryByLabelText('seo-title')).toBeNull();
  });
});
