/**
 * B4 (UX audit) V09/V26 — the ONE toast of a failed row action names the
 * real reason: a 500 and a lost connection read differently, a backend
 * refusal reads in its own words, and the roster's copy is used only where
 * it says more. The mutation hooks mark their errors inline so the app-wide
 * reporter adds no second toast.
 */
import { describe, expect, it, vi } from 'vitest';
import { createApiError } from '@api';
import { INLINE_ERRORS_META } from '@services/query';
import { createI18nInstance } from '@/localization/i18n';
import { isTranslatedString } from '@utils';
import { actionFailureDescription } from '@/shared/hooks/useActionFailureToast';
import { memberAddSpecificKey } from '../utils/member-add.utils';

const captured = vi.hoisted(
  () => [] as Array<{ meta?: Record<string, unknown> }>
);
vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useApiMutation: (options: { meta?: Record<string, unknown> }) => {
    captured.push(options);
    return { mutate: vi.fn(), mutateAsync: vi.fn() };
  },
  useAcademyBoundMutation: (mutation: unknown) => mutation,
  useAuth: () => ({ organization: { id: 'org-1' } }),
  useInvalidate: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQueryClient: () => ({}),
}));

const i18n = createI18nInstance('en');
const exists = (key: string) => isTranslatedString(i18n, key);

describe('actionFailureDescription', () => {
  it('a 500 and an abort say different, true things', () => {
    const server = actionFailureDescription(createApiError('server'), exists);
    const network = actionFailureDescription(createApiError('network'), exists);
    expect(i18n.t(server.descriptionKey)).toMatch(/failed on our side/);
    expect(i18n.t(network.descriptionKey)).toMatch(/Check your connection/);
  });

  it('offline says nothing was changed', () => {
    const offline = actionFailureDescription(
      createApiError('network'),
      exists,
      {
        online: false,
      }
    );
    expect(offline.descriptionKey).toBe(
      'common:connectivity.actionNeedsConnection.description'
    );
  });

  it('a backend refusal reads in its own words, never a raw key', () => {
    const owner = actionFailureDescription(
      createApiError('conflict', {
        messageKey: 'errors.academy.cannotRemoveOrganizationOwner',
      }),
      exists
    );
    expect(i18n.t(owner.descriptionKey)).toBe(
      "The organization owner can't be removed from an academy."
    );
  });
});

describe('memberAddSpecificKey (V26)', () => {
  const prefix = 'academy:members.createStudent';
  it('lets the real reason through for a 500 or an abort', () => {
    expect(
      memberAddSpecificKey(createApiError('server'), prefix, exists)
    ).toBeNull();
    expect(
      memberAddSpecificKey(createApiError('network'), prefix, exists)
    ).toBeNull();
  });
  it('keeps the dialog copy for a bare conflict', () => {
    expect(
      memberAddSpecificKey(createApiError('conflict'), prefix, exists)
    ).toBe('academy:members.createStudent.errors.alreadyMember');
  });
});

describe('roster, settings and member hooks mark their errors inline (V09)', () => {
  it('every mutation hook', async () => {
    const hooks = await import('./index');
    const names = [
      'useAddAcademyInstructor',
      'useAddAcademyManager',
      'useRemoveAcademyMember',
      'useCreateAcademyInvite',
      'useRevokeAcademyInvite',
      'useUpdateAcademyRegistrationPolicy',
      'useUpdateAcademyDevicePolicy',
      'useUpdateAcademyContentProtection',
      'useUpdateAcademyVideoTier',
      'useUpdateAcademyCommunicationSettings',
      'useDeleteAcademy',
      'useBlockAcademyStudent',
      'useUnblockAcademyStudent',
      'useApproveAcademyStudent',
      'useRejectAcademyStudent',
      'useEnrollAcademyStudent',
      'useRevokeRosterEnrollment',
      'useUpdateRosterEnrollmentExpiry',
      'useSaveAcademyPaymentMethod',
      'useApproveAcademyCoursePayment',
      'useRejectAcademyCoursePayment',
      'useRecordAcademyCoursePaymentRefund',
    ] as const;
    for (const name of names) {
      const hook = (hooks as Record<string, unknown>)[name] as
        ((id: string) => unknown) | undefined;
      expect(hook, name).toBeTypeOf('function');
      captured.length = 0;
      hook?.('aca-1');
      expect(captured.length, name).toBeGreaterThan(0);
      for (const options of captured) {
        expect(options.meta?.[INLINE_ERRORS_META], name).toBe(true);
      }
    }
  });
});
