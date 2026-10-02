/**
 * E-Wallets and InstaPay (Platform Owner, 2 Oct 2026) — the other two tabs
 * of `ManualPaymentMethodsCard`, beside Bank Transfer.
 *
 * Pinned here:
 * - the Add dialogs send exactly what was typed (the server normalizes),
 *   with each Arabic text only when entered, and refuse — without calling
 *   the API — a wallet number / InstaPay address the server would refuse,
 *   a missing provider, and `other` without a provider name;
 * - Edit sends `walletInstructions` / `instapayInstructions`, never the
 *   bank-only `instructions`;
 * - a seeded placeholder is flagged, enabling it asks first, and the
 *   server's 409 `placeholderDetails` is surfaced;
 * - the Bank Transfer dialog sends the optional Arabic texts too.
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
import { createApiError } from '@api';
import type {
  ManualPaymentInstructions,
  PlatformPaymentMethod,
} from '@types';

// jsdom has no ResizeObserver; Radix RadioGroup measures its items with one.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const usePlatformPaymentMethods = vi.fn();
const createBankMutateAsync = vi.fn();
const createWalletMutateAsync = vi.fn();
const createInstapayMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const toast = vi.fn();

vi.mock('../hooks', () => ({
  usePlatformPaymentMethods: () => usePlatformPaymentMethods() as unknown,
  useCreateBankTransferMethod: () => ({
    mutateAsync: createBankMutateAsync,
    isPending: false,
    error: null,
  }),
  useCreateWalletMethod: () => ({
    mutateAsync: createWalletMutateAsync,
    isPending: false,
    error: null,
  }),
  useCreateInstapayMethod: () => ({
    mutateAsync: createInstapayMutateAsync,
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

const { ManualPaymentMethodsCard } = await import(
  './ManualPaymentMethodsCard'
);

const CAPABILITIES = {
  supportsManualReview: true,
  supportsProof: true,
  supportsRedirect: false,
  supportsEmbeddedCheckout: false,
  supportsAdditionalAuthentication: false,
  supportsWebhooks: false,
  supportsRefunds: false,
  supportsRecurring: false,
  supportsCancellation: true,
};

function methodOf(
  id: string,
  displayName: string,
  manualInstructions: ManualPaymentInstructions,
  enabled = false
): PlatformPaymentMethod {
  return {
    id,
    key: `key_${id}`,
    type: manualInstructions.type,
    displayName,
    enabled,
    provider: 'atlas_manual',
    capabilities: CAPABILITIES,
    manualInstructions,
    displayOrder: 0,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  };
}

/** Test-only values — obviously not a real wallet. */
const WALLET = methodOf('pm-w', 'Test Vodafone Cash', {
  type: 'manual_wallet_transfer',
  walletProvider: 'vodafone_cash',
  walletNumber: '01000000000',
  accountName: 'Test Holder',
  accountNameAr: 'صاحب اختبار',
  instructions: 'Send the exact amount.',
  referenceInstructions: 'Write the payment reference.',
});

const INSTAPAY = methodOf('pm-i', 'Test InstaPay', {
  type: 'manual_instapay',
  instapayAddress: 'test.holder@instapay',
  accountName: 'Test Holder',
  instructions: 'Send the exact amount.',
  referenceInstructions: 'Write the payment reference.',
});

/** The seeded placeholder shape (disabled, `placeholder: true`). */
const PLACEHOLDER_WALLET = methodOf('pm-p', 'Orange Cash', {
  type: 'manual_wallet_transfer',
  walletProvider: 'orange_cash',
  walletNumber: 'PLACEHOLDER-NOT-A-WALLET',
  accountName: 'Placeholder Holder',
  instructions: 'Placeholder instructions.',
  referenceInstructions: 'Placeholder reference.',
  placeholder: true,
});

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
    refetch: vi.fn(),
  };
}

function renderCard() {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <ManualPaymentMethodsCard />
    </I18nextProvider>
  );
}

