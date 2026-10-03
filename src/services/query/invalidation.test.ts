/**
 * Cache invalidation: the trailing-`undefined` prefix fix and the
 * per-domain helpers.
 *
 * Every test seeds a real QueryClient with the keys the screens actually
 * cache (list keys WITH a query object, as the pages fetch them) plus
 * unrelated neighbours, runs the helper, and reads back which entries were
 * marked stale. A helper passes only if it reaches every view its
 * mutation changes and leaves everything else alone.
 */
import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  academyKeys,
  courseDiscoveryKeys,
  courseKeys,
  dashboardOverviewKeys,
  instructorKeys,
  paymentKeys,
  planKeys,
  platformPlanKeys,
  provisioningKeys,
  publicPlanKeys,
  publicWebsiteKeys,
  supportKeys,
  tenantSupportCaseKeys,
  websiteKeys,
} from './query-keys';
import { invalidateQueries, normalizeKeyPrefix } from './query-utils';
import {
  invalidateBranding,
  invalidateCourseCatalog,
  invalidateFaqEntries,
  invalidatePlans,
  invalidateProvisioning,
  invalidatePublicWebsiteSite,
  invalidateRoster,
  invalidateSupportCases,
  invalidateTenantPayments,
  invalidateTestimonialEntries,
} from './invalidation';

const ORG = 'org-1';
const OTHER_ORG = 'org-2';
const ACADEMY = 'academy-1';
const OTHER_ACADEMY = 'academy-2';
const COURSE = 'course-1';
const OTHER_COURSE = 'course-2';
const PAGE_ONE = { pagination: { page: 1, pageSize: 20 } };

function seed(keys: readonly (readonly unknown[])[]): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity } },
  });
  for (const key of keys)
    client.setQueryData(key as unknown[], { seeded: true });
  return client;
}

function isStale(client: QueryClient, key: readonly unknown[]): boolean {
  const query = client.getQueryCache().find({
    queryKey: key as unknown[],
    exact: true,
  });
  if (!query) throw new Error(`not seeded: ${JSON.stringify(key)}`);
  return query.state.isInvalidated;
}

describe('normalizeKeyPrefix', () => {
  it('drops trailing undefined elements only', () => {
    expect(normalizeKeyPrefix(['a', 'list', 'org', undefined])).toEqual([
      'a',
      'list',
      'org',
    ]);
    expect(
      normalizeKeyPrefix(['a', undefined, 'b', undefined, undefined])
    ).toEqual(['a', undefined, 'b']);
    const untouched = ['a', 'b'] as const;
    expect(normalizeKeyPrefix(untouched)).toBe(untouched);
  });
});

describe('invalidateQueries — list(scope) prefixes', () => {
  it('raw TanStack partial matching misses a list(scope, query) cache (the bug)', async () => {
    const cached = websiteKeys.faqEntries(ACADEMY, PAGE_ONE);
    const client = seed([cached]);
    await client.invalidateQueries({
      queryKey: [...websiteKeys.faqEntries(ACADEMY)],
    });
    expect(isStale(client, cached)).toBe(false);
  });

  it('now matches every list(scope, query) cache of that scope, and nothing else', async () => {
    const cached = websiteKeys.faqEntries(ACADEMY, PAGE_ONE);
    const cachedNoQuery = websiteKeys.faqEntries(ACADEMY);
    const otherAcademy = websiteKeys.faqEntries(OTHER_ACADEMY, PAGE_ONE);
    const testimonials = websiteKeys.testimonialEntries(ACADEMY, PAGE_ONE);
    const client = seed([cached, cachedNoQuery, otherAcademy, testimonials]);

    await invalidateQueries(client, websiteKeys.faqEntries(ACADEMY));

    expect(isStale(client, cached)).toBe(true);
    expect(isStale(client, cachedNoQuery)).toBe(true);
    expect(isStale(client, otherAcademy)).toBe(false);
    expect(isStale(client, testimonials)).toBe(false);
  });

  it('also fixes paymentKeys.list(org) and provisioningKeys.list(org)', async () => {
    const payments = paymentKeys.list(ORG, PAGE_ONE);
    const provisioning = provisioningKeys.list(ORG, PAGE_ONE);
    const client = seed([payments, provisioning]);
    await invalidateQueries(client, paymentKeys.list(ORG));
    await invalidateQueries(client, provisioningKeys.list(ORG));
    expect(isStale(client, payments)).toBe(true);
    expect(isStale(client, provisioning)).toBe(true);
  });
});

