/**
 * The mutation hooks wired to the per-domain invalidation helpers.
 *
 * Each test seeds the caches the affected screens hold (list keys WITH the
 * query object the page fetched with), runs the real hook against a
 * stubbed service, and checks the right entries went stale — the views
 * that used to stay outdated until a manual refresh — while unrelated
 * entries did not.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  academyKeys,
  courseKeys,
  dashboardOverviewKeys,
  instructorKeys,
  paymentKeys,
  planKeys,
  platformPlanKeys,
  provisioningKeys,
  publicPlanKeys,
  publicWebsiteKeys,
  websiteKeys,
} from './query-keys';

const ORG = 'org-1';
const ACADEMY = 'academy-1';
const COURSE = 'course-1';
const PAGE_ONE = { pagination: { page: 1, pageSize: 20 } };

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ organization: { id: ORG }, user: { id: 'user-1' } }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
vi.mock('@features/academy/services/AcademyService', () => ({
  academyService: {
    createAcademyStudent: vi.fn(async () => ({ userId: 'new-learner' })),
    updateAcademyBranding: vi.fn(async () => ({ id: ACADEMY })),
  },
}));
vi.mock('@features/course/services/CourseService', () => ({
  courseService: {
    publishCourse: vi.fn(async () => ({ id: COURSE })),
  },
}));
vi.mock('@features/website/services/WebsiteContentService', () => ({
  websiteContentService: {
    createFaqEntry: vi.fn(async () => ({ id: 'faq-new' })),
  },
}));
vi.mock('@features/platform/services/PlatformPlansService', () => ({
  platformPlansService: {
    updatePlan: vi.fn(async () => ({ key: 'pro' })),
  },
}));
vi.mock('@features/provisioning/services/ProvisioningService', () => ({
  provisioningService: {
    createProvisioningRequest: vi.fn(async () => ({ id: 'req-1' })),
  },
}));

const { useCreateAcademyStudent } =
  await import('@features/academy/hooks/useCreateAcademyStudent');
const { useUpdateAcademyBranding } =
  await import('@features/academy/hooks/useUpdateAcademyBranding');
const { usePublishCourse } =
  await import('@features/course/hooks/usePublishCourse');
const { useCreateWebsiteFaqEntry } =
  await import('@features/website/hooks/useCreateWebsiteFaqEntry');
const { useUpdatePlan } =
  await import('@features/platform/hooks/usePlatformPlans');
const { useCreatePayment } =
  await import('@features/billing/hooks/useCreatePayment');
const { useCreateProvisioningRequest } =
  await import('@features/provisioning/hooks/useCreateProvisioningRequest');

afterEach(cleanup);

function setup(keys: readonly (readonly unknown[])[]) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  for (const key of keys)
    client.setQueryData(key as unknown[], { seeded: true });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const stale = (key: readonly unknown[]) =>
    client.getQueryCache().find({ queryKey: key as unknown[], exact: true })!
      .state.isInvalidated;
  return { wrapper, stale };
}

describe('mutation hooks refresh every affected view', () => {
  it('useCreateAcademyStudent refreshes the roster and the counts (it used to refresh nothing)', async () => {
    const { wrapper, stale } = setup([
      academyKeys.roster(ORG, ACADEMY, { search: '' }),
      academyKeys.stats(ORG, ACADEMY),
      dashboardOverviewKeys.academy(ACADEMY),
      academyKeys.members(ORG, ACADEMY, PAGE_ONE),
    ]);
    const { result } = renderHook(() => useCreateAcademyStudent(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        academyId: ACADEMY,
        payload: {} as never,
      })
    );
    expect(stale(academyKeys.roster(ORG, ACADEMY, { search: '' }))).toBe(true);
    expect(stale(academyKeys.stats(ORG, ACADEMY))).toBe(true);
    expect(stale(dashboardOverviewKeys.academy(ACADEMY))).toBe(true);
    expect(stale(academyKeys.members(ORG, ACADEMY, PAGE_ONE))).toBe(false);
  });

  it('useUpdateAcademyBranding refreshes the identity read behind the LMS logo', async () => {
    const { wrapper, stale } = setup([
      publicWebsiteKeys.identity(ACADEMY),
      academyKeys.detail(ORG, ACADEMY),
      academyKeys.list(ORG, PAGE_ONE),
      academyKeys.roster(ORG, ACADEMY, {}),
    ]);
    const { result } = renderHook(() => useUpdateAcademyBranding(), {
      wrapper,
    });
    await act(() =>
      result.current.mutateAsync({ id: ACADEMY, payload: {} as never })
    );
    expect(stale(publicWebsiteKeys.identity(ACADEMY))).toBe(true);
    expect(stale(academyKeys.detail(ORG, ACADEMY))).toBe(true);
    expect(stale(academyKeys.list(ORG, PAGE_ONE))).toBe(true);
    expect(stale(academyKeys.roster(ORG, ACADEMY, {}))).toBe(false);
  });

  it('usePublishCourse refreshes the dashboard, stats, instructor and public course views', async () => {
    const { wrapper, stale } = setup([
      courseKeys.list(ACADEMY, PAGE_ONE),
      courseKeys.detail(ACADEMY, COURSE),
      dashboardOverviewKeys.organization(ORG),
      academyKeys.stats(ORG, ACADEMY),
      instructorKeys.courses('instructor-1', PAGE_ONE),
      publicWebsiteKeys.courses(ACADEMY, PAGE_ONE),
      courseKeys.sections(ACADEMY, COURSE),
    ]);
    const { result } = renderHook(() => usePublishCourse(ACADEMY), { wrapper });
    await act(() => result.current.mutateAsync(COURSE));
    expect(stale(courseKeys.list(ACADEMY, PAGE_ONE))).toBe(true);
    expect(stale(courseKeys.detail(ACADEMY, COURSE))).toBe(true);
    expect(stale(dashboardOverviewKeys.organization(ORG))).toBe(true);
    expect(stale(academyKeys.stats(ORG, ACADEMY))).toBe(true);
    expect(stale(instructorKeys.courses('instructor-1', PAGE_ONE))).toBe(true);
    expect(stale(publicWebsiteKeys.courses(ACADEMY, PAGE_ONE))).toBe(true);
    // Curriculum stays with the course builder's own hooks.
    expect(stale(courseKeys.sections(ACADEMY, COURSE))).toBe(false);
  });

  it('useCreateWebsiteFaqEntry refreshes the library list the tab fetched with a query', async () => {
    const { wrapper, stale } = setup([
      websiteKeys.faqEntries(ACADEMY, PAGE_ONE),
      websiteKeys.testimonialEntries(ACADEMY, PAGE_ONE),
    ]);
    const { result } = renderHook(() => useCreateWebsiteFaqEntry(), {
      wrapper,
    });
    await act(() =>
      result.current.mutateAsync({ academyId: ACADEMY, payload: {} as never })
    );
    expect(stale(websiteKeys.faqEntries(ACADEMY, PAGE_ONE))).toBe(true);
    expect(stale(websiteKeys.testimonialEntries(ACADEMY, PAGE_ONE))).toBe(
      false
    );
  });

  it('useCreatePayment refreshes the payment history fetched with a query', async () => {
    const { wrapper, stale } = setup([paymentKeys.list(ORG, PAGE_ONE)]);
    const { result } = renderHook(() => useCreatePayment(), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        organizationId: ORG,
        checkout: {} as never,
        methodKey: 'bank_transfer',
        provider: { createPayment: async () => ({ id: 'pay-1' }) } as never,
      })
    );
    expect(stale(paymentKeys.list(ORG, PAGE_ONE))).toBe(true);
  });

  it('useCreateProvisioningRequest refreshes the request list fetched with a query', async () => {
    const { wrapper, stale } = setup([provisioningKeys.list(ORG, PAGE_ONE)]);
    const { result } = renderHook(() => useCreateProvisioningRequest(), {
      wrapper,
    });
    await act(() =>
      result.current.mutateAsync({ organizationId: ORG, payload: {} as never })
    );
    expect(stale(provisioningKeys.list(ORG, PAGE_ONE))).toBe(true);
  });

  it('useUpdatePlan refreshes the catalog, the plan, its history and the public pricing list', async () => {
    const { wrapper, stale } = setup([
      planKeys.list(),
      planKeys.detail('pro'),
      platformPlanKeys.history('pro', PAGE_ONE),
      publicPlanKeys.list(),
      planKeys.detail('basic'),
    ]);
    const { result } = renderHook(() => useUpdatePlan(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ key: 'pro', payload: {} as never })
    );
    expect(stale(planKeys.list())).toBe(true);
    expect(stale(planKeys.detail('pro'))).toBe(true);
    expect(stale(platformPlanKeys.history('pro', PAGE_ONE))).toBe(true);
    expect(stale(publicPlanKeys.list())).toBe(true);
    expect(stale(planKeys.detail('basic'))).toBe(false);
  });
});