function type(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

/** Radix Tabs activate on mouse-down. */
function openTab(prefix: 'wallet-method' | 'instapay-method') {
  fireEvent.mouseDown(screen.getByTestId(`manual-methods-tab-${prefix}`), {
    button: 0,
  });
}

beforeEach(() => {
  createBankMutateAsync.mockResolvedValue(WALLET);
  createWalletMutateAsync.mockResolvedValue(WALLET);
  createInstapayMutateAsync.mockResolvedValue(INSTAPAY);
  updateMutateAsync.mockResolvedValue(WALLET);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ManualPaymentMethodsCard — E-wallets', () => {
  it('explains that e-wallets are not offered while none exists', () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    openTab('wallet-method');
    expect(screen.getByText('No e-wallet configured')).toBeTruthy();
  });

  it('refuses a missing provider and an invalid wallet number without calling the API', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    openTab('wallet-method');
    fireEvent.click(screen.getByTestId('wallet-method-add'));
    const dialog = await screen.findByRole('dialog');
    for (const input of within(dialog).getAllByRole('textbox')) {
      expect((input as HTMLInputElement).value).toBe('');
    }

    type('wallet-method-display-name', 'Vodafone Cash');
    type('wallet-method-number', '0201234567');
    type('wallet-method-account-name', 'Test Holder');
    type('wallet-method-instructions', 'Send the exact amount.');
    type('wallet-method-reference-instructions', 'Write the reference.');
    fireEvent.click(screen.getByTestId('wallet-method-save'));

    expect(
      await screen.findByText(
        'Enter an Egyptian mobile wallet number: 010, 011, 012 or 015 followed by 8 digits.'
      )
    ).toBeTruthy();
    // No provider picked yet.
    expect(
      within(dialog).getAllByText('This field is required.').length
    ).toBeGreaterThan(0);
    expect(createWalletMutateAsync).not.toHaveBeenCalled();
  });

  it('requires a provider name for "Other provider", then sends what was typed', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    openTab('wallet-method');
    fireEvent.click(screen.getByTestId('wallet-method-add'));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByTestId('wallet-method-provider-other'));
    type('wallet-method-display-name', 'Bank wallet');
    type('wallet-method-number', '+20 100 123 4567');
    type('wallet-method-account-name', 'Test Holder');
    type('wallet-method-account-name-ar', 'صاحب اختبار');
    type('wallet-method-instructions', 'Send the exact amount.');
    type('wallet-method-reference-instructions', 'Write the reference.');
    fireEvent.click(screen.getByTestId('wallet-method-save'));

    expect(
      await screen.findByText('Enter the wallet provider’s name.')
    ).toBeTruthy();
    expect(createWalletMutateAsync).not.toHaveBeenCalled();

    // Arabic inputs are right-to-left.
    expect(
      screen.getByTestId('wallet-method-account-name-ar').getAttribute('dir')
    ).toBe('rtl');

    type('wallet-method-provider-name', 'Test Pay');
    fireEvent.click(screen.getByTestId('wallet-method-save'));
    await waitFor(() =>
      expect(createWalletMutateAsync).toHaveBeenCalledTimes(1)
    );
    expect(createWalletMutateAsync).toHaveBeenCalledWith({
      displayName: 'Bank wallet',
      instructions: {
        walletProvider: 'other',
        walletProviderName: 'Test Pay',
        // Passed through as typed; the server normalizes to 01XXXXXXXXX.
        walletNumber: '+20 100 123 4567',
        accountName: 'Test Holder',
        accountNameAr: 'صاحب اختبار',
        instructions: 'Send the exact amount.',
        referenceInstructions: 'Write the reference.',
      },
    });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: 'E-wallet added' })
    );
  });

  it('sends a named provider without a provider name', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    openTab('wallet-method');
    fireEvent.click(screen.getByTestId('wallet-method-add'));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByTestId('wallet-method-provider-vodafone_cash'));
    type('wallet-method-display-name', 'Vodafone Cash');
    type('wallet-method-number', '01012345678');
    type('wallet-method-account-name', 'Test Holder');
    type('wallet-method-instructions', 'Send the exact amount.');
    type('wallet-method-reference-instructions', 'Write the reference.');
    fireEvent.click(screen.getByTestId('wallet-method-save'));

    await waitFor(() =>
      expect(createWalletMutateAsync).toHaveBeenCalledTimes(1)
    );
    const body = createWalletMutateAsync.mock.calls[0][0] as {
      instructions: Record<string, unknown>;
    };
    expect(body.instructions.walletProvider).toBe('vodafone_cash');
    expect(body.instructions).not.toHaveProperty('walletProviderName');
    expect(body.instructions.walletNumber).toBe('01012345678');
    expect(body.instructions).not.toHaveProperty('instructionsAr');
  });

  it('lists a wallet with its provider brand and edits it through walletInstructions', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([WALLET]));
    renderCard();
    openTab('wallet-method');

    const row = screen.getByTestId('wallet-method-row-pm-w');
    expect(
      within(row).getByTestId('wallet-method-provider-pm-w').textContent
    ).toBe('Vodafone Cash');
    expect(within(row).getByText('01000000000')).toBeTruthy();
    expect(within(row).queryByText(/Placeholder/)).toBeNull();

    fireEvent.click(screen.getByTestId('wallet-method-edit-pm-w'));
    await screen.findByRole('dialog');
    expect(
      (screen.getByTestId('wallet-method-number') as HTMLInputElement).value
    ).toBe('01000000000');
    type('wallet-method-number', '01112345678');
    fireEvent.click(screen.getByTestId('wallet-method-save'));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    const call = updateMutateAsync.mock.calls[0][0] as {
      methodId: string;
      payload: Record<string, unknown>;
    };
    expect(call.methodId).toBe('pm-w');
    expect(call.payload).not.toHaveProperty('instructions');
    expect(call.payload).not.toHaveProperty('instapayInstructions');
    expect(call.payload).toEqual({
      displayName: 'Test Vodafone Cash',
      description: '',
      walletInstructions: {
        walletProvider: 'vodafone_cash',
        walletNumber: '01112345678',
        accountName: 'Test Holder',
        accountNameAr: 'صاحب اختبار',
        instructions: 'Send the exact amount.',
        referenceInstructions: 'Write the payment reference.',
      },
    });
  });
});

