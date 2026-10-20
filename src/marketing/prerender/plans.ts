/**
 * The build-time catalog for the marketing pages (SPEC §C, DL-38).
 *
 * Prices, currencies and trial lengths come from `GET /api/v1/public/plans`
 * only. The build FETCHES the live catalog; if that fails the build fails —
 * unless `MARKETING_PLANS_ALLOW_SNAPSHOT=1` opts in to the committed
 * snapshot (`src/marketing/data/plans.snapshot.json`), which is for local
 * work and tests only. The Docker (deploy) build never sets it.
 */
import type { Plan } from '@/types/plan.types';

export const DEFAULT_PLANS_URL = 'https://atlass.dpdns.org/api/v1/public/plans';
export const DEFAULT_PLANS_TIMEOUT_MS = 15_000;

export type PlansSource = 'live' | 'snapshot';

export class MarketingPlansError extends Error {
  override readonly name = 'MarketingPlansError';
}

/**
 * Checks the response is a publishable catalog: a non-empty array of plans
 * with the fields the pages read, EGP only, no premium family (SPEC §G.2
 * C-12: render what the API returns, but fail loudly rather than publish
 * something the owner has ruled out).
 */
export function assertPublishablePlans(
  value: unknown
): asserts value is Plan[] {
  if (!Array.isArray(value)) {
    throw new MarketingPlansError('plans response is not an array');
  }
  if (value.length === 0) {
    throw new MarketingPlansError('plans response is empty');
  }
  value.forEach((plan: unknown, index) => {
    const where = `plans[${index}]`;
    if (!plan || typeof plan !== 'object') {
      throw new MarketingPlansError(`${where} is not an object`);
    }
    const record = plan as Partial<Plan>;
    for (const field of ['key', 'name', 'status'] as const) {
      if (typeof record[field] !== 'string' || !record[field]) {
        throw new MarketingPlansError(`${where}.${field} is missing`);
      }
    }
    if (typeof record.displayOrder !== 'number') {
      throw new MarketingPlansError(`${where}.displayOrder is missing`);
    }
    if (!record.limits || typeof record.limits !== 'object') {
      throw new MarketingPlansError(`${where}.limits is missing`);
    }
    const currency = record.pricing?.currency;
    if (currency !== undefined && currency !== 'EGP') {
      throw new MarketingPlansError(
        `${where} (${record.key}) is priced in ${currency}; the marketing site publishes EGP only`
      );
    }
    if (record.family === 'premium') {
      throw new MarketingPlansError(
        `${where} (${record.key}) is a premium-family plan, which the marketing site must not publish`
      );
    }
  });
}

/** `fetch failed` plus the network cause (`ENOTFOUND`, `ECONNREFUSED`…) when Node gives one. */
function describeCause(error: Error): string {
  const cause = (error as { cause?: { code?: unknown; message?: unknown } })
    .cause;
  const detail =
    typeof cause?.code === 'string'
      ? cause.code
      : typeof cause?.message === 'string'
        ? cause.message
        : '';
  return detail ? `${error.message}: ${detail}` : error.message;
}

type FetchLike = (
  url: string,
  init: { signal: AbortSignal; headers: Record<string, string> }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface LoadPlansOptions {
  readonly url?: string;
  readonly timeoutMs?: number;
  readonly allowSnapshot: boolean;
  /** Reads the committed snapshot (only called when the fetch failed and it is allowed). */
  readonly readSnapshot: () => unknown;
  readonly fetch: FetchLike;
}

export interface LoadedPlans {
  readonly plans: Plan[];
  readonly source: PlansSource;
  readonly url: string;
  /** Why the live fetch failed, when the snapshot was used. */
  readonly fetchError?: string;
}

/** `MARKETING_PLANS_ALLOW_SNAPSHOT` is on only for `1`/`true`/`yes`/`on`. */
export function snapshotAllowed(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((value ?? '').trim());
}

export async function loadPlans(
  options: LoadPlansOptions
): Promise<LoadedPlans> {
  const url = options.url || DEFAULT_PLANS_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_PLANS_TIMEOUT_MS;
  let fetchError: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await options.fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      assertPublishablePlans(body);
      return { plans: body, source: 'live', url };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    // An unpublishable LIVE catalog is never papered over by the snapshot.
    if (error instanceof MarketingPlansError) throw error;
    fetchError =
      error instanceof Error
        ? error.name === 'AbortError'
          ? `timed out after ${timeoutMs} ms`
          : describeCause(error)
        : String(error);
  }

  if (!options.allowSnapshot) {
    throw new MarketingPlansError(
      `could not fetch the plans catalog from ${url} (${fetchError}). ` +
        'The marketing build needs the live catalog (SPEC §C). For local work only, ' +
        'set MARKETING_PLANS_ALLOW_SNAPSHOT=1 to use src/marketing/data/plans.snapshot.json, ' +
        'or point MARKETING_PLANS_URL at a reachable API.'
    );
  }
  const snapshot = options.readSnapshot();
  assertPublishablePlans(snapshot);
  return { plans: snapshot, source: 'snapshot', url, fetchError };
}
