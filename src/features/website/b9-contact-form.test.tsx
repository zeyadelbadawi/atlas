/**
 * B9 (UX audit) V01–V03, V22 — the academy website's Contact form, one
 * behaviour in every theme (`useContactForm`), drawn here through Modern
 * Education, Atelier and Riwaq (and the rules on their own):
 *
 *   - a field of spaces is empty: Send refuses it, says so under the field
 *     and moves focus there — never a silent no-op;
 *   - the email is checked like the API's `@IsEmail()` ("mona@example" is
 *     refused before sending);
 *   - nothing is cut: a counter shows the length and a value over the limit
 *     is refused with the limit;
 *   - a 400 lands on its field; a 429 says how long to wait (Retry-After);
 *     a 500 and a network failure each have their own sentence and Try
 *     again; the alert takes focus; Arabic pages speak Arabic;
 *   - the contact-details sentence is left out when there are no details.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { publicWebsiteService } from '@services';
import { createApiError } from '@api';
import { WebsiteThemeScope } from '@/features/website/renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { getWebsiteTheme } from '@/features/website/themes/website-theme.registry';
import type {
  PublicWebsiteLocale,
  SectionConfigMap,
  WebsitePage,
  WebsiteThemeKey,
} from '@types';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';

let identity: Record<string, unknown> | undefined;
vi.mock('@/shared/hooks/useAcademyIdentity', () => ({
  useAcademyIdentity: () => ({ data: identity }),
}));

const { T1Contact } =
  await import('@/features/website/modern-education/t1-page-sections');
const { AtelierContact } =
  await import('@/features/website/atelier/pages/AtelierContact');
const { RiwaqContact } =
  await import('@/features/website/riwaq/pages/RiwaqContact');
const {
  classifyContactFailure,
  contactSectionDescription,
  isServerAcceptedEmail,
  serverLength,
} = await import('@/features/website/sections/contact/contact-form.logic');
const { normalizeResponseError } = await import('@/services/api/api-error');

type ContactRenderer = ComponentType<SectionRenderProps<'contact'>>;

const THEMES: readonly [string, WebsiteThemeKey, ContactRenderer][] = [
  ['Modern Education', 'modern-education', T1Contact],
  ['Atelier', 'atelier', AtelierContact],
  ['Riwaq', 'riwaq', RiwaqContact],
];

const STARTER = {
  en: 'Reach us directly using our contact details, or send a message using the form.',
  ar: 'تواصل معنا مباشرة عبر بيانات التواصل، أو أرسل رسالة باستخدام النموذج.',
};
const CONFIG = {
  title: { en: 'Get in touch', ar: 'تواصل معنا' },
  description: STARTER,
  showForm: true,
} as unknown as SectionConfigMap['contact'];

function renderContact(
  Contact: ContactRenderer,
  themeKey: WebsiteThemeKey,
  locale: PublicWebsiteLocale = 'en'
) {
  const wrap = (children: ReactNode) => (
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter>
          <WebsiteThemeScope theme={getWebsiteTheme(themeKey)}>
            <PublicWebsiteLocaleProvider locale={locale}>
              {children}
            </PublicWebsiteLocaleProvider>
          </WebsiteThemeScope>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return render(
    wrap(
      <Contact
        config={CONFIG}
        academyId="a1"
        pages={[] as readonly WebsitePage[]}
      />
    )
  );
}

function field(container: HTMLElement, name: string) {
  return container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
}

function type(container: HTMLElement, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(field(container, name), { target: { value } });
  }
}

function send(container: HTMLElement) {
  fireEvent.submit(field(container, 'name').closest('form')!);
}

const VALID = {
  name: 'Mona',
  email: 'mona@example.com',
  message: 'Is there a weekend class?',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  identity = undefined;
});

describe('contact rules (shared by every theme)', () => {
  it('checks the email like the API (a top-level domain is required)', () => {
    expect(isServerAcceptedEmail('mona@example.com')).toBe(true);
    expect(isServerAcceptedEmail('mona.ali+news@mail.example.org')).toBe(true);
    expect(isServerAcceptedEmail('mona@example')).toBe(false);
    expect(isServerAcceptedEmail('mona example@x.com')).toBe(false);
    expect(isServerAcceptedEmail('@example.com')).toBe(false);
    expect(isServerAcceptedEmail('mona@-example.com')).toBe(false);
  });

  it('measures length as the API does (an emoji is one character)', () => {
    expect(serverLength('abc')).toBe(3);
    expect(serverLength('😀😀')).toBe(2);
  });

  it('reads how long to wait from Retry-After', () => {
    const limited = normalizeResponseError(429, {}, { 'retry-after': '125' });
    expect(classifyContactFailure(limited)).toEqual({
      kind: 'rateLimited',
      minutes: 3,
    });
    expect(classifyContactFailure(createApiError('rateLimited'))).toEqual({
      kind: 'rateLimited',
    });
    expect(classifyContactFailure(createApiError('server')).kind).toBe(
      'server'
    );
    expect(classifyContactFailure(createApiError('network')).kind).toBe(
      'network'
    );
  });

  it('keeps the details sentence only when there are details (owner text always)', () => {
    const starter = STARTER.en;
    expect(contactSectionDescription(starter, false)).toBe('');
    expect(contactSectionDescription(starter, true)).toBe(starter);
    expect(contactSectionDescription('Write to us any time.', false)).toBe(
      'Write to us any time.'
    );
  });
});

describe.each(THEMES)('%s contact form', (_name, themeKey, Contact) => {
  it('refuses a name and message of spaces, says why and focuses the field', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = renderContact(Contact, themeKey);
    expect(field(container, 'name').closest('form')!.noValidate).toBe(true);
    type(container, { name: '   ', email: VALID.email, message: '   ' });
    send(container);
    expect(await screen.findByText('Enter your name.')).toBeTruthy();
    expect(screen.getByText('Write your message.')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field(container, 'name'));
    expect(field(container, 'name').getAttribute('aria-invalid')).toBe('true');
  });

  it('refuses "mona@example" before sending', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = renderContact(Contact, themeKey);
    type(container, { ...VALID, email: 'mona@example' });
    send(container);
    expect(
      await screen.findByText(
        'Enter a full email address, like name@example.com.'
      )
    ).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('never cuts the text: counts it and refuses past the limit', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = renderContact(Contact, themeKey);
    expect(field(container, 'message').hasAttribute('maxlength')).toBe(false);
    expect(field(container, 'name').hasAttribute('maxlength')).toBe(false);
    expect(screen.getByText('0 / 5000 characters')).toBeTruthy();
    type(container, { ...VALID, message: 'x'.repeat(5001) });
    expect(screen.getByText('5001 / 5000 characters')).toBeTruthy();
    expect(field(container, 'message').value).toHaveLength(5001);
    send(container);
    expect(
      await screen.findByText(
        'This is too long. Shorten it to 5000 characters or fewer.'
      )
    ).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('sends trimmed values and confirms with a focused status', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = renderContact(Contact, themeKey);
    type(container, { ...VALID, name: '  Mona  ' });
    send(container);
    await waitFor(() =>
      expect(container.querySelector('[data-contact-success]')).toBeTruthy()
    );
    expect(submit).toHaveBeenCalledWith('a1', VALID);
    expect(document.activeElement).toBe(
      container.querySelector('[data-contact-success]')
    );
  });

  it('puts a 400 violation on its field', async () => {
    vi.spyOn(publicWebsiteService, 'submitContactMessage').mockRejectedValue(
      normalizeResponseError(400, {
        error: {
          kind: 'validation',
          violations: [
            { field: 'email', messageKey: 'validation:invalidEmail' },
          ],
        },
      })
    );
    const { container } = renderContact(Contact, themeKey);
    type(container, VALID);
    send(container);
    expect(
      await screen.findByText(
        'Enter a full email address, like name@example.com.'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(field(container, 'email'));
  });

  it('a 429 says how long to wait; no Try again', async () => {
    vi.spyOn(publicWebsiteService, 'submitContactMessage').mockRejectedValue(
      normalizeResponseError(429, {}, { 'retry-after': '540' })
    );
    const { container } = renderContact(Contact, themeKey);
    type(container, VALID);
    send(container);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Please wait 9 minutes');
    expect(document.activeElement).toBe(alert);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('a 500 blames the academy, not the connection, and Try again resends', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockRejectedValueOnce(createApiError('server', { status: 500 }))
      .mockResolvedValueOnce(undefined);
    const { container } = renderContact(Contact, themeKey);
    type(container, VALID);
    send(container);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      "Something went wrong on the academy's side"
    );
    expect(alert.textContent).not.toMatch(/connection/i);
    expect(field(container, 'message').value).toBe(VALID.message);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(container.querySelector('[data-contact-success]')).toBeTruthy()
    );
  });

  it('a network failure (aborted request) says so, with Try again', async () => {
    vi.spyOn(publicWebsiteService, 'submitContactMessage').mockRejectedValue(
      createApiError('network')
    );
    const { container } = renderContact(Contact, themeKey);
    type(container, VALID);
    send(container);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Check your internet connection');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('speaks Arabic on an Arabic page and leaves out the details sentence without details', async () => {
    const { container } = renderContact(Contact, themeKey, 'ar');
    type(container, { name: ' ', email: 'mona@example', message: 'x' });
    send(container);
    expect(await screen.findByText('اكتب اسمك.')).toBeTruthy();
    expect(
      screen.getByText('اكتب عنوان بريد إلكتروني كاملًا، مثل name@example.com.')
    ).toBeTruthy();
    expect(screen.queryByText(STARTER.ar)).toBeNull();
  });
});

describe('the details sentence with details', () => {
  it('stays when the academy has contact details', () => {
    identity = { contactEmail: 'hello@academy.example' };
    renderContact(T1Contact, 'modern-education');
    expect(screen.getByText(STARTER.en)).toBeTruthy();
  });

  it('Modern Education says every field is required', () => {
    renderContact(T1Contact, 'modern-education');
    expect(screen.getByText('All fields are required.')).toBeTruthy();
  });
});
