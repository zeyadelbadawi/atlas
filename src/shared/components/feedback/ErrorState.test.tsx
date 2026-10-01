/**
 * `ErrorState` — the parts a full-page or data-carrying error depends on
 * (Theme 1 plan Phase 8): description interpolation, and the heading level
 * a whole-page error uses as the document's `h1`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ErrorState } from './ErrorState';

function renderIn(language: 'en' | 'ar', ui: JSX.Element) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>{ui}</I18nextProvider>
  );
}

describe('ErrorState', () => {
  afterEach(cleanup);

  it('interpolates `values` into the description (the editor names the refused sections)', () => {
    renderIn(
      'en',
      <ErrorState
        kind="validation"
        descriptionKey="website:editor.invalidSections"
        values={{ sections: 'Hero and Statistics' }}
      />
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(
      'These sections need attention before this page can be saved: Hero and Statistics.'
    );
    expect(alert.textContent).not.toContain('{{');
  });

  it('interpolates in Arabic too', () => {
    renderIn(
      'ar',
      <ErrorState
        kind="validation"
        descriptionKey="website:editor.invalidSections"
        values={{ sections: 'البطل' }}
      />
    );
    expect(screen.getByRole('alert').textContent).toContain('البطل');
    expect(screen.getByRole('alert').textContent).not.toContain('{{');
  });

  it('titles with an h3 by default, and with an h1 when it is the whole page', () => {
    const { unmount } = renderIn('en', <ErrorState kind="notFound" />);
    expect(screen.getByRole('heading', { level: 3 }).tagName).toBe('H3');
    unmount();

    renderIn('en', <ErrorState kind="notFound" headingLevel="h1" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.tagName).toBe('H1');
    // Styled as the h3, with the global h1 tracking neutralised: the change
    // is structural, not visual (pixel-compared in Phase 8).
    expect(heading.className).toBe(
      'font-display text-base font-semibold text-foreground tracking-normal'
    );
  });
});