describe('ManualPaymentMethodsCard — InstaPay', () => {
  it('refuses an invalid InstaPay address, then sends what was typed', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    openTab('instapay-method');
    expect(screen.getByText('No InstaPay address configured')).toBeTruthy();
    fireEvent.click(screen.getByTestId('instapay-method-add'));
    await screen.findByRole('dialog');

    type('instapay-method-display-name', 'InstaPay');
    type('instapay-method-address', 'test.holder@instapay.com');
    type('instapay-method-account-name', 'Test Holder');
    type('instapay-method-instructions', 'Send the exact amount.');
    type('instapay-method-reference-instructions', 'Write the reference.');
    type('instapay-method-reference-instructions-ar', 'اكتب المرجع.');
    fireEvent.click(screen.getByTestId('instapay-method-save'));

    expect(
      await screen.findByText(
        'Enter a valid InstaPay address, like name@instapay.'
      )
    ).toBeTruthy();
    expect(createInstapayMutateAsync).not.toHaveBeenCalled();

    // Case-insensitive, as the server accepts it (and stores it lowercase).
    type('instapay-method-address', 'Test.Holder@InstaPay');
    fireEvent.click(screen.getByTestId('instapay-method-save'));
    await waitFor(() =>
      expect(createInstapayMutateAsync).toHaveBeenCalledTimes(1)
    );
    expect(createInstapayMutateAsync).toHaveBeenCalledWith({
      displayName: 'InstaPay',
      instructions: {
        instapayAddress: 'Test.Holder@InstaPay',
        accountName: 'Test Holder',
        instructions: 'Send the exact amount.',
        referenceInstructions: 'Write the reference.',
        referenceInstructionsAr: 'اكتب المرجع.',
      },
    });
  });

  it('edits through instapayInstructions', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([INSTAPAY]));
    renderCard();
    openTab('instapay-method');
    const row = screen.getByTestId('instapay-method-row-pm-i');
    expect(within(row).getByText('test.holder@instapay')).toBeTruthy();

    fireEvent.click(screen.getByTestId('instapay-method-edit-pm-i'));
    await screen.findByRole('dialog');
    type('instapay-method-address', 'new.holder@instapay');
    fireEvent.click(screen.getByTestId('instapay-method-save'));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync).toHaveBeenCalledWith({
      methodId: 'pm-i',
      payload: {
        displayName: 'Test InstaPay',
        description: '',
        instapayInstructions: {
          instapayAddress: 'new.holder@instapay',
          accountName: 'Test Holder',
          instructions: 'Send the exact amount.',
          referenceInstructions: 'Write the payment reference.',
        },
      },
    });
  });
});

