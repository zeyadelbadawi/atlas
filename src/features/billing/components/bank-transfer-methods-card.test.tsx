/**
 * Bank Transfer accounts (Platform Owner, 2 Oct 2026).
 *
 * Pinned here: an empty list says Bank Transfer is NOT offered until an
 * account is added and enabled; the create dialog starts empty and refuses
 * an IBAN the backend would refuse, without calling the API; Edit starts
 * from the saved details and sends the whole instructions object; the
 * per-row toggle sends only `enabled`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { PlatformPaymentMethod } from '@types';

const usePlatformPaymentMethods = vi.fn();
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const toast = vi.fn();
const refetch = vi.fn();

vi.mock('../hooks', () => ({
  usePlatformPaymentMethods: () => usePlatformPaymentMethods() as unknown,
  useCreateBankTransferMethod: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
    error: null,
  }),
  useUpdatePlatformPaymentMethod: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => toast(...args) as unknown,
}));

const { BankTransferMethodsCard } = await import('./BankTransferMethodsCard');

/** Test-only values — obviously not a real account. */
const METHOD: PlatformPaymentMethod = {
  id: 'pm-1',
  key: 'bank_transfer_test',
  type: 'manual_bank_transfer',
  displayName: 'Test Bank transfer',
  description: 'Pay by transfer',
  enabled: false,
  provider: 'atlas_manual',
  capabilities: {
    supportsManualReview: true,
    supportsProof: true,
    supportsRedirect: false,
    supportsEmbeddedCheckout: false,
    supportsAdditionalAuthentication: false,
    supportsWebhooks: false,
    supportsRefunds: false,
    supportsRecurring: false,
    supportsCancellation: true,
  },
  manualInstructions: {
    type: 'manual_bank_transfer',
    bankName: 'Test Bank',
    accountName: 'Test Account Holder',
    accountNumber: '0000-1111',
    iban: 'XX12TEST000000000000',
    instructions: 'Transfer the exact amount.',
    referenceInstructions: 'Use the payment reference.',
  },
  displayOrder: 0,
  createdAt: '2026-10-02T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
};

function listOf(items: readonly PlatformPaymentMethod[]) {
  return {
    data: {
      items,
      pagination: {
        page: 1,
        pageSize: 100,
        totalItems: items.length,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
    refetch,
  };
}

function renderCard() {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <BankTransferMethodsCard />
    </I18nextProvider>
  );
}

function type(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

beforeEach(() => {
  createMutateAsync.mockResolvedValue(METHOD);
  updateMutateAsync.mockResolvedValue(METHOD);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BankTransferMethodsCard', () => {
  it('explains that Bank Transfer is not offered while no account exists', () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    expect(screen.getByText('No bank account configured')).toBeTruthy();
    expect(
      screen.getByText(
        'Bank Transfer is not offered to Organizations until you add a bank account here and enable it.'
      )
    ).toBeTruthy();
  });

  it('starts the create dialog empty and refuses an invalid IBAN without calling the API', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    fireEvent.click(screen.getByTestId('bank-method-add'));

    const dialog = await screen.findByRole('dialog');
    // Nothing is pre-filled — no sample bank details.
    for (const input of within(dialog).getAllByRole('textbox')) {
      expect((input as HTMLInputElement).value).toBe('');
    }

    type('bank-method-display-name', 'Bank transfer');
    type('bank-method-bank-name', 'Test Bank');
    type('bank-method-account-name', 'Test Account Holder');
    type('bank-method-account-number', '0000-1111');
    type('bank-method-iban', '12-not-an-iban');
    type('bank-method-instructions', 'Transfer the exact amount.');
    type('bank-method-reference-instructions', 'Use the payment reference.');
    fireEvent.click(screen.getByTestId('bank-method-save'));

    expect(
      await screen.findByText(
        'Enter a valid IBAN: two letters, two check digits, then the account characters.'
      )
    ).toBeTruthy();
    expect(createMutateAsync).not.toHaveBeenCalled();

    // A valid IBAN goes through, with the blank SWIFT code omitted.
    type('bank-method-iban', 'XX12TEST000000000000');
    fireEvent.click(screen.getByTestId('bank-method-save'));
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith({
      displayName: 'Bank transfer',
      instructions: {
        bankName: 'Test Bank',
        accountName: 'Test Account Holder',
        accountNumber: '0000-1111',
        iban: 'XX12TEST000000000000',
        instructions: 'Transfer the exact amount.',
        referenceInstructions: 'Use the payment reference.',
      },
    });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: 'Bank account added' })
    );
  });

  it('refuses an invalid SWIFT code and an account number with symbols', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    fireEvent.click(screen.getByTestId('bank-method-add'));
    await screen.findByRole('dialog');

    type('bank-method-account-number', '0000/1111');
    type('bank-method-swift', 'ABC');
    fireEvent.click(screen.getByTestId('bank-method-save'));

    expect(
      await screen.findByText('Use only letters, numbers, spaces and hyphens.')
    ).toBeTruthy();
    expect(
      screen.getByText('Enter a valid SWIFT/BIC code of 8 or 11 characters.')
    ).toBeTruthy();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('lists a saved account and edits it from its saved details', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([METHOD]));
    renderCard();

    const row = screen.getByTestId('bank-method-row-pm-1');
    expect(within(row).getByText('Test Bank transfer')).toBeTruthy();
    expect(within(row).getByText('Test Bank')).toBeTruthy();
    expect(within(row).getByText('0000-1111')).toBeTruthy();
    expect(within(row).getByText('XX12TEST000000000000')).toBeTruthy();
    expect(within(row).getByText('Disabled')).toBeTruthy();

    fireEvent.click(screen.getByTestId('bank-method-edit-pm-1'));
    await screen.findByRole('dialog');
    expect(
      (screen.getByTestId('bank-method-bank-name') as HTMLInputElement).value
    ).toBe('Test Bank');

    type('bank-method-bank-name', 'Test Bank Renamed');
    fireEvent.click(screen.getByTestId('bank-method-save'));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync).toHaveBeenCalledWith({
      methodId: 'pm-1',
      payload: {
        displayName: 'Test Bank transfer',
        description: 'Pay by transfer',
        instructions: {
          bankName: 'Test Bank Renamed',
          accountName: 'Test Account Holder',
          accountNumber: '0000-1111',
          iban: 'XX12TEST000000000000',
          instructions: 'Transfer the exact amount.',
          referenceInstructions: 'Use the payment reference.',
        },
      },
    });
  });

  it('enables a disabled account with only the enabled flag', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([METHOD]));
    renderCard();

    const toggle = screen.getByTestId('bank-method-toggle-pm-1');
    expect(toggle.textContent).toBe('Enable');
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        methodId: 'pm-1',
        payload: { enabled: true },
      })
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title:
          'Bank account enabled. Organizations can now choose it at checkout.',
      })
    );
  });

  it('offers Disable for an enabled account', async () => {
    usePlatformPaymentMethods.mockReturnValue(
      listOf([{ ...METHOD, enabled: true }])
    );
    renderCard();

    const toggle = screen.getByTestId('bank-method-toggle-pm-1');
    expect(toggle.textContent).toBe('Disable');
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        methodId: 'pm-1',
        payload: { enabled: false },
      })
    );
  });
});
