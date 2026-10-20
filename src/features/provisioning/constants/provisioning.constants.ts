/**
 * Provisioning constants.
 *
 * Configuration values only — never a business rule encoded as a magic
 * number scattered across pages (the same discipline Prompt 6/7 already
 * established for their own constants files).
 */
import type { ProvisioningStepKey } from '@types';

/** Subdomain length bounds. Mirrors Academy's own slug length convention (`MAX_ACADEMY_SLUG_LENGTH`), kept as a local constant since a subdomain and an Academy slug are related-but-distinct concepts (a subdomain is globally unique across all of Atlas; a slug is scoped to its academy record). */
export const MIN_SUBDOMAIN_LENGTH = 3;
export const MAX_SUBDOMAIN_LENGTH = 50;

/** Lowercase letters, numbers, hyphens — the same shape Academy's own slug validation uses. */
export const SUBDOMAIN_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Labels Atlas itself needs, or that read as an Atlas service, that a
 * customer must never be assigned (LB-RESERVED plus the help center's
 * `docs`, `doc` and `help` hosts, DL-57). A copy of the backend's
 * `RESERVED_SUBDOMAINS` (atlas-backend
 * `src/provisioning/dto/provisioning.constants.ts`), which also feeds the
 * database guard: the backend is the authority, this copy keeps the SPA
 * from treating a platform host as an academy. Use `isReservedSubdomain`,
 * which also refuses look-alikes.
 */
export const RESERVED_SUBDOMAINS: readonly string[] = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'platform',
  'atlas',
  'mail',
  'status',
  'support',
  // Help center and content hosts.
  'docs',
  'doc',
  'help',
  'blog',
  'learn',
  'kb',
  'faq',
  'wiki',
  // Live infrastructure records and probes.
  'video',
  'ssh',
  'cdn',
  'static',
  'assets',
  'media',
  'files',
  // Sign-in, accounts and money.
  'auth',
  'login',
  'signin',
  'signup',
  'register',
  'account',
  'accounts',
  'billing',
  'pay',
  'payment',
  'payments',
  'checkout',
  'sso',
  'oauth',
  'id',
  'identity',
  'secure',
  'security',
  'verify',
  // Mail and DNS.
  'email',
  'webmail',
  'smtp',
  'imap',
  'pop',
  'mx',
  'ns1',
  'ns2',
  'ftp',
  // Environments and operations.
  'dev',
  'staging',
  'test',
  'preview',
  'sandbox',
  'demo',
  'internal',
  'system',
  'root',
  'origin',
  'metrics',
  'health',
  // Roles and tenancy words.
  'owner',
  'manage',
  'management',
  'academy',
  'org',
  'organization',
];

/**
 * Words that, alone or joined only with each other, digits and
 * `SUBDOMAIN_FILLER_WORDS`, make a label read as an Atlas service
 * (`help-center`, `docs2`, `apidocs`, `support-desk`). Generic teaching
 * words (`learn`, `academy`, `demo`, …) are reserved exactly but are not
 * here, so `learn-english` and `math-academy` stay available.
 */
export const PLATFORM_LOOKALIKE_WORDS: readonly string[] = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'platform',
  'mail',
  'webmail',
  'email',
  'status',
  'support',
  'docs',
  'doc',
  'help',
  'blog',
  'kb',
  'faq',
  'wiki',
  'video',
  'ssh',
  'cdn',
  'static',
  'assets',
  'media',
  'files',
  'auth',
  'login',
  'signin',
  'signup',
  'register',
  'account',
  'accounts',
  'billing',
  'pay',
  'payment',
  'payments',
  'checkout',
  'sso',
  'oauth',
  'identity',
  'secure',
  'security',
  'verify',
  'staging',
  'preview',
  'sandbox',
  'internal',
  'system',
  'root',
  'origin',
];

/** Words that add nothing to a look-alike (`help` + `center`). */
export const SUBDOMAIN_FILLER_WORDS: readonly string[] = [
  'center',
  'centre',
  'central',
  'portal',
  'desk',
  'hub',
  'page',
  'pages',
  'site',
  'web',
  'official',
  'team',
  'panel',
  'home',
  'online',
  'info',
  'main',
  'service',
  'services',
  'my',
  'the',
  'get',
  'go',
  'net',
  'cloud',
];

