/**
 * B7 (UX audit) V03 — every learner write whose failure the screen shows
 * itself (an inline alert, a field, one toast with the real reason)
 * declares `meta.inlineErrors`, so the app-wide reporter adds no second
 * message. Before, a failed quiz start/submit/autosave, mark complete,
 * assignment upload/submit/draft, device removal, takeover and every
 * checkout step showed two messages that often contradicted each other.
 *
 * The lesson grant, the course outline and the checkout's payment methods
 * are READS the player and the checkout render themselves, so they opt out
 * of the reporter the same way (query `meta`).
 */
import { describe, expect, it, vi } from 'vitest';
import { INLINE_ERRORS_META } from '@services/query';

const captured = vi.hoisted(
  () =>
    [] as Array<{ meta?: Record<string, unknown>; showErrorToast?: boolean }>
);
const capturedQueries = vi.hoisted(
  () => [] as Array<{ meta?: Record<string, unknown> }>
);

const mockedHooks = vi.hoisted(() => ({
  useApiMutation: (options: {
    meta?: Record<string, unknown>;
    showErrorToast?: boolean;
  }) => {
    captured.push(options);
    return { reset: () => undefined };
  },
  useApiQuery: (options: { meta?: Record<string, unknown> }) => {
    capturedQueries.push(options);
    return { data: undefined, refetch: () => undefined };
  },
  useAuth: () => ({ user: { id: 'user-1' } }),
  useInvalidate: () => ({ invalidate: () => Promise.resolve() }),
  useAcademyBoundMutation: (mutation: unknown) => mutation,
}));

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mockedHooks,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mockedHooks,
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQueryClient: () => ({
    removeQueries: vi.fn(),
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}));
vi.mock('./context/LearnerSurface.context', () => ({
  useLearnerSurface: () => ({ academyId: 'aca-1' }),
}));
vi.mock('./hooks/useRefreshCourseProgress', () => ({
  useRefreshCourseProgress: () => () => Promise.resolve(),
}));

const learning = () => import('@features/learning/hooks');
const learnerCheckout = () => import('./hooks/useCourseCheckout');
const learnerDevices = () => import('./hooks/useLearnerDevices');
const learnerCompletion = () => import('./hooks/useLessonCompletion');
const learnerRefund = () => import('./hooks/useCourseOrderRefund');
const signIn = () => import('@features/profile/hooks/useSignInMethods');
const sessions = () => import('@features/profile/hooks/useSessions');
const trusted = () => import('@features/profile/hooks/useTrustedDevices');

type Hook = (...args: string[]) => unknown;
const hooks: Record<string, () => Promise<Hook>> = {
  useStartQuizAttempt: async () => (await learning()).useStartQuizAttempt,
  useSubmitQuizAttempt: async () => (await learning()).useSubmitQuizAttempt,
  useSaveQuizAnswers: async () => (await learning()).useSaveQuizAnswers,
  useRecordQuizAttemptEvents: async () =>
    (await learning()).useRecordQuizAttemptEvents,
  useCompleteLesson: async () => (await learning()).useCompleteLesson,
  useSaveAssignmentDraft: async () => (await learning()).useSaveAssignmentDraft,
  useSubmitAssignment: async () => (await learning()).useSubmitAssignment,
  useUploadSubmissionAttachment: async () =>
    (await learning()).useUploadSubmissionAttachment,
  useEnroll: async () => (await learning()).useEnroll,
  useMyCertificateDownload: async () =>
    (await learning()).useMyCertificateDownload,
  useSubmitMyReview: async () => (await learning()).useSubmitMyReview,
  useDeleteMyReview: async () => (await learning()).useDeleteMyReview,
  useCompleteLessonInPlayer: async () =>
    (await learnerCompletion()).useCompleteLessonInPlayer,
  useUndoLessonCompletion: async () =>
    (await learnerCompletion()).useUndoLessonCompletion,
  useCreateCourseOrder: async () =>
    (await learnerCheckout()).useCreateCourseOrder,
  useCreateCoursePayment: async () =>
    (await learnerCheckout()).useCreateCoursePayment,
  useSubmitCourseOrderProof: async () =>
    (await learnerCheckout()).useSubmitCourseOrderProof,
  useRequestCourseOrderRefund: async () =>
    (await learnerRefund()).useRequestCourseOrderRefund,
  useRemoveLearnerDevice: async () =>
    (await learnerDevices()).useRemoveLearnerDevice,
  useSessionTakeover: async () => (await learnerDevices()).useSessionTakeover,
  useUnlinkGoogle: async () => (await signIn()).useUnlinkGoogle,
  useRevokeSession: async () => (await sessions()).useRevokeSession,
  useRevokeOtherSessions: async () => (await sessions()).useRevokeOtherSessions,
  useRevokeTrustedDevice: async () => (await trusted()).useRevokeTrustedDevice,
  useRevokeOtherTrustedDevices: async () =>
    (await trusted()).useRevokeOtherTrustedDevices,
};

describe('B7 learner mutations render their own failures (one message)', () => {
  it.each(Object.keys(hooks))(
    '%s declares meta.inlineErrors and no toast of its own',
    async (name) => {
      const hook = await hooks[name]();
      captured.length = 0;
      hook('course-1', 'item-1');
      expect(captured.length).toBe(1);
      expect(captured[0]?.meta?.[INLINE_ERRORS_META]).toBe(true);
      expect(captured[0]?.showErrorToast).toBe(false);
    }
  );
});

describe('B7 reads the learner screens render themselves', () => {
  const queries: Record<string, () => Promise<Hook>> = {
    useLessonGrant: async () =>
      (await import('./hooks/useLessonGrant'))
        .useLessonGrant as unknown as Hook,
    useCourseSequence: async () =>
      (await import('./hooks/useCourseSequence'))
        .useCourseSequence as unknown as Hook,
    useCourseOrderPaymentMethods: async () =>
      (await learnerCheckout()).useCourseOrderPaymentMethods,
  };

  it.each(Object.keys(queries))(
    '%s opts out of the app-wide error toast',
    async (name) => {
      const hook = await queries[name]();
      capturedQueries.length = 0;
      try {
        hook('course-1', 'lesson-1');
      } catch {
        // Hooks that use React state outside a component throw after the
        // query options were captured; only the options matter here.
      }
      expect(capturedQueries[0]?.meta?.[INLINE_ERRORS_META]).toBe(true);
    }
  );
});
