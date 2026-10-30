/**
 * Test harness for the Launch & content pages: query client, the real i18n
 * resources (EN or AR), the localization context and a memory router with
 * the page mounted at its real route pattern. API calls are served by
 * spying on `apiClient` (the founding page tests' pattern).
 */
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import type { LocalizationContextValue } from '@app/providers/localization/localization.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import type { LanguageCode } from '@types';

const I18N = {
  en: createI18nInstance('en'),
  ar: createI18nInstance('ar'),
} as const;

function localization(language: LanguageCode): LocalizationContextValue {
  const isRtl = language === 'ar';
  return {
    language,
    languageDefinition: {} as LocalizationContextValue['languageDefinition'],
    direction: isRtl ? 'rtl' : 'ltr',
    isRtl,
    locale: isRtl ? 'ar-EG' : 'en-US',
    availableLanguages: [],
    setLanguage: () => undefined,
  };
}

export interface RenderOptions {
  readonly language?: LanguageCode;
  /** The URL to start at. */
  readonly url: string;
  /** The route pattern the page is mounted at (params come from it). */
  readonly path: string;
  /** Extra routes (e.g. where a create navigates to). */
  readonly extra?: readonly { path: string; element: ReactElement }[];
  /** Toast spies (`notifySuccess`, `notifyError`, …). */
  readonly toast?: Partial<ToastContextValue>;
}

const noop = () => undefined;

export function renderPage(element: ReactElement, options: RenderOptions) {
  const language = options.language ?? 'en';
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider
        value={{
          notify: noop,
          notifySuccess: noop,
          notifyError: noop,
          dismissAll: noop,
          ...options.toast,
        }}
      >
        <I18nextProvider i18n={I18N[language]}>
          <LocalizationContext.Provider value={localization(language)}>
            <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <MemoryRouter initialEntries={[options.url]}>
                <Routes>
                  <Route path={options.path} element={element} />
                  {(options.extra ?? []).map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                  <Route path="*" element={<p>elsewhere</p>} />
                </Routes>
              </MemoryRouter>
            </div>
          </LocalizationContext.Provider>
        </I18nextProvider>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
  return { ...result, queryClient };
}

/** jsdom gaps Radix needs. */
export function installDomShims(): void {
  const proto = window.HTMLElement.prototype as unknown as Record<
    string,
    unknown
  >;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.scrollIntoView = () => undefined;
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/** A raw `platformLaunch:` key or an i18next missing-key marker on screen. */
export const RAW_KEY =
  /platformLaunch:|(?:^|\s)(?:editor|blog|announcements|announcementEditor|checklist|launch)\.[a-z]+\.[a-zA-Z]+/;

/** An Atlas-style API error, as the client throws it. */
export function apiError(
  status: number,
  messageKey: string,
  kind = 'conflict'
) {
  return Object.assign(new Error(messageKey), {
    name: 'ApiError',
    kind,
    status,
    messageKey,
    retryable: false,
  });
}