/** Digit look-alikes (`d0cs`, `he1p`, `4tlas`). */
const LOOKALIKE_DIGITS: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
};

const LOOKALIKE_SET = new Set(PLATFORM_LOOKALIKE_WORDS);
const FILLER_SET = new Set(SUBDOMAIN_FILLER_WORDS);
const RESERVED_SET = new Set(RESERVED_SUBDOMAINS);

/** Can `text` be split entirely into look-alike words, fillers and digit runs, with at least one look-alike word? */
function readsAsPlatformService(text: string): boolean {
  // best[i]: 0 = no split of text[0..i), 1 = split without a look-alike word, 2 = with one.
  const best: number[] = new Array(text.length + 1).fill(0);
  best[0] = 1;
  for (let end = 1; end <= text.length; end += 1) {
    for (let start = 0; start < end; start += 1) {
      if (best[start] === 0) continue;
      const piece = text.slice(start, end);
      let found = 0;
      if (LOOKALIKE_SET.has(piece)) found = 2;
      else if (FILLER_SET.has(piece) || /^[0-9]+$/.test(piece)) found = 1;
      if (found) best[end] = Math.max(best[end], found === 2 ? 2 : best[start]);
    }
  }
  return best[text.length] === 2;
}

/**
 * Whether a subdomain label is unavailable to customers: reserved exactly,
 * contains the Atlas name or starts with `admin` (impersonation, also with
 * digit look-alikes and hyphens removed), or reads as an Atlas service.
 */
export function isReservedSubdomain(rawLabel: string): boolean {
  const label = rawLabel.trim().toLowerCase();
  if (RESERVED_SET.has(label)) return true;
  const joined = label.replace(/-/g, '');
  const spelled = joined.replace(/[0-9]/g, (d) => LOOKALIKE_DIGITS[d] ?? d);
  // `1` stands for `l` and for `i` (`adm1n`).
  const spelledI = joined.replace(/[0-9]/g, (d) =>
    d === '1' ? 'i' : (LOOKALIKE_DIGITS[d] ?? d)
  );
  for (const form of [joined, spelled, spelledI]) {
    if (form.includes('atlas') || form.startsWith('admin')) return true;
    if (RESERVED_SET.has(form)) return true;
  }
  return readsAsPlatformService(joined) || readsAsPlatformService(spelled);
}

/**
 * How often `useProvisioningRequest` re-checks a non-terminal request's
 * status while its page is open. A UX convenience only, matching Prompt
 * 7's `PAYMENT_STATUS_POLL_INTERVAL_MS` precedent — never a substitute for
 * a real progress-push mechanism a future backend might add.
 *
 * W2 — adaptive: a whole run takes a few seconds, so the first
 * `PROVISIONING_FAST_POLL_WINDOW_MS` after the page starts watching poll
 * every `PROVISIONING_FAST_POLL_INTERVAL_MS` (what the person waits for is
 * real work, not the poll interval); after that, every
 * `PROVISIONING_STATUS_POLL_INTERVAL_MS`. Polling stops at a terminal state.
 */
export const PROVISIONING_STATUS_POLL_INTERVAL_MS = 4000;
export const PROVISIONING_FAST_POLL_INTERVAL_MS = 1000;
export const PROVISIONING_FAST_POLL_WINDOW_MS = 30_000;

/** The interval for a request watched for `elapsedMs` so far. */
export function provisioningPollInterval(elapsedMs: number): number {
  return elapsedMs < PROVISIONING_FAST_POLL_WINDOW_MS
    ? PROVISIONING_FAST_POLL_INTERVAL_MS
    : PROVISIONING_STATUS_POLL_INTERVAL_MS;
}

/** W2 — the stages shown to a person, in order (see `deriveProvisioningStages`). */
export const PROVISIONING_STAGE_KEYS = [
  'academy',
  'website',
  'brand',
  'ready',
] as const;

/** Every provisioning step, in display order. */
export const PROVISIONING_STEP_KEYS: readonly ProvisioningStepKey[] = [
  'tenant',
  'academy',
  'theme',
  'branding',
  'subdomain',
  'domain',
  'finalization',
];
