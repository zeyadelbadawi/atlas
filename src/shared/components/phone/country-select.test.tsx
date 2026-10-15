/**
 * D5-3 — the standalone country picker: the phone field's list, named in
 * the interface language, searchable in Arabic or English or by code, and
 * always handing back an ISO alpha-2 code. A legacy free-text value is
 * shown as it is rather than silently replaced.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { CountrySelect } from './CountrySelect';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
  Element.prototype.scrollIntoView ??= () => undefined;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => undefined;
});

afterEach(() => cleanup());

function renderSelect(value: string, language: 'en' | 'ar' = 'en') {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <CountrySelect value={value} onChange={onChange} placeholder="Pick" />
    </I18nextProvider>
  );
  return { onChange, user: userEvent.setup() };
}

describe('CountrySelect (D5-3)', { timeout: 20_000 }, () => {
  it('shows the chosen country by name and hands back a code', async () => {
    const { onChange, user } = renderSelect('EG');
    const trigger = screen.getByTestId('country-select-trigger');
    expect(trigger.textContent).toContain('Egypt');

    await user.click(trigger);
    await user.type(screen.getByPlaceholderText('Search country'), 'saudi');
    expect(screen.queryByTestId('country-option-EG')).toBeNull();
    await user.click(screen.getByTestId('country-option-SA'));
    expect(onChange).toHaveBeenCalledWith('SA');
  });

  it('searches Arabic names in Arabic', async () => {
    const { onChange, user } = renderSelect('', 'ar');
    await user.click(screen.getByTestId('country-select-trigger'));
    await user.type(screen.getByPlaceholderText('ابحث عن دولة'), 'مصر');
    const option = screen.getByTestId('country-option-EG');
    expect(option.textContent).toContain('مصر');
    await user.click(option);
    expect(onChange).toHaveBeenCalledWith('EG');
  });

  it('shows the placeholder when empty and a legacy free-text value as-is', () => {
    renderSelect('');
    expect(screen.getByTestId('country-select-trigger').textContent).toContain(
      'Pick'
    );
    cleanup();
    renderSelect('Egypt');
    expect(screen.getByTestId('country-select-trigger').textContent).toContain(
      'Egypt'
    );
  });
});
