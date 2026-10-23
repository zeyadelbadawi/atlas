#!/usr/bin/env node
/**
 * B0-OPS-09 — external uptime probe, run every 10 minutes by
 * `.github/workflows/uptime.yml` (this repository is public, so its Actions
 * minutes are free; no third-party service, no secret: the workflow's own
 * GITHUB_TOKEN manages one issue).
 *
 * Checks, from outside (through Cloudflare and Caddy, the way a visitor
 * arrives): the marketing home, the dashboard host, the help center, the
 * public price list, the backend's public health route and the demo
 * academy the marketing site links to. Each check has a timeout and one
 * retry, so a single dropped request is not an outage. Each host's TLS
 * certificate is read too; one expiring within 14 days is a warning.
 *
 * Reporting, without spam:
 *   - problems found and no open `uptime` issue → open one (GitHub emails
 *     the repository owner);
 *   - an open issue and the SET of problems changed → one comment;
 *   - an open issue and the same problems → nothing (the job summary has
 *     the run's detail);
 *   - an open issue and no problems → a recovery comment, then close it.
 * The set is compared through a signature kept in a hidden marker in the
 * issue body, so latency or wording differences never trigger a comment.
 *
 * Usage: node scripts/uptime/probe.mjs            (probe + report)
 *        UPTIME_DRY_RUN=1 node scripts/uptime/probe.mjs   (probe only)
 */
import tls from 'node:tls';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const TARGETS = [
  { id: 'marketing', url: 'https://atlass.dpdns.org/', expect: 'html' },
  {
    id: 'dashboard',
    url: 'https://dashboard.atlass.dpdns.org/',
    expect: 'html',
  },
  { id: 'help-center', url: 'https://docs.atlass.dpdns.org/', expect: 'html' },
  {
    id: 'plans-api',
    url: 'https://atlass.dpdns.org/api/v1/public/plans',
    expect: 'json-array',
  },
  {
    id: 'health',
    url: 'https://atlass.dpdns.org/api/v1/public/health',
    expect: 'health',
  },
  // The demo academy the marketing site links to (`DEMO_ACADEMY_HOST`).
  {
    id: 'demo-academy',
    url: 'https://al-nour.atlass.dpdns.org/',
    expect: 'html',
  },
];

export const LABEL = 'uptime';
export const TITLE = 'Uptime: Atlas is not answering correctly';
const TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 10_000;
export const CERT_WARN_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const MARKER = /<!-- uptime-signature: (.*?) -->/;

/** Whether a response is what the target should answer; `null` = fine. */
export function judge(target, status, contentType, body) {
  if (status !== 200) return `HTTP ${status}`;
  if (target.expect === 'html') {
    return /text\/html/i.test(contentType)
      ? null
      : `unexpected content type ${contentType || 'none'}`;
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return 'response is not JSON';
  }
  if (target.expect === 'json-array') {
    return Array.isArray(parsed) && parsed.length > 0
      ? null
      : 'empty or malformed plan list';
  }
  if (target.expect === 'health') {
    return parsed && parsed.status === 'ok' ? null : 'health status is not ok';
  }
  return null;
}

async function fetchOnce(target, fetchImpl) {
  try {
    const response = await fetchImpl(target.url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': 'atlas-uptime-probe (+github actions)',
        accept: '*/*',
      },
    });
    const body = await response.text();
    return judge(
      target,
      response.status,
      response.headers.get('content-type') ?? '',
      body
    );
  } catch (error) {
    const name =
      error && typeof error === 'object' && 'name' in error ? error.name : '';
    return name === 'TimeoutError'
      ? `no answer within ${TIMEOUT_MS / 1000} s`
      : 'connection failed';
  }
}

/** One retry after a pause: a single dropped request is not an outage. */
export async function checkTarget(
  target,
  { fetchImpl = fetch, sleep = defaultSleep } = {}
) {
  const first = await fetchOnce(target, fetchImpl);
  if (first === null) return null;
  await sleep(RETRY_DELAY_MS);
  return fetchOnce(target, fetchImpl);
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The certificate's `valid_to`, or null when the handshake fails. */
export function certificateExpiry(host) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, timeout: TIMEOUT_MS },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        resolve(cert && cert.valid_to ? new Date(cert.valid_to) : null);
      }
    );
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
    socket.on('error', () => resolve(null));
  });
}

