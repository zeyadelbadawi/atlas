/**
 * The academy setup form's "Payment methods" section (Academy Manual
 * Payments): "Set up later" sends nothing; "Accept payments now" needs at
 * least one method, each chosen method must be complete, and the result is
 * the typed `paymentMethods` payload the provisioning request carries.
 */
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import {
  SetupPaymentMethods,
  type SetupPaymentMethodsHandle,
} from './SetupPaymentMethods';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

function arrange(language: 'en' | 'ar' = 'en') {
  const ref = createRef<SetupPaymentMethodsHandle>();
  const view = render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <SetupPaymentMethods ref={ref} />
    </I18nextProvider>
  );
  return { ref, view };
}

afterEach(cleanup);

describe('SetupPaymentMethods', () => {
  it('"Set up later" is the default and sends no methods', async () => {
    const { ref } = arrange();
    expect(
      screen.getByTestId('setup-payments-later').getAttribute('data-state')
    ).toBe('checked');
    let result: unknown = 'unset';
    await act(async () => {
      result = await ref.current!.collect();
    });
    expect(result).toBeUndefined();
  });

  it('"Accept payments now" requires at least one method', async () => {
    const { ref } = arrange();
    fireEvent.click(screen.getByTestId('setup-payments-now'));
    let result: unknown = 'unset';
    await act(async () => {
      result = await ref.current!.collect();
    });
    expect(result).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'Turn on at least one payment method'
    );
  });

  it('refuses an incomplete method, then returns the typed payload', async () => {
    const { ref } = arrange();
    fireEvent.click(screen.getByTestId('setup-payments-now'));
    fireEvent.click(
      screen.getByTestId('setup-method-manual_wallet_transfer-toggle')
    );
    let result: unknown = 'unset';
    await act(async () => {
      result = await ref.current!.collect();
    });
    expect(result).toBeNull();

    fireEvent.click(screen.getByTestId('setup-wallet-provider-vodafone_cash'));
    fireEvent.change(screen.getByTestId('setup-wallet-number'), {
      target: { value: '01012345678' },
    });
    fireEvent.change(screen.getByTestId('setup-wallet-account-name'), {
      target: { value: 'Beta Academy' },
    });
    fireEvent.change(screen.getByTestId('setup-wallet-instructions'), {
      target: { value: 'Send to this wallet.' },
    });
    fireEvent.change(
      screen.getByTestId('setup-wallet-reference-instructions'),
      { target: { value: 'Keep the SMS.' } }
    );
    await act(async () => {
      result = await ref.current!.collect();
    });
    expect(result).toEqual({
      wallet: {
        walletProvider: 'vodafone_cash',
        walletNumber: '01012345678',
        accountName: 'Beta Academy',
        instructions: 'Send to this wallet.',
        referenceInstructions: 'Keep the SMS.',
      },
    });
  });

  it('renders in Arabic without raw keys', () => {
    const { view } = arrange('ar');
    expect(view.container.textContent).toContain('طرق الدفع');
    expect(view.container.textContent).not.toMatch(/provisioning:/);
  });
});
