/**
 * Shared support for the P64 Phase 4 Playwright journeys J5 and J6
 * (master plan Phase 4 §P).
 *
 * Everything here goes through the REAL API as the principal the plan
 * names — the academy owner authors, the platform owner reviews money,
 * the learner buys — so nothing below is a shortcut around a product
 * rule. The helpers exist so the two specs read as the journeys they
 * are, not as two copies of the same fixture plumbing.
 *
 * LOCAL FIXTURE: PROVISIONING (opt-in). `resolveAcademy` needs an
 * academy the public resolver can find, and the resolver only knows
 * academies with an `assigned` subdomain allocation — which the seed
 * never writes; provisioning is the product's only writer of that row.
 * A local database that lost its allocations (the backend's own jest
 * e2e suites truncate freely) therefore cannot resolve the seeded
 * academy at all. `ensureAcademy` closes that gap WITHOUT touching the
 * database directly: when `E2E_PROVISION_ACADEMY=true`, and only then,
 * it provisions the academy `E2E_ACADEMY_SLUG` names inside the seeded
 * owner's organization through `POST /organizations/:id/provisioning-
 * requests` — the same flow the dashboard's "add academy" uses — and
 * publishes its generated website. Idempotent: a slug that already
 * resolves is used as is.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  ACADEMY_SLUG,
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiGet,
  apiPatch,
  apiPost,
  apiSignIn,
  authHeader,
  declineCookies,
  type Session,
} from './atlas';

/** Local-only. The frontend calls the API through this proxy so the request host names the academy. */
export const FRONTEND_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
export const PROXIED_API_BASE = `${FRONTEND_BASE}/api/v1`;

/** Seeded platform owner — `prisma/seed.ts`. Reviews course-order payments. */
export const PLATFORM_OWNER_EMAIL = 'admin@atlas.dev';

/** The browser's own token store (`storage.constants.ts`). */
const AUTH_TOKENS_KEY = 'atlas:auth-tokens';

export function apiPut(
  request: APIRequestContext,
  session: Session,
  path: string,
  data?: unknown
) {
  return request.put(`${API_BASE}${path}`, { headers: authHeader(session), data: data ?? {} });
}

export async function signInPlatformOwner(request: APIRequestContext): Promise<Session> {
  return apiSignIn(request, {
    email: PLATFORM_OWNER_EMAIL,
    password: SEED.password,
    surface: 'management',
  });
}

/** Signs in on the academy website's own form and waits for the learner home. */
export async function signInOnWebsite(page: Page, email: string): Promise<void> {
  await page.goto(academyPath('/sign-in'));
  await declineCookies(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/my/, { timeout: 30_000 });
}

/** The access token the signed-in browser holds, for API calls made AS that browser. */
export async function browserAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as { accessToken?: string }).accessToken ?? null;
    } catch {
      return null;
    }
  }, AUTH_TOKENS_KEY);
  expect(token, 'the browser holds a learner session').toBeTruthy();
  return token!;
}

/* ------------------------------------------------------------------ */
/* Tiny, real files                                                   */
/* ------------------------------------------------------------------ */

/** A real 1×1 PNG — passes the server's magic-byte check, small enough to inline. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

/** A minimal single-page PDF. */
export const TINY_PDF = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj',
    'trailer<</Root 1 0 R>>',
    '%%EOF',
    '',
  ].join('\n'),
  'utf8'
);

export function dataUrl(mimeType: string, buffer: Buffer): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/* ------------------------------------------------------------------ */
/* Academy                                                            */
/* ------------------------------------------------------------------ */

