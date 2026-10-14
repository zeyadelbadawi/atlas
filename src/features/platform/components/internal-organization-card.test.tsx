/**
 * B0-ANL-04 — the Platform Owner marks an organization as internal from
 * its detail page: the switch shows the stored flag, toggling it sends the
 * new value once, and a refusal is shown, not swallowed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { ApiError } from '@api';

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

const get = vi.fn();
const setInternal = vi.fn();
vi.mock('../services/PlatformOrganizationFlagsService', () => ({
  platformOrganizationFlagsService: {
    get: (id: string) => get(id),
    setInternal: (id: string, value: boolean) => setInternal(id, value),
  },
}));

const { InternalOrganizationCard } = await import('./InternalOrganizationCard');

function renderCard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AtlasLocalizationProvider initialLanguage="en">
        <InternalOrganizationCard organizationId="org-1" />
      </AtlasLocalizationProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  get.mockReset();
  setInternal.mockReset();
});

describe('InternalOrganizationCard (B0-ANL-04)', () => {
  it('shows the stored flag and sends the new value when toggled', async () => {
    get.mockResolvedValue({ organizationId: 'org-1', isInternal: false });
    setInternal.mockResolvedValue({
      organizationId: 'org-1',
      isInternal: true,
    });
    renderCard();

    const toggle = await screen.findByRole('switch', {
      name: 'Internal (test, demo or staff)',
    });
    await waitFor(() => expect(toggle.hasAttribute('disabled')).toBe(false));
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(toggle);
    await waitFor(() =>
      expect(toggle.getAttribute('aria-checked')).toBe('true')
    );
    expect(setInternal).toHaveBeenCalledTimes(1);
    expect(setInternal).toHaveBeenCalledWith('org-1', true);
  });

  it('shows a refusal instead of silently keeping the old state', async () => {
    get.mockResolvedValue({ organizationId: 'org-1', isInternal: false });
    setInternal.mockRejectedValue(
      new ApiError({
        kind: 'forbidden',
        messageKey: 'errors.auth.forbidden',
        status: 403,
        retryable: false,
      })
    );
    renderCard();
    const toggle = await screen.findByRole('switch');
    await waitFor(() => expect(toggle.hasAttribute('disabled')).toBe(false));
    await userEvent.click(toggle);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});
