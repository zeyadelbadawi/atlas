/**
 * Shared support for the P64 Phase 1 Playwright journeys (master plan
 * Phase 1 §P).
 *
 * Two rules shape everything here.
 *
 * FIRST, nothing is mocked. The journeys drive the real Vite dev server
 * against the real Nest API and the real database, because what they
 * exist to prove — that a learner cannot reach the management surface,
 * and that the roster and RBAC behave for four different principals — is
 * produced by the guard, the RLS policies and the router acting together.
 * A mocked API would assert the mock.
 *
 * SECOND, the learner is always created fresh through the academy website
 * in the journey itself, never seeded. Staff (Client Owner, Manager,
 * Instructor) and the academy's courses come from the repository's own
 * `prisma/seed.ts`, which is what a local or CI database is expected to
 * carry; `requireSeed` fails loudly and specifically when it does not,
 * rather than letting a journey fail later for a reason that looks like a
 * product defect.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1';

/**
 * Local development serves every academy website from the same origin as
 * the dashboard, and the academy is selected by this parameter — the same
 * one the frontend itself uses when no real academy host is in play. On a
 * deployed environment the host does this job and the parameter is
 * ignored.
 */
export const ACADEMY_PREVIEW_PARAM = '__atlas_academy_preview';
export const ACADEMY_SLUG = process.env.E2E_ACADEMY_SLUG ?? 'web-development-academy';

/** Seeded staff — see `atlas-backend/prisma/seed.ts`. */
export const SEED = {
  password: 'DevPassword123!',
  owner: 'sarah.chen@acme-academy.dev',
  manager: 'nora.haddad@acme-academy.dev',
  instructor: 'jane.doe@acme-academy.dev',
  academyName: 'Web Development Academy',
  /** The course the seeded instructor is assigned to. */
  instructorCourseTitle: 'React Fundamentals',
  /** A course in the same academy that the seeded instructor is NOT assigned to. */
  foreignCourseTitle: 'Node.js Backend Development',
  /** An academy in a DIFFERENT organization, for the cross-tenant checks. */
  otherAcademyName: 'Language Learning Hub',
} as const;

