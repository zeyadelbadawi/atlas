/**
 * J44 — device identity and the device-limit dialog, Chromium against the
 * real stack (`VITE_DEV_PROXY_HOST=<academy slug>`).
 *
 * The defect this guards (proven with this journey before the fix): with a
 * limit of 2, a learner signs in on browsers A and B, then on C. C was
 * given no device identity at the limit; removing a device from the
 * limit dialog freed a slot, the refetched grant registered a row whose
 * cookie C never received ("New device added"), and the dialog's own retry
 * was refused with `deviceLimit` again — the dialog "did nothing".
 *
 * Now:
 *   1. A and B each register one device; C signs in at the limit and IS
 *      given an identity cookie, but registers nothing;
 *   2. C opens a lesson → 403 `deviceLimit` → the dialog lists 2 devices;
 *   3. C removes one → exactly one follow-up grant, 200; the dialog closes
 *      and the lesson plays; C is ONE new device (one announcement);
 *   4. a reload of C is the same device (nothing new registered).
 * The academy's device policy and the temporary lesson body are restored.
 */
import { expect, test, type Page } from '@playwright/test';
import { adminQuery, adminSql } from './support/admin-db';
import {
  academyPath,
  ACADEMY_SLUG,
  declineCookies,
  LEARNER_PASSWORD,
  registerLearnerThroughWebsite,
  uniqueLearnerEmail,
} from './support/atlas';

const REGISTERED_TITLE = 'notifications:events.deviceRegistered.title';

test('J44 device-limit dialog: removing a device lets this browser continue as one device', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const email = uniqueLearnerEmail('j44');
  const [{ id: academyId }] = await adminQuery<{ id: string }>(
    `select id from academies where slug = :'s'`,
    { s: ACADEMY_SLUG }
  );
  const [lesson] = await adminQuery<{ course_id: string; lesson_id: string }>(
    `select c.id as course_id, l.id as lesson_id
       from courses c join course_lessons l on l.course_id = c.id
      where c.academy_id = :'a' and c.status = 'published' and l.status = 'published'
        and coalesce(l.is_preview, false) = false
      order by c.created_at, l."order" limit 1`,
    { a: academyId }
  );
  const previousPolicy = await adminQuery<{ max_devices: number }>(
    `select max_devices from access_policies where scope = 'academy' and academy_id = :'a'`,
    { a: academyId }
  );
  if (previousPolicy.length) {
    await adminSql(
      `update access_policies set max_devices = 2 where scope = 'academy' and academy_id = :'a'`,
      { a: academyId }
    );
  } else {
    await adminSql(
      `insert into access_policies (id, scope, academy_id, max_devices, max_concurrent_sessions, updated_at)
       values (gen_random_uuid(), 'academy', :'a', 2, 1, now())`,
      { a: academyId }
    );
  }
  // A body for the seed's first lesson (the seed ships it empty), removed after.
  await adminSql(
    `insert into lesson_contents (id, lesson_id, course_id, academy_id, kind, body_html, updated_at)
     values (gen_random_uuid(), :'l', :'c', :'a', 'text', '<p>j44</p>', now())`,
    { l: lesson.lesson_id, c: lesson.course_id, a: academyId }
  );

  const devices = async () => {
    const [row] = await adminQuery<{
      active: number;
      total: number;
      announced: number;
    }>(
      `select
         (select count(*) from student_devices d join users u on u.id = d.user_id
           where u.email = :'e' and d.revoked_at is null)::int as active,
         (select count(*) from student_devices d join users u on u.id = d.user_id
           where u.email = :'e')::int as total,
         (select count(*) from notifications n join users u on u.id = n.user_id
           where u.email = :'e' and n.title_key = :'t')::int as announced`,
      { e: email, t: REGISTERED_TITLE }
    );
    return row;
  };
  const signIn = async (page: Page) => {
    await page.goto(academyPath('/sign-in'));
    await declineCookies(page);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    const signedIn = page.waitForResponse((r) =>
      r.url().endsWith('/api/v1/auth/sign-in')
    );
    await page.getByRole('button', { name: /sign in/i }).click();
    const response = await signedIn;
    await expect(page).toHaveURL(/\/my/, { timeout: 30_000 });
    return (await response.allHeaders())['set-cookie'] ?? '';
  };

  try {
    // 1. Browsers A and B: one device each.
    const a = await (await browser.newContext()).newPage();
    await registerLearnerThroughWebsite(a, email);
    await a.waitForTimeout(2_000);
    expect(await signIn(a)).toContain('atlas_device=');
    const [{ id: userId }] = await adminQuery<{ id: string }>(
      `select id from users where email = :'e'`,
      { e: email }
    );
    await adminSql(
      `insert into enrollments (id, student_id, course_id, academy_id, status, enrolled_at, updated_at)
       values (gen_random_uuid(), :'u', :'c', :'a', 'enrolled', now(), now())`,
      { u: userId, c: lesson.course_id, a: academyId }
    );
    const b = await (await browser.newContext()).newPage();
    expect(await signIn(b)).toContain('atlas_device=');
    expect(await devices()).toEqual({ active: 2, total: 2, announced: 2 });

    // C at the limit: given an identity, nothing registered.
    const c = await (await browser.newContext()).newPage();
    expect(await signIn(c)).toContain('atlas_device=');
    expect(await devices()).toEqual({ active: 2, total: 2, announced: 2 });

    // 2. The lesson is refused and the dialog lists both devices.
    const grants: number[] = [];
    c.on('response', (r) => {
      if (/\/lessons\/[^/]+\/content$/.test(new URL(r.url()).pathname))
        grants.push(r.status());
    });
    await c.goto(
      academyPath(`/my/courses/${lesson.course_id}/learn/${lesson.lesson_id}`)
    );
    const dialog = c.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    expect(grants).toEqual([403]);
    const remove = dialog.getByRole('button', {
      name: /remove|terminate|delete/i,
    });
    await expect(remove).toHaveCount(2);

    // 3. Remove one: one follow-up grant, granted; the dialog closes.
    const removed = c.waitForResponse(
      (r) =>
        r.request().method() === 'DELETE' &&
        /\/learning\/devices\//.test(r.url())
    );
    await remove.first().click();
    expect((await removed).status()).toBe(204);
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect.poll(() => grants.length, { timeout: 20_000 }).toBe(2);
    await c.waitForTimeout(1_500);
    expect(grants).toEqual([403, 200]);
    expect(await devices()).toEqual({ active: 2, total: 3, announced: 3 });

    // 4. A reload is the same device.
    await c.reload();
    await expect.poll(() => grants.length, { timeout: 20_000 }).toBe(3);
    expect(grants[2]).toBe(200);
    expect(await devices()).toEqual({ active: 2, total: 3, announced: 3 });
  } finally {
    await adminSql(
      `delete from lesson_contents where lesson_id = :'l' and body_html = '<p>j44</p>'`,
      { l: lesson.lesson_id }
    );
    if (previousPolicy.length) {
      await adminSql(
        `update access_policies set max_devices = :'m' where scope = 'academy' and academy_id = :'a'`,
        { a: academyId, m: String(previousPolicy[0].max_devices) }
      );
    } else {
      await adminSql(
        `delete from access_policies where scope = 'academy' and academy_id = :'a'`,
        {
          a: academyId,
        }
      );
    }
  }
});