async function resolveAcademyOrNull(
  request: APIRequestContext
): Promise<{ id: string; name: string } | null> {
  const response = await request.get(`${API_BASE}/public/websites/resolve`, {
    params: { hostname: ACADEMY_SLUG },
  });
  if (response.status() === 404) return null;
  expect(response.ok(), `resolve failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  const json = await response.json();
  return { id: json.academyId, name: json.academyName };
}

/**
 * The academy the journey runs against, provisioning it first when the
 * environment asks for that (see the file comment). Returns the owner's
 * session too, because the owner is who provisions and who authors.
 */
export async function ensureAcademy(request: APIRequestContext): Promise<{
  academyId: string;
  academyName: string;
  organizationId: string;
  owner: Session;
}> {
  const owner = await apiSignIn(request, {
    email: SEED.owner,
    password: SEED.password,
    surface: 'management',
  });

  let academy = await resolveAcademyOrNull(request);
  if (!academy) {
    expect(
      process.env.E2E_PROVISION_ACADEMY === 'true',
      `the academy website "${ACADEMY_SLUG}" does not resolve. Either restore the seeded academy's subdomain allocation, or run with E2E_PROVISION_ACADEMY=true E2E_ACADEMY_SLUG=<new-slug> to provision one through the product's own flow.`
    ).toBeTruthy();
    academy = await provisionAcademy(request, owner);
  }

  const detail = await apiGet(request, owner, `/academies/${academy.id}`);
  expect(detail.ok(), `could not read the academy: ${detail.status()}`).toBeTruthy();
  const organizationId: string = (await detail.json()).organizationId;
  return { academyId: academy.id, academyName: academy.name, organizationId, owner };
}

async function provisionAcademy(
  request: APIRequestContext,
  owner: Session
): Promise<{ id: string; name: string }> {
  // The organization the seeded owner OWNS (they are also a plain member
  // of another one, which may not add academies).
  const me = await apiGet(request, owner, '/users/me');
  expect(me.ok(), `could not read the owner: ${me.status()}`).toBeTruthy();
  const memberships: { organizationId: string; role: string }[] =
    (await me.json()).organizationMemberships ?? [];
  const owned = memberships.find((m) => m.role === 'owner') ?? memberships[0];
  expect(owned, 'the seeded owner belongs to an organization').toBeTruthy();
  const organizationId = owned!.organizationId;

  const created = await apiPost(
    request,
    owner,
    `/organizations/${organizationId}/provisioning-requests`,
    {
      academyName: `E2E ${ACADEMY_SLUG}`.slice(0, 100),
      requestedSubdomain: ACADEMY_SLUG,
      websiteSetupMode: 'complete',
      idempotencyKey: `e2e-provision-${ACADEMY_SLUG}`,
    }
  );
  expect(
    created.status() < 300,
    `provisioning request refused: ${created.status()} ${await created.text()}`
  ).toBeTruthy();
  const requestId = (await created.json()).id as string;

  // The orchestrator runs the steps on the queue; wait for `ready`.
  await expect
    .poll(
      async () => {
        const state = await apiGet(
          request,
          owner,
          `/organizations/${organizationId}/provisioning-requests/${requestId}`
        );
        const body = await state.json();
        if (body.status === 'failed' || body.status === 'cancelled') {
          throw new Error(
            `provisioning ${body.status}: ${JSON.stringify(body.lastError ?? body.steps)}`
          );
        }
        return body.status;
      },
      { timeout: 180_000, intervals: [1_000, 2_000, 3_000] }
    )
    .toBe('ready');

  const academy = await resolveAcademyOrNull(request);
  expect(academy, `"${ACADEMY_SLUG}" still does not resolve after provisioning`).toBeTruthy();

  // Make the generated website public. Bootstrap first (lazy get-or-create), then publish.
  const configuration = await apiGet(request, owner, `/academies/${academy!.id}/website/configuration`);
  expect(configuration.ok(), await configuration.text()).toBeTruthy();
  if ((await configuration.json()).status !== 'published') {
    const published = await apiPost(request, owner, `/academies/${academy!.id}/website/publish`);
    expect(published.ok(), `website publish refused: ${published.status()} ${await published.text()}`).toBeTruthy();
  }
  return academy!;
}

/* ------------------------------------------------------------------ */
/* Commerce readiness                                                 */
/* ------------------------------------------------------------------ */

export interface PaymentMethodFixture {
  readonly key: string;
  readonly displayName: string;
}

/**
 * Makes paid checkout possible for the organization: Atlas Payments
 * collection mode (the owner's decision), an effective commission (the
 * platform owner's), and one enabled manual method with proof support.
 * Each step is skipped when the state is already right, so re-runs are
 * no-ops.
 */
export async function ensurePaymentCollection(
  request: APIRequestContext,
  owner: Session,
  platformOwner: Session,
  organizationId: string
): Promise<PaymentMethodFixture> {
  const settings = await apiGet(request, owner, `/organizations/${organizationId}/payment-settings`);
  expect(settings.ok(), `payment settings unreadable: ${settings.status()} ${await settings.text()}`).toBeTruthy();
  if ((await settings.json()).paymentCollectionMode !== 'atlas_payments') {
    const updated = await apiPatch(request, owner, `/organizations/${organizationId}/payment-settings`, {
      paymentCollectionMode: 'atlas_payments',
    });
    expect(updated.ok(), `could not enable Atlas Payments: ${updated.status()} ${await updated.text()}`).toBeTruthy();
  }

  const commission = await apiGet(
    request,
    owner,
    `/organizations/${organizationId}/payment-settings/commission`
  );
  expect(commission.ok(), await commission.text()).toBeTruthy();
  if (!(await commission.json()).effective?.resolved) {
    // Organization-scoped, never the platform-wide default: the smallest change that resolves.
    const set = await apiPatch(
      request,
      platformOwner,
      `/platform-commission/organizations/${organizationId}`,
      { commissionMode: 'custom', customPercentageBasisPoints: 1000 }
    );
    expect(set.ok(), `could not set a commission: ${set.status()} ${await set.text()}`).toBeTruthy();
  }

  const methods = await apiGet(request, owner, '/payment-methods');
  expect(methods.ok(), await methods.text()).toBeTruthy();
  const methodsBody = await methods.json();
  const items: {
    key: string;
    displayName: string;
    enabled: boolean;
    provider: string;
    capabilities?: { supportsProof?: boolean };
  }[] = methodsBody.items ?? methodsBody;
  const method = items.find(
    (m) => m.enabled && m.provider === 'atlas_manual' && m.capabilities?.supportsProof !== false
  );
  expect(
    method,
    'an enabled manual payment method is seeded (npm run db:seed in atlas-backend)'
  ).toBeTruthy();
  return { key: method!.key, displayName: method!.displayName };
}

/* ------------------------------------------------------------------ */
/* Buying                                                             */
/* ------------------------------------------------------------------ */

/**
 * The learner buys a paid course through the API — order, payment,
 * proof — and the platform owner approves the payment, which is what
 * enrols them. The UI version of the same journey is J6; J5 uses this
 * so its subject (revocation) is not buried under checkout clicks.
 */
export async function buyCourseThroughApi(
  request: APIRequestContext,
  learner: Session,
  platformOwner: Session,
  courseId: string,
  method: PaymentMethodFixture
): Promise<{ orderId: string; paymentId: string }> {
  const order = await apiPost(request, learner, `/courses/${courseId}/course-orders`, {
    idempotencyKey: `e2e-order-${courseId}-${learner.userId}`,
  });
  expect(order.status() < 300, `order refused: ${order.status()} ${await order.text()}`).toBeTruthy();
  const orderId = (await order.json()).id as string;

  const payment = await apiPost(request, learner, `/course-orders/${orderId}/payments`, {
    methodKey: method.key,
  });
  expect(payment.status() < 300, `payment refused: ${payment.status()} ${await payment.text()}`).toBeTruthy();
  const paymentId = (await payment.json()).id as string;

  const proof = await apiPatch(
    request,
    learner,
    `/course-orders/${orderId}/payments/${paymentId}/proof`,
    { fileName: 'proof.png', fileData: dataUrl('image/png', TINY_PNG), note: 'Playwright proof' }
  );
  expect(proof.ok(), `proof refused: ${proof.status()} ${await proof.text()}`).toBeTruthy();

  await approveCourseOrderPayment(request, platformOwner, paymentId);
  return { orderId, paymentId };
}

export async function approveCourseOrderPayment(
  request: APIRequestContext,
  platformOwner: Session,
  paymentId: string
): Promise<void> {
  const approved = await apiPost(
    request,
    platformOwner,
    `/platform-course-order-payments/${paymentId}/approve`,
    { notes: 'Playwright approval' }
  );
  expect(approved.ok(), `approval refused: ${approved.status()} ${await approved.text()}`).toBeTruthy();
  expect((await approved.json()).status).toBe('succeeded');
}

/** The payment awaiting review for an order, as the platform owner sees it. */
export async function findPendingPaymentForOrder(
  request: APIRequestContext,
  platformOwner: Session,
  orderId: string
): Promise<string> {
  let found: string | undefined;
  await expect
    .poll(
      async () => {
        const list = await apiGet(request, platformOwner, '/platform-course-order-payments', {
          pageSize: '100',
        });
        const body = await list.json();
        const items: { id: string; courseOrderId: string }[] = body.items ?? body;
        found = items.find((p) => p.courseOrderId === orderId)?.id;
        return found ?? null;
      },
      { timeout: 30_000 }
    )
    .not.toBeNull();
  return found!;
}

/* ------------------------------------------------------------------ */
/* Authoring                                                          */
/* ------------------------------------------------------------------ */

export interface CourseAuthoring {
  readonly title: string;
  readonly pricing: { type: 'free' } | { type: 'paid'; amount: number; currency: string };
  readonly level?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  readonly outcomes?: string[];
  readonly requirements?: string[];
  readonly description?: string;
}

/** Owner creates a public course and returns its id (unpublished). */
export async function createCourse(
  request: APIRequestContext,
  owner: Session,
  academyId: string,
  input: CourseAuthoring
): Promise<string> {
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const created = await apiPost(request, owner, `/academies/${academyId}/courses`, {
    title: input.title,
    slug,
    shortDescription: input.description ?? 'Playwright Phase 4 journey.',
    description: input.description ?? 'Playwright Phase 4 journey.',
    pricing: input.pricing,
    visibility: 'public',
    ...(input.level ? { level: input.level } : {}),
    ...(input.outcomes ? { outcomes: input.outcomes } : {}),
    ...(input.requirements ? { requirements: input.requirements } : {}),
  });
  expect(created.status(), await created.text()).toBe(201);
  return (await created.json()).id;
}

/**
 * Owner adds one section with one published FILE lesson whose protected
 * body is a PDF in the protected tier — the content a grant is issued for.
 */
export async function addProtectedFileLesson(
  request: APIRequestContext,
  owner: Session,
  academyId: string,
  courseId: string,
  lessonTitle: string
): Promise<{ sectionId: string; lessonId: string; fileName: string }> {
  const section = await apiPost(request, owner, `/academies/${academyId}/courses/${courseId}/sections`, {
    title: 'Materials',
  });
  expect(section.status(), await section.text()).toBe(201);
  const sectionId = (await section.json()).id;

  const lesson = await apiPost(
    request,
    owner,
    `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/lessons`,
    { title: lessonTitle, contentType: 'file', status: 'published', completionRule: 'manual' }
  );
  expect(lesson.status(), await lesson.text()).toBe(201);
  const lessonId = (await lesson.json()).id;

  const fileName = 'lesson-notes.pdf';
  const asset = await apiPost(request, owner, `/academies/${academyId}/media/protected`, {
    fileName,
    file: dataUrl('application/pdf', TINY_PDF),
    courseId,
  });
  expect(asset.status() < 300, `protected upload refused: ${asset.status()} ${await asset.text()}`).toBeTruthy();
  const mediaAssetId = (await asset.json()).id;

  const content = await apiPut(
    request,
    owner,
    `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/content`,
    { kind: 'file', mediaAssetId }
  );
  expect(content.status() < 300, `lesson content refused: ${content.status()} ${await content.text()}`).toBeTruthy();
  return { sectionId, lessonId, fileName };
}

export async function publishCourse(
  request: APIRequestContext,
  owner: Session,
  academyId: string,
  courseId: string
): Promise<void> {
  const published = await apiPost(request, owner, `/academies/${academyId}/courses/${courseId}/publish`);
  expect(published.status() < 300, `publish refused: ${published.status()} ${await published.text()}`).toBeTruthy();
}

/** The learner's enrollment for a course, or `null`. */
export async function enrollmentForCourse(
  request: APIRequestContext,
  learner: Session,
  courseId: string
): Promise<{ status: string; revokedAt?: string } | null> {
  const response = await apiGet(request, learner, `/enrollments/by-course/${courseId}`);
  expect(response.ok(), await response.text()).toBeTruthy();
  const text = await response.text();
  return text ? (JSON.parse(text) as { status: string; revokedAt?: string } | null) : null;
}
