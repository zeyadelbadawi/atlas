/**
 * Stale-tab recovery — the section error boundary's "Try again".
 *
 *  - A chunk that could not be loaded (a tab left open across a deploy):
 *    React.lazy cached the failure, so re-rendering can never help; the
 *    boundary says Atlas was updated and its button reloads the page.
 *    Offline, it waits for the connection and reloads then.
 *  - Any other error: "Try again" REMOUNTS the section (and resets failed
 *    queries), so a transient failure recovers in place; a section that
 *    keeps failing is offered a reload instead of an endless loop.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ErrorBoundary } from './ErrorBoundary';

const reload = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload },
  });
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
  reload.mockReset();
  vi.restoreAllMocks();
});

function renderIn(ui: JSX.Element, resetKey = '/a') {
  const i18n = createI18nInstance('en');
  const view = render(
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary resetKey={resetKey}>{ui}</ErrorBoundary>
    </I18nextProvider>
  );
  return {
    ...view,
    navigate: (key: string) =>
      view.rerender(
        <I18nextProvider i18n={i18n}>
          <ErrorBoundary resetKey={key}>{ui}</ErrorBoundary>
        </I18nextProvider>
      ),
  };
}

function Throws({ error }: { error: Error }): JSX.Element {
  throw error;
}

describe('error boundary recovery', () => {
  it('a chunk lost to a deploy: explains the update, and its button reloads', async () => {
    renderIn(
      <Throws
        error={
          new TypeError(
            'Failed to fetch dynamically imported module: /assets/X-1.js'
          )
        }
      />
    );
    expect(screen.getByText('Atlas was updated')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a chunk that failed offline: reloads by itself when the connection returns', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    renderIn(
      <Throws
        error={
          new TypeError(
            'Failed to fetch dynamically imported module: /assets/X-1.js'
          )
        }
      />
    );
    expect(screen.getByText("You're offline")).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('online'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('"Try again" remounts the section: a transient failure recovers in place', async () => {
    let broken = true;
    function Flaky(): JSX.Element {
      if (broken) throw new Error('transient');
      return <p>Section content</p>;
    }
    renderIn(<Flaky />);
    expect(
      screen.getByText('This section could not be displayed')
    ).toBeTruthy();
    broken = false; // the transient condition has passed
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Section content')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('a section that keeps failing is offered a reload, not an endless "Try again"', async () => {
    renderIn(<Throws error={new Error('always')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('navigating away clears the failure', () => {
    let fail = true;
    function Page(): JSX.Element {
      if (fail) throw new Error('page bug');
      return <p>Other page</p>;
    }
    const view = renderIn(<Page />, '/broken');
    expect(
      screen.getByText('This section could not be displayed')
    ).toBeTruthy();
    fail = false;
    view.navigate('/other');
    expect(screen.getByText('Other page')).toBeTruthy();
  });
});
