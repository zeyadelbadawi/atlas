// Shared helpers for the Help Center demo seed. LOCAL STACK ONLY: every URL
// is checked to point at this machine before anything is sent.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ATLAS_DIR = path.resolve(HERE, '../../..');
export const STATE_FILE = path.join(HERE, 'state.json');
export const ASSETS = path.join(HERE, '.generated');
mkdirSync(ASSETS, { recursive: true });

const API_PORT = process.env.DOCS_API_PORT ?? '3100';
export const API = process.env.DOCS_API_URL ?? `http://127.0.0.1:${API_PORT}/api/v1`;
export const REDIS_URL = process.env.DOCS_REDIS_URL ?? 'redis://127.0.0.1:6379/7';
const PG = {
  host: process.env.DOCS_PG_HOST ?? 'localhost',
  port: process.env.DOCS_PG_PORT ?? '5432',
  user: process.env.DOCS_PG_ADMIN_USER ?? 'atlas',
  password: process.env.DOCS_PG_ADMIN_PASSWORD ?? 'atlas_ci_password',
  database: process.env.DOCS_DB_NAME ?? 'atlas_docs',
};

/** Production guard: refuse anything that is not this machine. */
export function assertLocal(url) {
  const host = new URL(url.replace(/^redis:/, 'http:').replace(/^postgresql:/, 'http:')).hostname;
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) {
    throw new Error(`REFUSING: ${url} does not point at this machine.`);
  }
}
assertLocal(API);
assertLocal(REDIS_URL);
assertLocal(`postgresql://${PG.host}:${PG.port}/`);
if (/^(atlas_ci|atlas_e2e|postgres$|template)/.test(PG.database)) {
  throw new Error(`REFUSING: database ${PG.database} belongs to other local work.`);
}

export const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
export function save() {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

export function log(...args) {
  console.log('  ', ...args);
}

/** Clears the local API's auth rate-limit and throttle counters (demo Redis database only). */
export function clearLimits() {
  const keys = [];
  for (const pattern of ['ratelimit:*', '*:hits', '*:blocked']) {
    const out = execFileSync('redis-cli', ['-u', REDIS_URL, '--scan', '--pattern', pattern]).toString().trim();
    if (out) keys.push(...out.split('\n'));
  }
  const unique = [...new Set(keys)].filter((k) => !k.startsWith('bull:'));
  for (let i = 0; i < unique.length; i += 200) {
    execFileSync('redis-cli', ['-u', REDIS_URL, 'del', ...unique.slice(i, i + 200)]);
  }
}

/**
 * Direct SQL on the LOCAL demo database. Used only where the API cannot
 * express a demo fact (a verified mailbox, a backdated timestamp); every
 * call site says why.
 */
export function psql(sql) {
  return execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    env: {
      ...process.env,
      PGHOST: PG.host,
      PGPORT: PG.port,
      PGUSER: PG.user,
      PGPASSWORD: PG.password,
      PGDATABASE: PG.database,
    },
  })
    .toString()
    .trim();
}
export const sqlText = (s) => `'${String(s).replace(/'/g, "''")}'`;

export async function call(method, urlPath, { token, body, ok = true, headers = {} } = {}) {
  const res = await fetch(API + urlPath, {
    method,
    headers: {
      'content-type': 'application/json',
      'accept-language': 'en',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (ok && !res.ok) throw new Error(`${method} ${urlPath} → ${res.status}: ${text.slice(0, 800)}`);
  return { status: res.status, json };
}

/** Like `call`, but logs (instead of throwing) when the API refuses: optional demo facts. */
export async function attempt(label, method, urlPath, opts = {}) {
  const r = await call(method, urlPath, { ...opts, ok: false });
  if (r.status >= 300) log(`WARN ${label}: ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
  return r;
}

const sessions = new Map();
export async function signIn(email, password, extra = { surface: 'management' }) {
  const key = email + JSON.stringify(extra);
  const cached = sessions.get(key);
  if (cached && Date.now() - cached.at < 8 * 60 * 1000) return cached;
  clearLimits();
  const { json } = await call('POST', '/auth/sign-in', { body: { email, password, ...extra } });
  if (!json?.accessToken) throw new Error(`sign-in for ${email} returned no token: ${JSON.stringify(json).slice(0, 300)}`);
  const s = { token: json.accessToken, userId: json.user?.id, at: Date.now() };
  sessions.set(key, s);
  return s;
}

export function asset(file) {
  return path.join(ASSETS, file);
}
export function dataUrl(file, mime) {
  return `data:${mime};base64,${readFileSync(asset(file)).toString('base64')}`;
}
export function fileSize(file) {
  return readFileSync(asset(file)).length;
}

/** A stable UUID (v4 layout) derived from a name: deterministic idempotency keys. */
export function stableUuid(name) {
  const h = createHash('sha256').update(name).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Marks a mailbox verified: the local stand-in for clicking the emailed link (stub email provider). */
export function verifyMailbox(email) {
  psql(`update users set email_verified_at = coalesce(email_verified_at, now()) where lower(email) = lower(${sqlText(email)})`);
}

export function list(json) {
  return Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);
}
