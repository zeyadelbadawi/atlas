/**
 * W5 (F9) — a save made in academy A that settles after the screen moved to
 * academy B must write A's cache, never B's.
 *
 * TanStack pushes a component's latest options into a still-pending
 * mutation, so a hook that closed over the render-time `academyId` used to
 * apply A's response (or rollback) to B's key. Academy-scoped mutations now
 * carry the academy in their variables (`useAcademyBoundMutation`).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { academyKeys } from '@services/query';
import type {
  AcademyCommunicationSettings,
  AcademyContentProtection,
} from '@types';

const ORG = 'org-1';

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ organization: { id: ORG }, user: { id: 'user-1' } }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

let resolveProtection: (value: AcademyContentProtection) => void = () => {};
let rejectSettings: (error: unknown) => void = () => {};
const updateContentProtection = vi.fn(
  () =>
    new Promise<AcademyContentProtection>((resolve) => {
      resolveProtection = resolve;
    })
);
const updateSettings = vi.fn(
  () =>
    new Promise<AcademyCommunicationSettings>((_resolve, reject) => {
      rejectSettings = reject;
    })
);
vi.mock('@features/academy/services/AcademyProtectionService', () => ({
  academyProtectionService: { updateContentProtection },
}));
vi.mock(
  '@features/academy/services/AcademyCommunicationSettingsService',
  () => ({
    academyCommunicationSettingsService: {
      update: updateSettings,
      get: vi.fn(),
    },
  })
);

const {
  useUpdateAcademyContentProtection,
  useUpdateAcademyCommunicationSettings,
} = await import('@features/academy/hooks');

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

afterEach(cleanup);

describe('academy-bound mutations', () => {
  it('a pending save settles into the academy it was made in, not the one now shown', async () => {
    const client = new QueryClient();
    const { result, rerender } = renderHook(
      ({ academyId }) => useUpdateAcademyContentProtection(academyId),
      { initialProps: { academyId: 'A' }, wrapper: wrapperFor(client) }
    );

    act(() => {
      result.current.mutate({ watermarkEnabled: true } as never);
    });
    await waitFor(() =>
      expect(updateContentProtection).toHaveBeenCalledWith('A', {
        watermarkEnabled: true,
      })
    );

    // The user switches to academy B while the request is in flight.
    rerender({ academyId: 'B' });
    await act(async () => {
      resolveProtection({
        watermarkEnabled: true,
      } as unknown as AcademyContentProtection);
    });

    await waitFor(() =>
      expect(
        client.getQueryData(academyKeys.contentProtection(ORG, 'A'))
      ).toEqual({ watermarkEnabled: true })
    );
    expect(
      client.getQueryData(academyKeys.contentProtection(ORG, 'B'))
    ).toBeUndefined();
    // Call sites still see their own payload as the variables.
    expect(result.current.variables).toEqual({ watermarkEnabled: true });
  });

  it('an optimistic write and its rollback stay in the original academy', async () => {
    const client = new QueryClient();
    const settingsA = {
      emailOtpPolicy: 'inherit',
    } as unknown as AcademyCommunicationSettings;
    const settingsB = {
      emailOtpPolicy: 'always',
    } as unknown as AcademyCommunicationSettings;
    client.setQueryData(academyKeys.communicationSettings(ORG, 'A'), settingsA);
    client.setQueryData(academyKeys.communicationSettings(ORG, 'B'), settingsB);

    const { result, rerender } = renderHook(
      ({ academyId }) => useUpdateAcademyCommunicationSettings(academyId),
      { initialProps: { academyId: 'A' }, wrapper: wrapperFor(client) }
    );
    act(() => {
      result.current.mutate({ emailOtpPolicy: 'never' } as never);
    });
    await waitFor(() =>
      expect(
        client.getQueryData(academyKeys.communicationSettings(ORG, 'A'))
      ).toMatchObject({ emailOtpPolicy: 'never' })
    );

    rerender({ academyId: 'B' });
    await act(async () => {
      rejectSettings(new Error('refused'));
    });

    await waitFor(() =>
      expect(
        client.getQueryData(academyKeys.communicationSettings(ORG, 'A'))
      ).toEqual(settingsA)
    );
    // B was never touched by A's optimistic write or rollback.
    expect(
      client.getQueryData(academyKeys.communicationSettings(ORG, 'B'))
    ).toEqual(settingsB);
  });
});
