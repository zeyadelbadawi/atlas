/**
 * CMS phase 4 — the header/footer lock (`chromeLocked`) where the header,
 * menu and footer are edited (`WebsiteNavigationTab`, used by the settings
 * page and the visual editor's Site panel):
 * - only an academy owner or administrator sees the switch;
 * - while locked, every field is read-only, with the reason, for everyone;
 * - a save refused for the lock (409 `errors.website.chromeLocked`) says so;
 * - each bilingual input's name carries its field and language.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@/services/api/api-error';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import { WebsiteNavigationTab } from './WebsiteNavigationTab';
import { LocalizedTextField } from './LocalizedTextField';
import { WebsiteContentLocaleProvider } from './website-content-locale';

const mutate = vi.fn();
const invalidate = vi.fn();
const toast = vi.fn();
let role: string | undefined;

vi.mock('../hooks', () => ({
  useUpdateWebsiteConfiguration: () => ({ mutate, isPending: false }),
}));
vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useInvalidate: () => ({ invalidate }),
}));
vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: (arg: unknown) => toast(arg),
}));
vi.mock('@features/academy', () => ({
  useAcademyScope: () => ({
    membership: role ? { academy: { id: 'a1' }, role } : undefined,
  }),
}));

const configuration = (chromeLocked?: boolean) =>
  ({
    id: 'a1',
    academyId: 'a1',
    status: 'draft',
    updatedAt: '2026-10-03T00:00:00.000Z',
    navigation: [],
    header: {},
    footer: { copyrightText: { en: '', ar: '' }, socialLinks: [], groups: [] },
    brand: {},
    seo: {},
    ...(chromeLocked === undefined ? {} : { chromeLocked }),
  }) as unknown as WebsiteConfiguration;

const page = { id: 'p1', title: 'About', coreType: 'about' } as WebsitePage;

function renderTab(config: WebsiteConfiguration, language: 'en' | 'ar' = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <WebsiteNavigationTab
          academyId="a1"
          configuration={config}
          pages={[page]}
        />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mutate.mockReset();
  invalidate.mockReset();
  toast.mockReset();
  role = undefined;
});
afterEach(cleanup);

describe('header/footer lock', () => {
  it.each(['owner', 'administrator'])('lets an academy %s lock it', (who) => {
    role = who;
    renderTab(configuration());
    const toggle = screen.getByRole('switch', {
      name: 'Lock the header, menu and footer',
    });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(mutate).toHaveBeenCalledWith(
      { academyId: 'a1', payload: { chromeLocked: true } },
      expect.anything()
    );
  });

  it('shows a manager no switch, and nothing at all while unlocked', () => {
    role = 'manager';
    renderTab(configuration(false));
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByTestId('chrome-lock')).toBeNull();
    expect(
      (screen.getByTestId('chrome-fields') as HTMLFieldSetElement).disabled
    ).toBe(false);
  });

  it('makes every field read-only while locked, and says why', () => {
    role = 'manager';
    renderTab(configuration(true));
    const notice = screen.getByTestId('chrome-lock');
    expect(notice.textContent).toContain(
      'The header, menu and footer are locked'
    );
    const fields = screen.getByTestId('chrome-fields') as HTMLFieldSetElement;
    expect(fields.disabled).toBe(true);
    // The notice is the fieldset's legend: it names the read-only group.
    expect(fields.querySelector(':scope > legend')?.contains(notice)).toBe(
      true
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('lets an owner unlock it while locked', () => {
    role = 'owner';
    renderTab(configuration(true));
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(mutate.mock.calls[0][0].payload).toEqual({ chromeLocked: false });
  });

  it('translates a save refused because it was locked meanwhile', () => {
    renderTab(configuration(false));
    fireEvent.click(screen.getByRole('checkbox'));
    mutate.mock.calls[0][1].onError(
      createApiError('conflict', {
        code: 'website_chrome_locked',
        messageKey: 'errors.website.chromeLocked',
        details: { areas: 'navigation' },
      })
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining(
          'The header, menu and footer are locked'
        ),
      })
    );
    expect(invalidate).toHaveBeenCalled();
  });

  it('translates a refused toggle for a role that may not change it', () => {
    role = 'owner';
    renderTab(configuration(false));
    fireEvent.click(screen.getByRole('switch'));
    mutate.mock.calls[0][1].onError(
      createApiError('forbidden', {
        code: 'website_chrome_lock_forbidden',
        messageKey: 'errors.website.chromeLockForbidden',
      })
    );
    expect(toast.mock.calls[0][0].title).toBe(
      'Only the academy owner or an administrator can lock or unlock the header, menu and footer.'
    );
  });
});

describe('bilingual inputs are named by field and language', () => {
  const renderField = (language: 'en' | 'ar', site: 'en' | 'ar' = 'en') =>
    render(
      <I18nextProvider i18n={createI18nInstance(language)}>
        <WebsiteContentLocaleProvider value={site}>
          <LocalizedTextField id="t" labelKey="website:fields.title" />
        </WebsiteContentLocaleProvider>
      </I18nextProvider>
    );

  it('in English', () => {
    renderField('en');
    expect(
      screen.getByRole('textbox', { name: 'Title — English' })
    ).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'Title — Arabic (optional)' })
    ).toBeTruthy();
  });

  it('in Arabic, on an Arabic-default site', () => {
    renderField('ar', 'ar');
    expect(
      screen.getByRole('textbox', { name: 'العنوان — العربية' })
    ).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'العنوان — الإنجليزية (اختياري)' })
    ).toBeTruthy();
  });

  it('names the menu labels the same way', () => {
    renderTab({
      ...configuration(),
      navigation: [
        { id: 'n1', pageId: 'p1', label: { en: 'About', ar: '' }, order: 0 },
      ],
    } as unknown as WebsiteConfiguration);
    expect(
      screen.getByRole('textbox', { name: 'Menu item label — English' })
    ).toBeTruthy();
  });
});
