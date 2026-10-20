// The platform's system account. Background jobs (notification delivery,
// academy messages, trial sweeps) run as "the first platform owner"; a
// fresh database has none, and no API creates one (it is bootstrapped by
// operators). Direct SQL, local demo database only. This account is never
// signed in to and never appears in a screenshot.
import { psql } from '../lib.mjs';

export default async function run() {
  psql(`insert into users (id, email, name, status, is_platform_owner, email_verified_at, updated_at)
        values (gen_random_uuid(), 'platform.system@example.com', 'Atlas Platform (demo)', 'active', true, now(), now())
        on conflict (email) do nothing`);
}
