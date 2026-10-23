/**
 * CMS phase 3d (batch C) — every theme (and the base renderers the retired
 * themes use) draws the interest form, the notice strip and the comparison
 * table in its own frame:
 *   - the interest form says what is wrong only once a field is left (or on
 *     submit), moves focus to the first field to fix, sends the Contact
 *     form's payload marked `interest` with its section id, and announces
 *     success in a focused status region; previews send nothing;
 *   - the notice strip is one line and one button on its tone, and cannot
 *     be dismissed;
 *   - the comparison is a real table (column and row headers, ✓ / ✗ said
 *     in words) with a card per row for phones, and stays off the public
 *     site until it has two columns and a row.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { publicWebsiteService } from '@services';
import { createApiError } from '@api';
import { PublicWebsiteLocaleProvider } from './renderer/PublicWebsiteLocaleContext';
import { WebsiteIdentityProvider } from './renderer/WebsiteIdentityContext';
import { WebsiteThemeScope } from './renderer/WebsiteThemeScope';
import { getWebsiteTheme } from './themes/website-theme.registry';
import { MODERN_EDUCATION_PACK } from './modern-education/modern-education.pack';
import { ATELIER_PACK } from './atelier/atelier.pack';
import { MANARA_PACK } from './manara/manara.pack';
import { RIWAQ_PACK } from './riwaq/riwaq.pack';
import { BASE_RENDERERS } from './theme-packs/base-renderers';
import type { WebsiteLinkRenderer } from './renderer/website-link-renderer.types';
import type {
  SectionRenderProps,
  SectionRenderers,
} from './theme-packs/theme-pack.types';
import type { PublicWebsiteLocale, SectionType, WebsiteThemeKey } from '@types';

const lt = (en: string, ar = '') => ({ en, ar });
const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

const THEMES: readonly (readonly [
  string,
  WebsiteThemeKey,
  Partial<SectionRenderers>,
])[] = [
  ['modern-education', 'modern-education', MODERN_EDUCATION_PACK.renderers],
  ['atelier', 'atelier', ATELIER_PACK.renderers],
  ['manara', 'manara', MANARA_PACK.renderers],
  ['riwaq', 'riwaq', RIWAQ_PACK.renderers],
  ['base (retired themes)', 'premium-academy', BASE_RENDERERS],
];

/** How each theme marks the strip's tone on its frame. */
const TONE_ATTRIBUTES: Record<string, readonly [string, string, string]> = {
  'modern-education': ['data-tone', 'brand', 'ink'],
  atelier: ['data-env', 'brand', 'ink'],
  manara: ['data-env', 'block', 'night'],
  riwaq: ['data-ground', 'brand', 'deep'],
  'premium-academy': ['data-announcement-tone', 'brand', 'dark'],
};

const CONFIGS = {
  interestForm: {
    title: lt('Register your interest', 'سجّل اهتمامك'),
    description: lt('We will call you back.'),
    emailField: 'optional',
    choiceField: 'required',
    choiceLabel: lt('Grade', 'الصف'),
    options: [
      { id: 'g1', label: lt('First secondary', 'الأول الثانوي') },
      { id: 'g2', label: lt('Second secondary', 'الثاني الثانوي') },
    ],
    messageField: 'hidden',
    submitLabel: lt('Call me back'),
    successMessage: lt('Thanks, we will call you tomorrow.'),
  },
  announcementBar: {
    text: lt('Registration for 2026/2027 is open', 'التسجيل مفتوح'),
    tone: 'brand',
    cta: { label: lt('Register now'), url: 'https://example.com/join' },
  },
  comparison: {
    title: lt('Our academy or studying alone?'),
    description: lt('Side by side.'),
    columns: [
      { id: 'us', label: lt('Our academy'), highlighted: true },
      { id: 'alone', label: lt('Studying alone') },
    ],
    rows: [
      {
        id: 'r1',
        label: lt('Live classes'),
        cells: [
          { column: 'us', value: 'yes' },
          { column: 'alone', value: 'no' },
        ],
      },
      {
        id: 'r2',
        label: lt('Answers to questions'),
        cells: [{ column: 'us', value: 'text', text: lt('Same day') }],
      },
    ],
  },
} as const;

