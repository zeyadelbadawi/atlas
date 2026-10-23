// B2 — turns the demo organization's Founding Academy membership on or off,
// for the two founding screenshots only (DOC-BIL-010):
//
//   node scripts/docs/seed/founding.mjs on
//   pnpm docs:capture -- --only billing/founding-
//   node scripts/docs/seed/founding.mjs off
//
// It stays OFF otherwise: with it on, every subscription and checkout shot
// would show a notice only 20 real customers ever see. Memberships belong to
// the Platform Owner (`POST /platform-founding-academies`, PlatformOwnerGuard)
// and the demo's only platform owner is the system account 00-platform
// inserts, which is never signed in to. Direct SQL, local demo database
// only: the row that POST creates (seat 1, the plan the organization is on,
// its yearly catalog price, a 24-month window from today), minus its audit
// row.
import { pathToFileURL } from 'node:url';
import { state, psql, sqlText as q, log } from './lib.mjs';

export function setFounding(mode) {
  if (!['on', 'off'].includes(mode)) throw new Error('usage: founding.mjs on|off');
  const org = q(state.organizationId);
  psql(`delete from founding_memberships where organization_id = ${org}`);
  if (mode === 'off') return log('founding membership: off');
  psql(`insert into founding_memberships (id, organization_id, seat_number, plan_id, locked_amount, locked_currency,
          lock_starts_at, lock_ends_at, status, created_by_user_id, updated_by_user_id, updated_at)
        select gen_random_uuid()::text, ${org}, 1, p.id,
               coalesce((p.pricing->>'yearlyAmount')::numeric, (p.pricing->>'amount')::numeric),
               p.pricing->>'currency',
               date_trunc('day', now()), date_trunc('day', now()) + interval '24 months', 'active',
               u.id, u.id, now()
          from plans p, users u
         where p.key = ${q(state.planKey)} and u.email = 'platform.system@example.com'`);
  log('founding membership: on');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  setFounding(process.argv[2]);
}
