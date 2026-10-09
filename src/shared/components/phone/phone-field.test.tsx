/**
 * The phone field: SVG flags (never emoji), a searchable keyboard-driven
 * country list in both languages, validation messages, and direction — the
 * number control is left-to-right inside an Arabic page while its label,
 * errors and the country list follow the page.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { PhoneField, refinePhone } from './index';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => cleanup());

const schema = z
  .object({ phoneCountry: z.string(), phoneNumber: z.string() })
  .superRefine((data, context) =>
    refinePhone(data, context, { required: true })
  );
type Values = z.infer<typeof schema>;

function Harness({
  onSubmit,
  initialCountry = 'EG',
}: {
  onSubmit: (values: Values) => void;
  initialCountry?: string;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phoneCountry: initialCountry, phoneNumber: '' },
  });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <PhoneField
        control={form.control}
        errors={form.formState.errors}
        id="phone"
        label={'__label__'}
        hint="hint text"
      />
      <button type="submit">submit</button>
    </form>
  );
}

function renderField(language: 'en' | 'ar', onSubmit = vi.fn()) {
  const i18n = createI18nInstance(language);
  const label = i18n.t('auth:register.phone');
  function Labelled() {
    return <Harness onSubmit={onSubmit} />;
  }
  const view = render(
    <I18nextProvider i18n={i18n}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="page">
        <Labelled />
      </div>
    </I18nextProvider>
  );
  // The harness label is a placeholder; give it the real copy for queries.
  screen.getByText('__label__').textContent = label;
  return { ...view, onSubmit, label };
}

describe('PhoneField', () => {
  it('draws SVG flags as images, never emoji', async () => {
    renderField('en');
    const flag = await screen.findByTestId('flag-EG');
    expect(flag.tagName).toBe('IMG');
    expect(flag.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(flag.getAttribute('alt')).toBe('');
    // No regional-indicator (flag emoji) characters anywhere.
    expect(document.body.textContent ?? '').not.toMatch(
      /[\u{1F1E6}-\u{1F1FF}]/u
    );
    expect(screen.getByTestId('phone-country-trigger').textContent).toContain(
      '+20'
    );
  });

  it('filters the country list by typing and chooses with the keyboard', async () => {
    const user = userEvent.setup();
    renderField('en');
    const trigger = screen.getByTestId('phone-country-trigger');
    expect(trigger.getAttribute('aria-label')).toBe(
      'Country code: Egypt (+20)'
    );
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    const search = await screen.findByRole('combobox', {
      name: 'Search country or code',
    });
    await user.type(search, 'saudi');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option')).toHaveLength(1);
    expect(within(listbox).getByText('Saudi Arabia')).toBeTruthy();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(trigger.textContent).toContain('+966');
    expect(trigger.getAttribute('aria-label')).toBe(
      'Country code: Saudi Arabia (+966)'
    );
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('finds countries by calling code and says when nothing matches', async () => {
    const user = userEvent.setup();
    renderField('en');
    await user.click(screen.getByTestId('phone-country-trigger'));
    const search = await screen.findByRole('combobox');
    await user.type(search, '+971');
    expect(
      within(screen.getByRole('listbox')).getByText('United Arab Emirates')
    ).toBeTruthy();
    await user.clear(search);
    await user.type(search, 'zzzz');
    expect(screen.getByText('No country found')).toBeTruthy();
  });

  it('switches the country when an international number is typed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderField('en');
    await user.type(screen.getByTestId('phone-number-input'), '+966501234567');
    expect(screen.getByTestId('phone-country-trigger').textContent).toContain(
      '+966'
    );
    await user.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      phoneCountry: 'SA',
      phoneNumber: '050 123 4567',
    });
  });

  it('explains a missing or invalid number on the field and blocks submit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderField('en');
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Enter your mobile number'
    );
    const input = screen.getByTestId('phone-number-input');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('phone-error');
    // A Cairo landline is not a mobile number.
    await user.type(input, '0223456789');
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Enter a valid mobile number for the selected country'
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('in Arabic: the number is LTR, the label and list are RTL, Arabic search works', async () => {
    const user = userEvent.setup();
    const { label } = renderField('ar');
    expect(label).toBe('رقم الهاتف المحمول');
    const input = screen.getByTestId('phone-number-input');
    const control = input.parentElement!;
    expect(control.getAttribute('dir')).toBe('ltr');
    expect(control.hasAttribute('data-ltr-content')).toBe(true);
    // The label is outside the left-to-right control.
    const labelElement = screen.getByText(label);
    expect(control.contains(labelElement)).toBe(false);
    expect(labelElement.closest('[dir="ltr"]')).toBeNull();
    expect(
      screen.getByTestId('phone-country-trigger').getAttribute('aria-label')
    ).toBe('رمز الدولة: مصر (+20)');

    await user.click(screen.getByTestId('phone-country-trigger'));
    const search = await screen.findByRole('combobox', {
      name: 'ابحث عن دولة أو رمز',
    });
    expect(search.closest('[dir="rtl"]')).not.toBeNull();
    await user.type(search, 'السعودية');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('+966');

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'أدخل رقم هاتفك المحمول'
    );
  });
});