function renderSection(
  themeKey: WebsiteThemeKey,
  renderers: Partial<SectionRenderers>,
  type: SectionType,
  config: unknown,
  { isPublic = true, locale = 'en' as PublicWebsiteLocale } = {}
) {
  const Renderer = (renderers[type] ?? BASE_RENDERERS[type]) as ComponentType<
    SectionRenderProps<SectionType>
  >;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter>
          <WebsiteIdentityProvider value={{ name: 'Horizon Academy' }}>
            <PublicWebsiteLocaleProvider locale={locale}>
              <WebsiteThemeScope
                theme={getWebsiteTheme(themeKey)}
                brand={{
                  primaryColor: '',
                  secondaryColor: '',
                  accentColor: '',
                }}
              >
                <Renderer
                  config={config as never}
                  academyId="a1"
                  sectionId="interest-section-1"
                  pages={[]}
                  linkRenderer={isPublic ? linkRenderer : undefined}
                />
              </WebsiteThemeScope>
            </PublicWebsiteLocaleProvider>
          </WebsiteIdentityProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

/** The real phone control replaces the look-alike once its code loads. */
async function phoneLoaded() {
  await waitFor(() =>
    expect(screen.getByTestId('phone-number-input')).toBeTruthy()
  );
}

async function fillValid() {
  await phoneLoaded();
  fireEvent.change(screen.getByLabelText('Your name'), {
    target: { value: '  Mariam  ' },
  });
  fireEvent.change(screen.getByLabelText('Phone number'), {
    target: { value: '0100 123 4567' },
  });
  fireEvent.change(screen.getByLabelText('Grade'), {
    target: { value: 'g2' },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('every theme has its own renderer for the batch C sections', () => {
  it.each(['interestForm', 'announcementBar', 'comparison'] as const)(
    '%s',
    (type) => {
      for (const [, , renderers] of THEMES.slice(0, 4)) {
        expect(renderers[type]).toBeTypeOf('function');
        expect(renderers[type]).not.toBe(BASE_RENDERERS[type]);
      }
    }
  );
});

describe.each(THEMES)('%s', (_name, themeKey, renderers) => {
  it('the interest form has visible labels, marks the optional field and offers the options', async () => {
    renderSection(themeKey, renderers, 'interestForm', CONFIGS.interestForm);
    expect(
      screen.getByRole('heading', { name: 'Register your interest' })
    ).toBeTruthy();
    const form = screen.getByRole('form', { name: 'Register your interest' });
    expect(within(form).getByLabelText('Your name')).toBeTruthy();
    expect(within(form).getByLabelText('Phone number')).toBeTruthy();
    expect(within(form).getByLabelText(/Email\s*\(optional\)/)).toBeTruthy();
    const choice = within(form).getByLabelText('Grade') as HTMLSelectElement;
    expect([...choice.options].map((option) => option.text)).toEqual([
      'Choose one',
      'First secondary',
      'Second secondary',
    ]);
    // The message field is hidden by the Owner.
    expect(within(form).queryByLabelText(/Message/)).toBeNull();
    expect(
      within(form).getByRole('button', { name: 'Call me back' })
    ).toBeTruthy();
    await phoneLoaded();
  });

  it('says what is wrong only after a field is left, and focuses the first problem on submit', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    renderSection(themeKey, renderers, 'interestForm', CONFIGS.interestForm);
    await phoneLoaded();
    const name = screen.getByLabelText('Your name');
    expect(screen.queryByText('Enter your name.')).toBeNull();
    fireEvent.blur(name);
    expect(screen.getByText('Enter your name.')).toBeTruthy();
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe(
      screen.getByText('Enter your name.').id
    );

    fireEvent.change(name, { target: { value: 'Mariam' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Call me back' }));
    });
    expect(document.activeElement).toBe(screen.getByLabelText('Phone number'));
    expect(screen.getByText('Enter your mobile number')).toBeTruthy();
    expect(screen.getByText('Choose an option for “Grade”.')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('sends the Contact form’s payload marked as interest and announces success in a focused status', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    renderSection(themeKey, renderers, 'interestForm', CONFIGS.interestForm);
    await fillValid();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Call me back' }));
    });
    expect(submit).toHaveBeenCalledWith('a1', {
      kind: 'interest',
      sectionId: 'interest-section-1',
      name: 'Mariam',
      phoneNumber: '0100 123 4567',
      phoneCountry: 'EG',
      locale: 'en',
      choice: 'g2',
    });
    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('Thanks, we will call you tomorrow.');
    expect(document.activeElement).toBe(status);
  });

  it('shows a refused option on its field and a busy server as an alert', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockRejectedValueOnce(
        createApiError('validation', {
          messageKey: 'errors.validation.failed',
          violations: [
            { field: 'choice', messageKey: 'validation:invalidChoice' },
          ],
        })
      )
      .mockRejectedValueOnce(createApiError('rateLimited'));
    renderSection(themeKey, renderers, 'interestForm', CONFIGS.interestForm);
    await fillValid();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Call me back' }));
    });
    expect(
      screen.getByText(
        'This option is no longer offered. Refresh the page and choose again.'
      )
    ).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Grade'));

    fireEvent.change(screen.getByLabelText('Grade'), {
      target: { value: 'g1' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Call me back' }));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/wait a few minutes/);
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('sends nothing from a preview', async () => {
    const submit = vi.spyOn(publicWebsiteService, 'submitContactMessage');
    renderSection(themeKey, renderers, 'interestForm', CONFIGS.interestForm, {
      isPublic: false,
    });
    await fillValid();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Call me back' }));
    });
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/nothing was sent/);
  });

  it('the notice strip is one line and one button on its tone, and cannot be dismissed', () => {
    const [attribute, brand, dark] = TONE_ATTRIBUTES[themeKey]!;
    const { container } = renderSection(
      themeKey,
      renderers,
      'announcementBar',
      CONFIGS.announcementBar
    );
    const strip = screen.getByRole('region', { name: 'Announcement' });
    expect(strip.getAttribute(attribute)).toBe(brand);
    expect(
      within(strip).getByText('Registration for 2026/2027 is open')
    ).toBeTruthy();
    expect(
      within(strip)
        .getByRole('link', { name: /Register now/ })
        .getAttribute('href')
    ).toBe('https://example.com/join');
    expect(within(strip).queryAllByRole('button')).toHaveLength(0);
    cleanup();

    renderSection(themeKey, renderers, 'announcementBar', {
      ...CONFIGS.announcementBar,
      tone: 'dark',
      cta: undefined,
    });
    const darkStrip = screen.getByRole('region', { name: 'Announcement' });
    expect(darkStrip.getAttribute(attribute)).toBe(dark);
    expect(within(darkStrip).queryAllByRole('link')).toHaveLength(0);
    expect(container.querySelector('marquee')).toBeNull();
  });

  it('the comparison is a real table with headers, and ✓ / ✗ said in words', () => {
    const { container } = renderSection(
      themeKey,
      renderers,
      'comparison',
      CONFIGS.comparison
    );
    const table = container.querySelector('table')!;
    expect(table.querySelector('caption')!.textContent).toBe(
      'Our academy or studying alone?'
    );
    const columns = [...table.querySelectorAll('thead th')];
    expect(columns.every((th) => th.getAttribute('scope') === 'col')).toBe(
      true
    );
    expect(columns.map((th) => th.textContent)).toEqual([
      'Feature',
      'Our academy (highlighted)',
      'Studying alone',
    ]);
    const rowHeaders = [...table.querySelectorAll('tbody th')];
    expect(rowHeaders.map((th) => th.getAttribute('scope'))).toEqual([
      'row',
      'row',
    ]);
    const firstRow = table.querySelectorAll('tbody tr')[0]!;
    expect(
      [...firstRow.querySelectorAll('td')].map((td) => td.textContent)
    ).toEqual(['Yes', 'No']);
    const secondRow = table.querySelectorAll('tbody tr')[1]!;
    expect(
      [...secondRow.querySelectorAll('td')].map((td) => td.textContent)
    ).toEqual(['Same day', 'Not specified']);
    // Phones: a card per row, each column named beside its value.
    const cards = container.querySelectorAll('[data-comparison] ul > li');
    expect(cards).toHaveLength(2);
    expect(
      within(cards[0] as HTMLElement).getByRole('heading', {
        name: 'Live classes',
      })
    ).toBeTruthy();
    expect(
      [...(cards[0] as HTMLElement).querySelectorAll('dt')].map(
        (dt) => dt.textContent
      )
    ).toEqual(['Our academy', 'Studying alone']);
  });

  it('the comparison stays off the public site until it has two columns and a row; a preview says why', () => {
    const unfinished = {
      ...CONFIGS.comparison,
      columns: [CONFIGS.comparison.columns[0]],
    };
    const { container } = renderSection(
      themeKey,
      renderers,
      'comparison',
      unfinished
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    renderSection(themeKey, renderers, 'comparison', unfinished, {
      isPublic: false,
    });
    expect(
      screen.getByText(/Visitors don’t see this table until then/)
    ).toBeTruthy();
  });

  it('draws in Arabic with the options and the strip in Arabic', async () => {
    renderSection(themeKey, renderers, 'interestForm', CONFIGS.interestForm, {
      locale: 'ar',
    });
    expect(screen.getByRole('heading', { name: 'سجّل اهتمامك' })).toBeTruthy();
    const choice = screen.getByLabelText('الصف') as HTMLSelectElement;
    expect(choice.options[1]!.text).toBe('الأول الثانوي');
    await phoneLoaded();
    // The phone control stays left-to-right inside the Arabic page.
    expect(
      screen.getByTestId('phone-number-input').closest('[dir="ltr"]')
    ).toBeTruthy();
  });
});
