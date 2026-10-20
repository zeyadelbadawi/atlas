// The academy's manual payment methods (fake details), and its staff: a
// manager and an instructor who accepted their invitation, plus one
// invitation that is still pending.
import { createHash, randomBytes } from 'node:crypto';
import { state, save, call, attempt, signIn, psql, sqlText, log, clearLimits } from '../lib.mjs';
import { OWNER, PASSWORD, PAYMENT_METHODS, MANAGER, INSTRUCTOR, INVITED } from '../data.mjs';

/**
 * Accepting an invitation = opening the emailed setup link and choosing a
 * password. The stub email provider keeps that link in memory only, so the
 * seed issues its own setup token for the invited account (direct SQL: the
 * same hashed row `AccountSetupService.sendInvite` writes) and redeems it
 * through the real endpoint the link opens.
 */
async function acceptInvitation(email) {
  const raw = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  psql(`insert into password_reset_tokens (id, user_id, token_hash, expires_at)
        select gen_random_uuid(), id, ${sqlText(hash)}, now() + interval '1 day' from users where lower(email) = lower(${sqlText(email)})`);
  clearLimits();
  await call('POST', '/auth/password-reset/confirm', { body: { token: raw, newPassword: PASSWORD } });
  // Proving the mailbox is what the setup link does too; recorded for the demo account.
  psql(`update users set email_verified_at = coalesce(email_verified_at, now()) where lower(email) = lower(${sqlText(email)})`);
}

export default async function run() {
  const A = state.academyId;
  let owner = await signIn(OWNER.email, PASSWORD);

  for (const [segment, body] of Object.entries(PAYMENT_METHODS)) {
    await attempt(`payment method ${segment}`, 'PUT', `/academies/${A}/payment-methods/${segment}`, { token: owner.token, body });
  }

  state.staff ??= {};
  const add = async (key, person, role) => {
    if (state.staff[key]?.userId) return;
    owner = await signIn(OWNER.email, PASSWORD);
    const r = await call('POST', `/academies/${A}/${role === 'manager' ? 'members' : 'instructors'}`, {
      token: owner.token,
      body: { email: person.email, name: person.name.en },
    });
    const userId = r.json?.userId ?? r.json?.member?.userId ?? r.json?.user?.id;
    state.staff[key] = { userId: userId ?? null, email: person.email, role, outcome: r.json?.outcome };
    save();
    log(`staff ${key}: ${role} ${r.json?.outcome ?? ''}`);
  };
  await add('manager', MANAGER, 'manager');
  await add('instructor', INSTRUCTOR, 'instructor');
  await add('invited', INVITED, 'instructor');

  for (const key of ['manager', 'instructor']) {
    if (state.staff[key].accepted) continue;
    await acceptInvitation(state.staff[key].email);
    const s = await signIn(state.staff[key].email, PASSWORD);
    state.staff[key].userId = s.userId;
    state.staff[key].accepted = true;
    save();
  }
  state.managerId = state.staff.manager.userId;
  state.instructorId = state.staff.instructor.userId;
  state.invitedStaffId = state.staff.invited.userId;
  save();

  const members = (await call('GET', `/academies/${A}/members`, { token: owner.token })).json;
  log('members', JSON.stringify(members).slice(0, 300));
}
