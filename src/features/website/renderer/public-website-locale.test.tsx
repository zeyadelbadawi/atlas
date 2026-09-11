/**
 * Regression tests for the CMS section preview rendering left-to-right
 * while Arabic was selected.
 *
 * WHAT ACTUALLY BROKE. Direction was never a property of the locale — it
 * was set by `WebsiteChrome`, one particular shell. The full-page preview
 * mounts that shell, so Phase 11's fix made it correct; the individual
 * section preview inside the section editor modal does NOT mount it. It
 * renders `PublicWebsiteLocaleProvider` + `SectionRenderer` on their own,
 * inherited `dir="ltr"` from the surrounding dashboard, and so showed
 * Arabic copy laid out left-to-right with the wrong text alignment.
 *
 * The fix makes the provider itself emit `dir`, so these tests are
 * deliberately written against the PROVIDER rather than against either
 * preview surface: they assert the property that makes every present and
 * future surface correct by construction. A test that only checked the
 * section modal would pass again the next time someone builds a third
 * preview that forgets `dir`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  PublicWebsiteLocaleProvider,
  usePublicWebsiteLocale,
} from './PublicWebsiteLocaleContext';

function DirectionProbe(): JSX.Element {
  const { locale, direction } = usePublicWebsiteLocale();
  return (
    <span data-testid="probe">
      {locale}/{direction}
    </span>
  );
}

/** The nearest ancestor that declares a direction, as a browser would resolve it. */
function resolvedDirection(element: HTMLElement): string | null {
  return element.closest('[dir]')?.getAttribute('dir') ?? null;
}

// Vitest runs without `globals`, so Testing Library's automatic
// between-test unmount is never registered on our behalf.
afterEach(cleanup);

describe('PublicWebsiteLocaleProvider', () => {
  it('renders Arabic right-to-left', () => {
    render(
      <PublicWebsiteLocaleProvider locale="ar">
        <DirectionProbe />
      </PublicWebsiteLocaleProvider>,
    );

    expect(resolvedDirection(screen.getByTestId('probe'))).toBe('rtl');
    expect(screen.getByTestId('probe').textContent).toBe('ar/rtl');
  });

  it('renders English left-to-right', () => {
    render(
      <PublicWebsiteLocaleProvider locale="en">
        <DirectionProbe />
      </PublicWebsiteLocaleProvider>,
    );

    expect(resolvedDirection(screen.getByTestId('probe'))).toBe('ltr');
    expect(screen.getByTestId('probe').textContent).toBe('en/ltr');
  });

  it('sets `lang` alongside `dir`, so the browser applies Arabic typography', () => {
    render(
      <PublicWebsiteLocaleProvider locale="ar">
        <DirectionProbe />
      </PublicWebsiteLocaleProvider>,
    );

    expect(
      screen.getByTestId('probe').closest('[dir]')?.getAttribute('lang'),
    ).toBe('ar');
  });

  /*
   * THE ACTUAL REGRESSION. This reproduces the section-preview arrangement:
   * a left-to-right dashboard, with the provider mounted inside it and NO
   * `WebsiteChrome` anywhere. Before the fix the probe's nearest `[dir]`
   * was the dashboard's own `ltr` wrapper.
   */
  it('overrides an LTR dashboard ancestor when previewing a single Arabic section', () => {
    render(
      <div dir="ltr" data-testid="dashboard">
        <PublicWebsiteLocaleProvider locale="ar">
          <DirectionProbe />
        </PublicWebsiteLocaleProvider>
      </div>,
    );

    expect(resolvedDirection(screen.getByTestId('probe'))).toBe('rtl');
  });

  it('does not leak its direction to the surrounding dashboard', () => {
    render(
      <div dir="ltr" data-testid="dashboard">
        <PublicWebsiteLocaleProvider locale="ar">
          <DirectionProbe />
        </PublicWebsiteLocaleProvider>
        <span data-testid="sibling" />
      </div>,
    );

    expect(resolvedDirection(screen.getByTestId('sibling'))).toBe('ltr');
  });

  it('switches direction when the locale selector changes, without a remount', () => {
    const { rerender } = render(
      <PublicWebsiteLocaleProvider locale="en">
        <DirectionProbe />
      </PublicWebsiteLocaleProvider>,
    );
    expect(resolvedDirection(screen.getByTestId('probe'))).toBe('ltr');

    rerender(
      <PublicWebsiteLocaleProvider locale="ar">
        <DirectionProbe />
      </PublicWebsiteLocaleProvider>,
    );
    expect(resolvedDirection(screen.getByTestId('probe'))).toBe('rtl');
  });
});
