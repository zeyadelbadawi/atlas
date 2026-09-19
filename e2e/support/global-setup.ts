/**
 * Playwright global setup — clears the auth rate-limiter before a run.
 *
 * Sign-in is limited to 10 attempts per IP per 15 minutes, which is a real
 * protection and must stay exactly as it is. Two journeys that each drive
 * several real sign-ins from one machine exhaust that budget within a
 * single run, and a second run inside the window would start already
 * blocked — so the suite would report authorization failures that are
 * really its own rate-limit noise.
 *
 * The backend's own Jest e2e suites solve this the same way, with a
 * `flushRateLimitKeys` helper. This is that helper for Playwright: it
 * removes only the `ratelimit:*` keys, touches nothing else in Redis, and
 * is a no-op outside a local Docker environment.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);

// This package is an ES module, so the directory is derived from the
// module URL rather than `__dirname`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR =
  process.env.E2E_BACKEND_DIR ?? path.resolve(HERE, '../../../atlas-backend');

/**
 * Removes the auth rate-limiter's keys. Exported so each journey can call
 * it in its own `beforeAll` as well: the limiter's budget is 10 sign-ins
 * per IP per 15 minutes, and two journeys that each drive several real
 * sign-ins exhaust it inside one run, so flushing once per RUN is not
 * enough — the second file would fail on rate limiting rather than on
 * anything it asserts.
 */
export async function clearAuthRateLimits(): Promise<void> {
  if (process.env.E2E_SKIP_RATE_LIMIT_FLUSH === 'true') return;

  try {
    const { stdout } = await run(
      'docker',
      ['compose', 'exec', '-T', 'redis', 'redis-cli', '--scan', '--pattern', 'ratelimit:*'],
      { cwd: BACKEND_DIR },
    );
    const keys = stdout.split('\n').map((key) => key.trim()).filter(Boolean);
    if (keys.length === 0) return;

    await run('docker', ['compose', 'exec', '-T', 'redis', 'redis-cli', 'del', ...keys], {
      cwd: BACKEND_DIR,
    });
    console.log(`[e2e] cleared ${keys.length} auth rate-limit keys before the run`);
  } catch (error) {
    // Never fail the run for this. If the keys cannot be cleared the
    // journeys still work from a cold limiter; they only become fragile
    // on a rapid re-run, and the message says so.
    console.warn(
      `[e2e] could not clear auth rate-limit keys (${
        error instanceof Error ? error.message : String(error)
      }). A rapid re-run may hit the sign-in limiter.`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  await clearAuthRateLimits();
}
