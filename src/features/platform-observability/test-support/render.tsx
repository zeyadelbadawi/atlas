/** Rendering helpers shared by the Observability page tests. */
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

export function renderPage(
  ui: JSX.Element,
  {
    url,
    path = '*',
    language = 'en',
  }: { url: string; path?: string; language?: 'en' | 'ar' }
) {
  const i18n = createI18nInstance(language);
  // Prints the current URL so tests can assert what filters wrote to it.
  const LocationProbe = (): JSX.Element => {
    const location = useLocation();
    return (
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
    );
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="root">
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route
              path={path}
              element={
                <>
                  {ui}
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </div>
    </I18nextProvider>
  );
}

/** A settled TanStack Query result carrying `data`. */
export function queryResult<T>(
  data: T | undefined,
  overrides: Record<string, unknown> = {}
) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    isPlaceholderData: false,
    error: null,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn(),
    ...overrides,
  };
}
