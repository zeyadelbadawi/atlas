/**
 * B0-WEB-02 — the site's main language in the dashboard: the Language
 * setting saves `defaultLocale`, and the editor's bilingual fields and
 * section validation follow it (Arabic required on an Arabic-default site,
 * English everywhere else, exactly as before).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { UnsavedChangesProvider } from '@features/unsaved-changes';
import type { WebsiteConfiguration } from '@types';
import { WebsiteLanguageTab } from './WebsiteLanguageTab';
import { LocalizedTextField } from './LocalizedTextField';
import { WebsiteContentLocaleProvider } from './website-content-locale';
import { collectSectionIssues } from '../schemas/section-content-issues';
import { withRequiredLocale } from '../schemas/website-section.schemas';
import { getSectionConfigSchema } from '../schemas/website-section.schemas';

const mutateAsync = vi.fn();
const toast = vi.fn();

vi.mock('../hooks', () => ({
  useUpdateWebsiteConfiguration: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: (arg: unknown) => toast(arg),
}));

const configuration = (defaultLocale?: 'ar') =>
  ({
    academyId: 'a1',
    ...(defaultLocale ? { defaultLocale } : {}),
  }) as unknown as WebsiteConfiguration;

function wrap(ui: JSX.Element, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <UnsavedChangesProvider>{ui}</UnsavedChangesProvider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  toast.mockReset();
});
afterEach(cleanup);

describe('Website → Language', () => {
  it('shows English selected for a site without the setting, and saves Arabic', async () => {
    wrap(<WebsiteLanguageTab academyId="a1" configuration={configuration()} />);
    expect(screen.getByText('Main language')).toBeTruthy();
    const english = screen.getByRole('radio', { name: /^English/ });
    const arabic = screen.getByRole('radio', { name: /^العربية/ });
    expect(english.getAttribute('aria-checked')).toBe('true');
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    // The explanation names both address layouts and the publish step.
    expect(screen.getByText(/Arabic pages under \/ar/)).toBeTruthy();
    expect(screen.getByText(/English pages under \/en/)).toBeTruthy();
    expect(screen.getByText(/goes live when you publish/)).toBeTruthy();

    fireEvent.click(arabic);
    expect((save as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(save);
    await vi.waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        academyId: 'a1',
        payload: { defaultLocale: 'ar' },
      })
    );
    await vi.waitFor(() => expect(toast).toHaveBeenCalled());
  });

  it('reads an Arabic-default site and is translated', () => {
    wrap(
      <WebsiteLanguageTab academyId="a1" configuration={configuration('ar')} />,
      'ar'
    );
    expect(screen.getByText('اللغة الرئيسية')).toBeTruthy();
    expect(
      screen
        .getByRole('radio', { name: /^العربية/ })
        .getAttribute('aria-checked')
    ).toBe('true');
  });
});

describe('LocalizedTextField follows the main language', () => {
  const labels = () =>
    screen.getAllByText(/English|Arabic/).map((node) => node.textContent);

  it('English-default: English first and required, Arabic optional (unchanged)', () => {
    wrap(<LocalizedTextField id="t" labelKey="website:seo.siteTitle" />);
    expect(labels()).toEqual(['English', 'Arabic · optional']);
  });

  it('Arabic-default: Arabic first and required, English optional', () => {
    wrap(
      <WebsiteContentLocaleProvider value="ar">
        <LocalizedTextField id="t" labelKey="website:seo.siteTitle" />
      </WebsiteContentLocaleProvider>
    );
    expect(labels()).toEqual(['Arabic', 'English · optional']);
  });
});

describe('section validation follows the main language', () => {
  const arabicOnly = { title: { en: '', ar: 'أهلاً' } };
  const englishOnly = { title: { en: 'Welcome', ar: '' } };

  it('English-default requires English (unchanged)', () => {
    expect(collectSectionIssues('hero', englishOnly)).toEqual([]);
    expect(collectSectionIssues('hero', arabicOnly)).toEqual([
      { path: 'title.en', messageKey: 'validation:required' },
    ]);
  });

  it('Arabic-default requires Arabic and lets English be empty', () => {
    expect(collectSectionIssues('hero', arabicOnly, 'ar')).toEqual([]);
    expect(collectSectionIssues('hero', englishOnly, 'ar')).toEqual([
      { path: 'title.ar', messageKey: 'validation:required' },
    ]);
    // …only for that parse.
    expect(getSectionConfigSchema('hero').safeParse(arabicOnly).success).toBe(
      false
    );
    expect(
      withRequiredLocale('ar', () =>
        getSectionConfigSchema('hero').safeParse(arabicOnly)
      ).success
    ).toBe(true);
  });
});