/** A certificate problem, or null. Days are whole days, rounded down. */
export function judgeCertificate(validTo, now) {
  if (!validTo) return null; // an unreachable host already fails its page check
  const days = Math.floor((validTo.getTime() - now.getTime()) / DAY_MS);
  if (days < 0) return 'TLS certificate has expired';
  if (days < CERT_WARN_DAYS) return `TLS certificate expires in ${days} day(s)`;
  return null;
}

/** Stable identity of a set of problems (order and wording of detail ignored). */
export function signatureOf(problems) {
  return problems
    .map((p) => `${p.id}:${p.kind}`)
    .sort()
    .join(',');
}

/**
 * What to do with the issue tracker.
 * @returns {'none'|'open'|'comment'|'close'}
 */
export function decide(openIssue, problems) {
  const signature = signatureOf(problems);
  if (!openIssue) return problems.length > 0 ? 'open' : 'none';
  if (problems.length === 0) return 'close';
  const previous = MARKER.exec(openIssue.body ?? '')?.[1] ?? '';
  return previous === signature ? 'none' : 'comment';
}

export function renderStatus(problems, now) {
  const lines = problems.map((p) => `- **${p.id}** (${p.url}): ${p.detail}`);
  return [
    `Checked at ${now.toISOString()} from GitHub Actions.`,
    '',
    ...lines,
    '',
    `<!-- uptime-signature: ${signatureOf(problems)} -->`,
  ].join('\n');
}

async function github(path, init = {}) {
  const repo = process.env.GITHUB_REPOSITORY;
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  if (!response.ok && response.status !== 422) {
    throw new Error(
      `GitHub API ${init.method ?? 'GET'} ${path}: HTTP ${response.status}`
    );
  }
  return response.status === 204 ? null : response.json();
}

async function report(problems, now) {
  const open = await github(`/issues?labels=${LABEL}&state=open&per_page=1`);
  const issue = Array.isArray(open) && open.length > 0 ? open[0] : null;
  const action = decide(issue, problems);
  const status = renderStatus(problems, now);
  if (action === 'open') {
    await github('/labels', {
      method: 'POST',
      body: JSON.stringify({
        name: LABEL,
        color: 'B42318',
        description: 'External uptime probe',
      }),
    }); // 422 = already exists
    await github('/issues', {
      method: 'POST',
      body: JSON.stringify({ title: TITLE, labels: [LABEL], body: status }),
    });
  } else if (action === 'comment') {
    await github(`/issues/${issue.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: `The problems changed.\n\n${status}` }),
    });
    await github(`/issues/${issue.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: status }),
    });
  } else if (action === 'close') {
    await github(`/issues/${issue.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body: `Recovered: every check passed at ${now.toISOString()}.`,
      }),
    });
    await github(`/issues/${issue.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
    });
  }
  return action;
}

async function main() {
  const now = new Date();
  const problems = [];
  await Promise.all(
    TARGETS.map(async (target) => {
      const detail = await checkTarget(target);
      if (detail)
        problems.push({ id: target.id, url: target.url, kind: 'down', detail });
    })
  );
  const hosts = [...new Set(TARGETS.map((t) => new URL(t.url).hostname))];
  await Promise.all(
    hosts.map(async (host) => {
      const detail = judgeCertificate(await certificateExpiry(host), now);
      if (detail)
        problems.push({
          id: host,
          url: `https://${host}/`,
          kind: 'cert',
          detail,
        });
    })
  );

  const summary = [
    '## Uptime probe',
    '',
    ...TARGETS.map((t) => {
      const p = problems.find((x) => x.id === t.id);
      return `- ${p ? 'FAIL' : 'ok'} ${t.id} ${t.url}${p ? ` (${p.detail})` : ''}`;
    }),
    ...problems
      .filter((p) => p.kind === 'cert')
      .map((p) => `- WARN ${p.id}: ${p.detail}`),
  ].join('\n');
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);

  if (process.env.UPTIME_DRY_RUN === '1') return;
  const action = await report(problems, now);
  console.log(`issue action: ${action}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