describe('ManualPaymentMethodsCard — placeholders', () => {
  it('flags a placeholder and asks before enabling it', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([PLACEHOLDER_WALLET]));
    renderCard();
    expect(
      screen.getByTestId('manual-methods-placeholder-summary').textContent
    ).toContain('1 method still has placeholder details.');
    openTab('wallet-method');

    const row = screen.getByTestId('wallet-method-row-pm-p');
    expect(
      within(row).getByText('Placeholder — replace before enabling')
    ).toBeTruthy();
    expect(within(row).getByTestId('wallet-method-placeholder-pm-p')).toBeTruthy();

    // Cancel: nothing is sent.
    fireEvent.click(screen.getByTestId('wallet-method-toggle-pm-p'));
    const confirm = await screen.findByTestId('placeholder-enable-confirm');
    expect(confirm.textContent).toContain(
      'Enable a method with placeholder details?'
    );
    fireEvent.click(within(confirm).getByText('Cancel'));
    await waitFor(() =>
      expect(screen.queryByTestId('placeholder-enable-confirm')).toBeNull()
    );
    expect(updateMutateAsync).not.toHaveBeenCalled();

    // Confirm: only `enabled` is sent.
    fireEvent.click(screen.getByTestId('wallet-method-toggle-pm-p'));
    fireEvent.click(
      await screen.findByTestId('placeholder-enable-confirm-action')
    );
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        methodId: 'pm-p',
        payload: { enabled: true },
      })
    );
  });

  it("surfaces production's 409 placeholderDetails refusal", async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([PLACEHOLDER_WALLET]));
    updateMutateAsync.mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.paymentMethod.placeholderDetails',
      })
    );
    renderCard();
    openTab('wallet-method');

    fireEvent.click(screen.getByTestId('wallet-method-toggle-pm-p'));
    fireEvent.click(
      await screen.findByTestId('placeholder-enable-confirm-action')
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: 'Could not enable the e-wallet',
        description:
          'This method still has placeholder details, so it cannot be enabled or paid with. Replace them with the real details first.',
        variant: 'destructive',
      })
    );
  });

  it('a non-placeholder method is enabled without asking', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([WALLET]));
    renderCard();
    openTab('wallet-method');
    fireEvent.click(screen.getByTestId('wallet-method-toggle-pm-w'));
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        methodId: 'pm-w',
        payload: { enabled: true },
      })
    );
    expect(screen.queryByTestId('placeholder-enable-confirm')).toBeNull();
  });

  it('editing a placeholder starts its destination blank and replaces it', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([PLACEHOLDER_WALLET]));
    renderCard();
    openTab('wallet-method');
    fireEvent.click(screen.getByTestId('wallet-method-edit-pm-p'));
    await screen.findByRole('dialog');

    expect(screen.getByTestId('wallet-method-placeholder-notice')).toBeTruthy();
    expect(
      (screen.getByTestId('wallet-method-number') as HTMLInputElement).value
    ).toBe('');
    type('wallet-method-number', '01212345678');
    fireEvent.click(screen.getByTestId('wallet-method-save'));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0]).toMatchObject({
      methodId: 'pm-p',
      payload: {
        walletInstructions: {
          walletProvider: 'orange_cash',
          walletNumber: '01212345678',
        },
      },
    });
  });
});

describe('ManualPaymentMethodsCard — Bank transfer Arabic texts', () => {
  it('sends the optional Arabic texts only when entered', async () => {
    usePlatformPaymentMethods.mockReturnValue(listOf([]));
    renderCard();
    fireEvent.click(screen.getByTestId('bank-method-add'));
    await screen.findByRole('dialog');

    type('bank-method-display-name', 'Bank transfer');
    type('bank-method-bank-name', 'Test Bank');
    type('bank-method-account-name', 'Test Account Holder');
    type('bank-method-account-name-ar', 'صاحب الحساب');
    type('bank-method-account-number', '0000-1111');
    type('bank-method-instructions', 'Transfer the exact amount.');
    type('bank-method-instructions-ar', 'حوّل المبلغ بالضبط.');
    type('bank-method-reference-instructions', 'Use the payment reference.');
    expect(
      screen.getByTestId('bank-method-instructions-ar').getAttribute('dir')
    ).toBe('rtl');
    fireEvent.click(screen.getByTestId('bank-method-save'));

    await waitFor(() =>
      expect(createBankMutateAsync).toHaveBeenCalledTimes(1)
    );
    expect(createBankMutateAsync).toHaveBeenCalledWith({
      displayName: 'Bank transfer',
      instructions: {
        bankName: 'Test Bank',
        accountNumber: '0000-1111',
        accountName: 'Test Account Holder',
        accountNameAr: 'صاحب الحساب',
        instructions: 'Transfer the exact amount.',
        instructionsAr: 'حوّل المبلغ بالضبط.',
        referenceInstructions: 'Use the payment reference.',
      },
    });
  });
});
