/**
 * W4 — a taken organization name is shown on the name field only. The
 * create mutation declares that it renders its own failures, so the
 * app-wide error toast stays quiet (it used to repeat the field message as
 * a toast).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '@api';
import { createQueryClient } from '@services/query';

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

vi.mock('../services/OrganizationService', () => ({
  organizationService: {
    create: vi.fn(async () => {
      throw new ApiError({
        kind: 'conflict',
        messageKey: 'errors.organization.nameUnavailable',
        status: 409,
        retryable: false,
      });
    }),
  },
}));

const { useCreateOrganization } = await import('./useCreateOrganization');

afterEach(cleanup);

describe('useCreateOrganization', () => {
  it('does not raise the app-wide error toast for a taken name', async () => {
    const reportError = vi.fn();
    const client = createQueryClient(reportError);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateOrganization(), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ name: 'Nile Learning' } as never)
        .catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.error?.messageKey).toBe(
        'errors.organization.nameUnavailable'
      )
    );
    expect(reportError).not.toHaveBeenCalled();
  });
});
