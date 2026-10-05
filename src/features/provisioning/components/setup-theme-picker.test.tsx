/**
 * Theme 2 (WS-O) — the setup form's theme picker: every selectable theme is
 * a radio with a live preview through the real website renderer, in the
 * Owner's colours; arrow keys move and select (following the reading
 * direction); the chosen key is what the request sends; the previews are
 * hidden from assistive tech, inert, and only rendered near the viewport.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { listWebsiteThemes, type SetupBrandingChoice } from '@features/website';
import type { ProvisioningRequest } from '@types';
import { provisioningService } from '../services/ProvisioningService';
import { AcademySetupForm } from './AcademySetupForm';
import { SetupThemePicker } from './SetupThemePicker';

// jsdom has no ResizeObserver; the form's Radix RadioGroup (payment
// methods section) measures with one.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

let createRequest: ReturnType<typeof vi.fn>;

beforeEach(() => {
  createRequest = vi.fn(
    async () => ({ id: 'req-1' }) as unknown as ProvisioningRequest
  );
  vi.spyOn(provisioningService, 'checkSubdomainAvailability').mockResolvedValue(
    { status: 'available' } as Awaited<
      ReturnType<typeof provisioningService.checkSubdomainAvailability>
    >
  );
  vi.spyOn(provisioningService, 'createProvisioningRequest').mockImplementation(
    (organizationId, payload) =>
      createRequest(organizationId, payload) as Promise<ProvisioningRequest>
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function providers(children: JSX.Element, locale: 'en' | 'ar') {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <ToastContext.Provider value={toastValue}>
          <MemoryRouter>
            <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>{children}</div>
          </MemoryRouter>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function renderForm(locale: 'en' | 'ar' = 'en') {
  const onCreated = vi.fn();
  render(
    providers(
      <AcademySetupForm organizationId="org-1" onCreated={onCreated} />,
      locale
    )
  );
  return { onCreated };
}

function radios(): HTMLElement[] {
  return Array.from(
    screen
      .getByRole('radiogroup', { name: /Theme|المظهر|القالب/ })
      .querySelectorAll<HTMLElement>('[role="radio"]')
  );
}

const checked = (element: HTMLElement) => element.getAttribute('aria-checked');

describe('Setup theme picker', () => {
  it('offers both themes as radios, with names and descriptions; Modern Education is pre-selected', () => {
    renderForm();
    const modern = screen.getByRole('radio', { name: /Modern Education/ });
    const atelier = screen.getByRole('radio', { name: /Atelier/ });
    expect(radios()).toEqual([modern, atelier]);
    expect(modern.textContent).toContain('split hero');
    expect(atelier.textContent).toContain('editorial');
    expect(checked(modern)).toBe('true');
    expect(checked(atelier)).toBe('false');
    // One tab stop: the selected radio.
    expect(modern.tabIndex).toBe(0);
    expect(atelier.tabIndex).toBe(-1);
  });

  it('each option previews the REAL renderer in its own theme, hidden from assistive tech and inert', () => {
    renderForm();
    const previews = screen.getAllByTestId('setup-theme-preview');
    expect(previews).toHaveLength(2);
    expect(
      previews.map((preview) =>
        preview
          .querySelector('[data-theme-pack]')
          ?.getAttribute('data-theme-pack')
      )
    ).toEqual(['modern-education', 'atelier']);
    for (const preview of previews) {
      expect(preview.getAttribute('aria-hidden')).toBe('true');
      expect(preview.hasAttribute('inert')).toBe(true);
      // A representative Home: the sample hero renders inside.
      expect(preview.textContent).toContain('Learn something new at');
    }
  });

  it('arrow keys move and select; Home/End jump; selection wraps', async () => {
    const user = userEvent.setup();
    renderForm();
    const [modern, atelier] = radios();
    modern.focus();
    await user.keyboard('{ArrowRight}');
    expect(checked(atelier)).toBe('true');
    expect(checked(modern)).toBe('false');
    expect(document.activeElement).toBe(atelier);
    expect(atelier.tabIndex).toBe(0);
    await user.keyboard('{ArrowDown}');
    expect(checked(modern)).toBe('true');
    expect(document.activeElement).toBe(modern);
    await user.keyboard('{End}');
    expect(checked(atelier)).toBe('true');
    await user.keyboard('{Home}');
    expect(checked(modern)).toBe('true');
    await user.keyboard('{ArrowUp}');
    expect(checked(atelier)).toBe('true');
  });

  it('a click on the preview card selects that theme; it cannot be cleared', async () => {
    const user = userEvent.setup();
    renderForm();
    const [, atelier] = radios();
    const card = screen.getAllByTestId('setup-theme-preview')[1].parentElement!;
    await user.click(card);
    expect(checked(atelier)).toBe('true');
    await user.click(atelier);
    expect(checked(atelier)).toBe('true');
  });

  it('submits the selected key as selectedThemeKey', async () => {
    const user = userEvent.setup();
    const { onCreated } = renderForm();
    await user.type(screen.getByLabelText('Academy name'), 'Nile Academy');
    expect(await screen.findByDisplayValue('nile-academy')).toBeTruthy();
    radios()[0].focus();
    await user.keyboard('{ArrowRight}');
    const submit = screen.getByRole('button', { name: 'Start provisioning' });
    await waitFor(() =>
      expect((submit as HTMLButtonElement).disabled).toBe(false)
    );
    await user.click(submit);
    await waitFor(() => expect(createRequest).toHaveBeenCalledTimes(1));
    expect(createRequest.mock.calls[0][1]).toMatchObject({
      selectedThemeKey: 'atelier',
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });

  it('Arabic: RTL arrows follow the reading direction, the previews show the Arabic sample', async () => {
    const user = userEvent.setup();
    renderForm('ar');
    const [modern, atelier] = radios();
    expect(modern.textContent).toContain('التعليم الحديث');
    expect(atelier.textContent).toContain('أتيليه');
    for (const preview of screen.getAllByTestId('setup-theme-preview')) {
      expect(preview.textContent).toContain('تعلّم شيئًا جديدًا');
    }
    modern.focus();
    // In RTL the next option is to the LEFT.
    await user.keyboard('{ArrowLeft}');
    expect(checked(atelier)).toBe('true');
    await user.keyboard('{ArrowRight}');
    expect(checked(modern)).toBe('true');
  });
});

describe('Setup theme picker — previews', () => {
  const themes = listWebsiteThemes();

  function renderPicker(branding: SetupBrandingChoice | null) {
    return render(
      providers(
        <SetupThemePicker
          themes={themes}
          value="modern-education"
          onChange={() => undefined}
          label="Theme"
          academyName="Nile"
          branding={branding}
        />,
        'en'
      )
    );
  }

  const scopeStyle = (index: number) => {
    const preview = screen.getAllByTestId('setup-theme-preview').at(index);
    return (
      preview?.querySelector('[data-theme-pack]')?.getAttribute('style') ?? ''
    );
  };

  it('are not rendered until the group nears the viewport', () => {
    let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () =>
      undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof notify) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    renderPicker(null);
    expect(document.querySelector('[data-theme-pack]')).toBeNull();
    act(() => notify([{ isIntersecting: true }]));
    expect(document.querySelectorAll('[data-theme-pack]')).toHaveLength(2);
  });

  it("use each theme's own colours until the Owner picks some, then the Owner's", () => {
    const { rerender } = renderPicker(null);
    const atelierDefault = scopeStyle(1);
    expect(atelierDefault).not.toBe(scopeStyle(0));
    const branding: SetupBrandingChoice = {
      palette: {
        seeds: { primary: '150 60% 30%' },
        overrides: {},
        variant: 'balanced',
        status: 'proposed',
        source: 'manual',
      },
    };
    rerender(
      providers(
        <SetupThemePicker
          themes={themes}
          value="modern-education"
          onChange={() => undefined}
          label="Theme"
          academyName="Nile"
          branding={branding}
        />,
        'en'
      )
    );
    expect(scopeStyle(1)).not.toBe(atelierDefault);
    expect(scopeStyle(1)).toContain('150 60% 30%');
  });
});
