/**
 * B0-SEC-07 — the Platform Owner's suspend / reinstate dialog: a reason is
 * required to suspend, the server's refusal is shown in plain words, and
 * reinstating needs no reason.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';

const mutate = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('../hooks', () => ({
  useUserSuspension: () => ({ mutate, isPending: false }),
}));
vi.mock('@hooks', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  useToast: () => ({ toast }),
}));

const { SuspendUserDialog } = await import('./SuspendUserDialog');

afterEach(() => {
  cleanup();
  mutate.mockReset();
  toast.mockReset();
});

function renderDialog(mode: 'suspend' | 'unsuspend') {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <SuspendUserDialog
        open
        onOpenChange={vi.fn()}
        mode={mode}
        userId="u-1"
        userEmail="ada@example.com"
        userName="Ada"
      />
    </I18nextProvider>
  );
}

describe('SuspendUserDialog', () => {
  it('needs a reason before it suspends, and sends it', () => {
    renderDialog('suspend');
    const confirm = screen.getByRole('button', { name: 'Suspend' });
    expect(confirm.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: '  Abuse reported  ' },
    });
    expect(confirm.hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirm);
    expect(mutate).toHaveBeenCalledWith(
      { userId: 'u-1', action: 'suspend', reason: 'Abuse reported' },
      expect.anything()
    );
  });

  it('shows the server refusal for a Platform Owner account in plain words', () => {
    renderDialog('suspend');
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    const { onError } = mutate.mock.calls[0][1];
    onError(
      new ApiError({
        kind: 'forbidden',
        messageKey: 'errors.platformUsers.cannotSuspendPlatformOwner',
        status: 403,
        retryable: false,
      })
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        description: 'A Platform Owner account cannot be suspended here.',
      })
    );
  });

  it('reinstates without a reason', () => {
    renderDialog('unsuspend');
    const confirm = screen.getByRole('button', { name: 'Reinstate' });
    expect(confirm.hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirm);
    expect(mutate).toHaveBeenCalledWith(
      { userId: 'u-1', action: 'unsuspend', reason: undefined },
      expect.anything()
    );
  });
});