/** A path on the academy website, with the local academy selector attached. */
export function academyPath(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${ACADEMY_PREVIEW_PARAM}=${ACADEMY_SLUG}`;
}

/**
 * The dev API runs the real email-deliverability check — it is only
 * skipped under `NODE_ENV=test` — so the `@atlas.test` addresses the Jest
 * suites use are refused here: that reserved TLD publishes no DNS at all.
 * `example.com` is refused too, for the right reason: it publishes an
 * RFC 7505 null MX, an explicit "this domain accepts no mail".
 *
 * Atlas's own platform domain is used instead. It publishes A records and
 * no MX, which is the documented legitimate-small-domain path through the
 * check, and it belongs to this project rather than a third party. No mail
 * is ever sent: local environments use the stub email provider.
 */
export function uniqueLearnerEmail(label: string): string {
  const unique = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  return `p64.${label}.${unique}@${LEARNER_EMAIL_DOMAIN}`;
}

export const LEARNER_EMAIL_DOMAIN =
  process.env.E2E_LEARNER_EMAIL_DOMAIN ?? 'atlass.dpdns.org';

export const LEARNER_PASSWORD = 'PlaywrightPass123!';

export interface Session {
  readonly accessToken: string;
  readonly userId: string;
}

/** Signs in through the API. `surface` and `academyId` are the P64 fields. */
export async function apiSignIn(
  request: APIRequestContext,
  body: {
    email: string;
    password: string;
    surface?: 'management' | 'academy';
    academyId?: string;
  }
): Promise<Session> {
  const response = await request.post(`${API_BASE}/auth/sign-in`, { data: body });
  expect(
    response.ok(),
    `sign-in failed for ${body.email}: ${response.status()} ${await response.text()}`
  ).toBeTruthy();
  const json = await response.json();
  return { accessToken: json.accessToken, userId: json.user.id };
}

export function authHeader(session: Session): Record<string, string> {
  return { Authorization: `Bearer ${session.accessToken}` };
}

/** GET as a given session, returning the raw response so the caller can assert on status. */
export function apiGet(
  request: APIRequestContext,
  session: Session,
  path: string,
  params?: Record<string, string>
) {
  return request.get(`${API_BASE}${path}`, { headers: authHeader(session), params });
}

export function apiPost(
  request: APIRequestContext,
  session: Session,
  path: string,
  data?: unknown
) {
  return request.post(`${API_BASE}${path}`, {
    headers: authHeader(session),
    data: data ?? {},
  });
}

export function apiPatch(
  request: APIRequestContext,
  session: Session,
  path: string,
  data?: unknown
) {
  return request.patch(`${API_BASE}${path}`, {
    headers: authHeader(session),
    data: data ?? {},
  });
}

/** The academy the journeys run against, resolved from its public website. */
export async function resolveAcademy(
  request: APIRequestContext
): Promise<{ id: string; name: string }> {
  const response = await request.get(`${API_BASE}/public/websites/resolve`, {
    params: { hostname: ACADEMY_SLUG },
  });
  expect(
    response.ok(),
    `could not resolve the academy website "${ACADEMY_SLUG}". Is the backend running and the database seeded (npm run seed in atlas-backend)? Got ${response.status()}.`
  ).toBeTruthy();
  const json = await response.json();
  return { id: json.academyId, name: json.academyName };
}

/**
 * Fails the run with a specific, actionable message when the seeded world
 * the journeys need is not present, instead of letting an assertion deep
 * inside a journey fail as if the product were broken.
 */
export async function requireSeed(request: APIRequestContext): Promise<{
  academyId: string;
  owner: Session;
}> {
  const academy = await resolveAcademy(request);
  const owner = await apiSignIn(request, {
    email: SEED.owner,
    password: SEED.password,
    surface: 'management',
  });
  return { academyId: academy.id, owner };
}

/** Finds a course of the academy by its exact title. */
export async function findCourseByTitle(
  request: APIRequestContext,
  session: Session,
  academyId: string,
  title: string
): Promise<{ id: string; title: string }> {
  const response = await apiGet(request, session, `/academies/${academyId}/courses`, {
    pageSize: '100',
  });
  expect(response.ok(), `could not list courses: ${response.status()}`).toBeTruthy();
  const json = await response.json();
  const items: { id: string; title: string }[] = json.items ?? json;
  const course = items.find((item) => item.title === title);
  expect(
    course,
    `the seeded course "${title}" is missing from ${SEED.academyName}. Re-run the backend seed.`
  ).toBeTruthy();
  return course!;
}

/**
 * Registers a learner through the academy website's own sign-up FORM —
 * the journey step "learner created through academy website". Deliberately
 * the real form and not an API call: registration atomicity and the
 * academy binding are properties of that page.
 */
export async function registerLearnerThroughWebsite(
  page: Page,
  email: string,
  name = 'Playwright Learner'
): Promise<void> {
  await page.goto(academyPath('/sign-up'));
  await page.locator('#name').fill(name);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(LEARNER_PASSWORD);
  await page.locator('#confirmPassword').fill(LEARNER_PASSWORD);

  const terms = page.locator('#acceptTerms');
  if (await terms.count()) {
    await terms.check();
  }
  await page.getByRole('button', { name: /sign up|create account|register/i }).click();
}

/** Clears any session this browser context holds, so the next step starts signed out. */
export async function signOutInBrowser(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

/** Dismisses the cookie banner with the most privacy-preserving option, when it is showing. */
export async function declineCookies(page: Page): Promise<void> {
  const reject = page.getByRole('button', { name: /reject optional/i });
  if (await reject.count()) {
    await reject.first().click({ timeout: 5_000 }).catch(() => undefined);
  }
}

/** Signs in through the management dashboard's own form. */
export async function signInThroughDashboard(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/auth/sign-in');
  await declineCookies(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}