describe('invalidateCourseCatalog', () => {
  const affected = [
    courseKeys.list(ACADEMY, PAGE_ONE),
    courseKeys.detail(ACADEMY, COURSE),
    courseKeys.categories(ACADEMY),
    dashboardOverviewKeys.organization(ORG),
    dashboardOverviewKeys.academy(ACADEMY),
    academyKeys.stats(ORG, ACADEMY),
    // Matched by academy id whatever organization id the screen keyed with.
    academyKeys.stats(undefined, ACADEMY),
    instructorKeys.courses('instructor-1', PAGE_ONE),
    instructorKeys.course('instructor-1', COURSE),
    instructorKeys.dashboard('instructor-1'),
    courseDiscoveryKeys.list(PAGE_ONE),
    publicWebsiteKeys.courses(ACADEMY, PAGE_ONE),
    publicWebsiteKeys.course(ACADEMY, COURSE),
    publicWebsiteKeys.courseCurriculum(ACADEMY, COURSE),
    publicWebsiteKeys.statistics(ACADEMY),
    publicWebsiteKeys.categories(ACADEMY),
  ];
  const untouched = [
    courseKeys.list(OTHER_ACADEMY, PAGE_ONE),
    courseKeys.detail(ACADEMY, OTHER_COURSE),
    // Curriculum is the course builder's to refresh.
    courseKeys.sections(ACADEMY, COURSE),
    courseKeys.unitItems(ACADEMY, COURSE, 'section-1'),
    academyKeys.stats(ORG, OTHER_ACADEMY),
    academyKeys.members(ORG, ACADEMY, PAGE_ONE),
    instructorKeys.students('instructor-1', COURSE),
    publicWebsiteKeys.courses(OTHER_ACADEMY, PAGE_ONE),
    publicWebsiteKeys.identity(ACADEMY),
    publicWebsiteKeys.course(ACADEMY, OTHER_COURSE),
  ];

  it('reaches every view that shows the course, and nothing else', async () => {
    const client = seed([...affected, ...untouched]);
    await invalidateCourseCatalog(client, {
      academyId: ACADEMY,
      courseId: COURSE,
    });
    for (const key of affected)
      expect(isStale(client, key), JSON.stringify(key)).toBe(true);
    for (const key of untouched)
      expect(isStale(client, key), JSON.stringify(key)).toBe(false);
  });

  it('without a course id (a create) refreshes every detail of the academy only', async () => {
    const client = seed([
      courseKeys.detail(ACADEMY, COURSE),
      courseKeys.detail(OTHER_ACADEMY, COURSE),
    ]);
    await invalidateCourseCatalog(client, { academyId: ACADEMY });
    expect(isStale(client, courseKeys.detail(ACADEMY, COURSE))).toBe(true);
    expect(isStale(client, courseKeys.detail(OTHER_ACADEMY, COURSE))).toBe(
      false
    );
  });
});

