/**
 * A brand-new Organization owner, with their own organization on a Free
 * Trial of a real catalog plan, for journeys that CREATE Academies.
 *
 * Why not the seeded owner: the seeded organization's plan allows a fixed
 * number of Academies, and every run of a provisioning journey (and of some
 * backend suites sharing the database) adds more. Once the allowance is
 * used up, provisioning is refused and the journey fails for a reason that
 * has nothing to do with what it checks. A fresh organization per run
 * starts empty every time.
 *
 * Everything goes through the public API, exactly as a customer would:
 * register, create the organization, start the trial (owner-only,
 * server-checked). The trial plan defaults to Growth (5 Academies).
 */
import { expect, type APIRequestContext } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  apiGet,
  apiPost,
  apiSignIn,
  uniqueLearnerEmail,
  uniqueLearnerName,
  type Session,
} from './atlas';

export interface TrialOwner {
  readonly email: string;
  readonly password: string;
  /** A management-surface session that already carries the membership. */
  readonly session: Session;
  readonly organizationId: string;
}

export async function createTrialOrganizationOwner(
  request: APIRequestContext,
  label: string,
  planKey = 'growth'
): Promise<TrialOwner> {
  const email = uniqueLearnerEmail(`${label}-owner`);
  const password = LEARNER_PASSWORD;
  const registered = await request.post(`${API_BASE}/auth/register`, {
    data: { name: uniqueLearnerName(`${label} Owner`), email, password },
  });
  expect(registered.status(), await registered.text()).toBe(201);
  let session = await apiSignIn(request, {
    email,
    password,
    surface: 'management',
  });
  const created = await apiPost(request, session, '/organizations', {
    name: uniqueLearnerName(`${label} Org`),
  });
  expect(created.status(), await created.text()).toBe(201);
  const organizationId = (await created.json()).id as string;
  // A fresh token carries the new membership.
  session = await apiSignIn(request, {
    email,
    password,
    surface: 'management',
  });

  const plan = await apiGet(request, session, `/plans/${planKey}`);
  expect(plan.ok(), await plan.text()).toBeTruthy();
  const trial = await apiPost(
    request,
    session,
    `/organizations/${organizationId}/subscription/trial`,
    { confirm: true, planId: (await plan.json()).id }
  );
  expect(trial.status(), await trial.text()).toBe(200);
  expect((await trial.json()).started, `the ${planKey} trial started`).toBe(
    true
  );
  return { email, password, session, organizationId };
}
