/**
 * Admin database access for the journeys that need a fixture the product
 * has no API for (a course order with a payment awaiting review, an
 * expired email-verification link) or that must prove a row is really
 * gone (a deleted contact enquiry).
 *
 * The connection string is the disposable stack's ADMIN url (the role the
 * backend's own Jest e2e suites use through `createAdminPrisma`), taken
 * from `E2E_ADMIN_DATABASE_URL`, or else from `DATABASE_URL` in the stack's
 * env file (`E2E_BACKEND_ENV_FILE`, default `/tmp/atlas-e2e-stack/backend.env`).
 * It is never printed. Only a LOOPBACK database is accepted, so a journey
 * can never write to a shared or deployed one.
 *
 * Statements go through the `psql` client (no Node driver is installed in
 * this package). Values are passed as psql variables (`:'name'`), which
 * psql quotes itself, so fixture strings are never spliced into SQL.
 */
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ENV_FILE =
  process.env.E2E_BACKEND_ENV_FILE ?? '/tmp/atlas-e2e-stack/backend.env';

let cachedUrl: string | undefined;

function adminDatabaseUrl(): string {
  if (cachedUrl) return cachedUrl;
  let url = process.env.E2E_ADMIN_DATABASE_URL;
  if (!url) {
    const env = readFileSync(ENV_FILE, 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
    url = line?.slice('DATABASE_URL='.length).trim();
  }
  if (!url) {
    throw new Error(
      `No admin database URL: set E2E_ADMIN_DATABASE_URL or provide DATABASE_URL in ${ENV_FILE}.`
    );
  }
  const host = new URL(url).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error('The admin database must be a loopback database.');
  }
  cachedUrl = url;
  return url;
}

/**
 * Runs SQL as the admin role and returns psql's unaligned, tuples-only
 * output. `vars` become psql variables: reference them as `:'name'`.
 */
export async function adminSql(
  sql: string,
  vars: Record<string, string> = {}
): Promise<string> {
  const args = ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'];
  for (const [name, value] of Object.entries(vars)) {
    args.push('-v', `${name}=${value}`);
  }
  // The connection goes in PG* environment variables, never in argv: a
  // failed child process's error message repeats its command line, and
  // the URL carries the password.
  const url = new URL(adminDatabaseUrl());
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')),
  };
  // `-c` does not interpolate variables; stdin does.
  const child = run('psql', args, { env, maxBuffer: 10 * 1024 * 1024 });
  child.child.stdin?.end(sql);
  const { stdout } = await child;
  return stdout.trim();
}

/** Rows of a SELECT as objects (via `json_agg`). */
export async function adminQuery<T = Record<string, unknown>>(
  select: string,
  vars: Record<string, string> = {}
): Promise<T[]> {
  const out = await adminSql(
    `select coalesce(json_agg(t), '[]'::json) from (${select}) t;`,
    vars
  );
  return JSON.parse(out || '[]') as T[];
}