describe('invalidateBranding', () => {
  it('refreshes the academy reads AND the identity read behind the logo', async () => {
    const affected = [
      academyKeys.list(ORG, PAGE_ONE),
      academyKeys.detail(ORG, ACADEMY),
      publicWebsiteKeys.identity(ACADEMY),
      publicWebsiteKeys.configuration(ACADEMY),
      websiteKeys.configuration(ACADEMY),
    ];
    const untouched = [
      academyKeys.detail(ORG, OTHER_ACADEMY),
      academyKeys.stats(ORG, ACADEMY),
      academyKeys.roster(ORG, ACADEMY, {}),
      academyKeys.invites(ORG, ACADEMY),
      publicWebsiteKeys.identity(OTHER_ACADEMY),
      courseKeys.list(ACADEMY, PAGE_ONE),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidateBranding(client, ACADEMY);
    for (const key of affected)
      expect(isStale(client, key), JSON.stringify(key)).toBe(true);
    for (const key of untouched)
      expect(isStale(client, key), JSON.stringify(key)).toBe(false);
  });
});

describe('invalidateRoster', () => {
  it('refreshes every roster page, the learner, the stats and the dashboard', async () => {
    const affected = [
      academyKeys.roster(ORG, ACADEMY, { search: 'a' }),
      academyKeys.roster(ORG, ACADEMY),
      academyKeys.rosterStudent(ORG, ACADEMY, 'user-1'),
      academyKeys.stats(ORG, ACADEMY),
      dashboardOverviewKeys.academy(ACADEMY),
    ];
    const untouched = [
      academyKeys.roster(ORG, OTHER_ACADEMY, {}),
      academyKeys.rosterStudent(ORG, ACADEMY, 'user-2'),
      academyKeys.invites(ORG, ACADEMY),
      academyKeys.members(ORG, ACADEMY, PAGE_ONE),
      academyKeys.detail(ORG, ACADEMY),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidateRoster(client, { academyId: ACADEMY, userId: 'user-1' });
    for (const key of affected)
      expect(isStale(client, key), JSON.stringify(key)).toBe(true);
    for (const key of untouched)
      expect(isStale(client, key), JSON.stringify(key)).toBe(false);
  });
});

describe('invalidatePlans', () => {
  it('refreshes the catalog, the plan, its history and the public plan list', async () => {
    const affected = [
      planKeys.list(),
      planKeys.detail('pro'),
      platformPlanKeys.history('pro', PAGE_ONE),
      publicPlanKeys.list(),
    ];
    const untouched = [
      planKeys.detail('basic'),
      platformPlanKeys.history('basic', PAGE_ONE),
      planKeys.trialPolicy(),
      planKeys.addOnList(),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidatePlans(client, 'pro');
    for (const key of affected)
      expect(isStale(client, key), JSON.stringify(key)).toBe(true);
    for (const key of untouched)
      expect(isStale(client, key), JSON.stringify(key)).toBe(false);
  });

  it('keeps the public list key shape the marketing pages already cache', () => {
    expect(publicPlanKeys.list()).toEqual(['public-plans', 'list']);
    expect(platformPlanKeys.history('pro')).toEqual([
      'platform-plans',
      'history',
      'pro',
      {},
    ]);
  });
});

describe('tenant payments and provisioning', () => {
  it('invalidateTenantPayments refreshes the history lists and the payment only', async () => {
    const affected = [
      paymentKeys.list(ORG, PAGE_ONE),
      paymentKeys.detail(ORG, 'pay-1'),
    ];
    const untouched = [
      paymentKeys.list(OTHER_ORG, PAGE_ONE),
      paymentKeys.detail(ORG, 'pay-2'),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidateTenantPayments(client, ORG, 'pay-1');
    for (const key of affected) expect(isStale(client, key)).toBe(true);
    for (const key of untouched) expect(isStale(client, key)).toBe(false);
  });

  it('invalidateProvisioning refreshes the lists and the request only', async () => {
    const affected = [
      provisioningKeys.list(ORG, PAGE_ONE),
      provisioningKeys.detail(ORG, 'req-1'),
    ];
    const untouched = [
      provisioningKeys.list(OTHER_ORG, PAGE_ONE),
      provisioningKeys.detail(ORG, 'req-2'),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidateProvisioning(client, ORG, 'req-1');
    for (const key of affected) expect(isStale(client, key)).toBe(true);
    for (const key of untouched) expect(isStale(client, key)).toBe(false);
  });
});

describe('website content libraries', () => {
  it('invalidateFaqEntries refreshes every FAQ list and the entry, never testimonials', async () => {
    const affected = [
      websiteKeys.faqEntries(ACADEMY, PAGE_ONE),
      websiteKeys.faqEntry(ACADEMY, 'faq-1'),
    ];
    const untouched = [
      websiteKeys.faqEntries(OTHER_ACADEMY, PAGE_ONE),
      websiteKeys.faqEntry(ACADEMY, 'faq-2'),
      websiteKeys.testimonialEntries(ACADEMY, PAGE_ONE),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidateFaqEntries(client, ACADEMY, 'faq-1');
    for (const key of affected) expect(isStale(client, key)).toBe(true);
    for (const key of untouched) expect(isStale(client, key)).toBe(false);
  });

  it('invalidateTestimonialEntries refreshes every testimonial list, never FAQs', async () => {
    const affected = [
      websiteKeys.testimonialEntries(ACADEMY, PAGE_ONE),
      websiteKeys.testimonialEntry(ACADEMY, 't-1'),
    ];
    const untouched = [
      websiteKeys.testimonialEntries(OTHER_ACADEMY, PAGE_ONE),
      websiteKeys.faqEntries(ACADEMY, PAGE_ONE),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidateTestimonialEntries(client, ACADEMY, 't-1');
    for (const key of affected) expect(isStale(client, key)).toBe(true);
    for (const key of untouched) expect(isStale(client, key)).toBe(false);
  });

  it('invalidatePublicWebsiteSite refreshes the live site reads of one academy', async () => {
    const affected = [
      publicWebsiteKeys.configuration(ACADEMY),
      publicWebsiteKeys.pages(ACADEMY),
      publicWebsiteKeys.page(ACADEMY, 'about'),
    ];
    const untouched = [
      publicWebsiteKeys.configuration(OTHER_ACADEMY),
      publicWebsiteKeys.identity(ACADEMY),
      publicWebsiteKeys.courses(ACADEMY, PAGE_ONE),
    ];
    const client = seed([...affected, ...untouched]);
    await invalidatePublicWebsiteSite(client, ACADEMY);
    for (const key of affected) expect(isStale(client, key)).toBe(true);
    for (const key of untouched) expect(isStale(client, key)).toBe(false);
  });
});

describe('invalidateSupportCases', () => {
  it("refreshes both of the requester's ticket lists", async () => {
    const affected = [
      supportKeys.mineList(ORG, PAGE_ONE),
      supportKeys.mineDetail('case-1'),
      tenantSupportCaseKeys.organization(ORG),
      tenantSupportCaseKeys.academy(ACADEMY),
    ];
    const untouched = [courseKeys.list(ACADEMY, PAGE_ONE)];
    const client = seed([...affected, ...untouched]);
    await invalidateSupportCases(client);
    for (const key of affected) expect(isStale(client, key)).toBe(true);
    for (const key of untouched) expect(isStale(client, key)).toBe(false);
  });
});
