/**
 * CMS phase 3d (batch C) — the interest form's phone control loads only
 * when it is needed: the server render and the first paint carry a
 * look-alike (same box, "+20", a working `type="tel"` input) and nothing
 * from the phone library; the shared phone input replaces it once the form
 * nears the screen or is touched, keeping what was typed and the focus.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import type { InterestFormSectionConfig } from '@types';
import { InterestForm } from './InterestForm';

const config: InterestFormSectionConfig = {
  title: { en: 'Register your interest', ar: '' },
  emailField: 'hidden',
  choiceField: 'hidden',
  options: [],
  messageField: 'hidden',
};

function tree() {
  return (
    <I18nextProvider i18n={createI18nInstance('en')}>
      <PublicWebsiteLocaleProvider locale="en">
        <InterestForm config={config} academyId="a1" isPublic />
      </PublicWebsiteLocaleProvider>
    </I18nextProvider>
  );
}

/** An observer that never reports the form on screen. */
class FarAwayObserver {
  observe(): void {}
  disconnect(): void {}
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the interest form’s phone field', () => {
  it('server-renders the look-alike, with nothing from the phone library', () => {
    const html = renderToString(tree());
    expect(html).toContain('data-phone-placeholder');
    expect(html).toContain('+20');
    expect(html).not.toContain('phone-number-input');
    expect(html).not.toContain('phone-country-trigger');
  });

  it('waits until the form is touched, then swaps in the real control keeping the number and the focus', async () => {
    vi.stubGlobal('IntersectionObserver', FarAwayObserver);
    render(tree());
    const lookAlike = screen.getByLabelText('Phone number') as HTMLInputElement;
    expect(lookAlike.closest('[data-phone-placeholder]')).toBeTruthy();
    // Far from the screen and untouched: still the look-alike.
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(screen.queryByTestId('phone-number-input')).toBeNull();

    act(() => lookAlike.focus());
    fireEvent.change(lookAlike, { target: { value: '0100 123' } });
    const real = (await waitFor(() =>
      screen.getByTestId('phone-number-input')
    )) as HTMLInputElement;
    expect(real.value).toBe('0100 123');
    expect(real.id).toBe(lookAlike.id);
    expect(document.activeElement).toBe(real);
    expect(screen.getByTestId('phone-country-trigger')).toBeTruthy();
  });
});
