/**
 * B0-OPS-09 — the external uptime probe (`scripts/uptime/probe.mjs`, run by
 * `.github/workflows/uptime.yml`): what counts as down, the certificate
 * warning, and the issue decisions that keep a long outage to one email
 * plus one per change.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Target {
  id: string;
  url: string;
  expect: string;
}
interface Problem {
  id: string;
  url: string;
  kind: string;
  detail: string;
}
interface ProbeModule {
  TARGETS: Target[];
  LABEL: string;
  judge: (
    t: Target,
    status: number,
    contentType: string,
    body: string
  ) => string | null;
  judgeCertificate: (validTo: Date | null, now: Date) => string | null;
  checkTarget: (
    t: Target,
    deps: {
      fetchImpl: (url: string) => Promise<Response>;
      sleep: (ms: number) => Promise<void>;
    }
  ) => Promise<string | null>;
  decide: (issue: { body?: string } | null, problems: Problem[]) => string;
  renderStatus: (problems: Problem[], now: Date) => string;
}

const probe = (await import(
  '../scripts/uptime/probe.mjs' as string
)) as ProbeModule;
const workflow = readFileSync(
  resolve(__dirname, '../.github/workflows/uptime.yml'),
  'utf-8'
);
const NOW = new Date('2026-10-23T12:00:00Z');
const target = (expect: string): Target => ({
  id: 'x',
  url: 'https://example.test/',
  expect,
});
const down = (id: string): Problem => ({
  id,
  url: `https://${id}/`,
  kind: 'down',
  detail: 'HTTP 502',
});

describe('uptime probe', () => {
  it('checks the six public surfaces, including the health route and the demo academy', () => {
    expect(probe.TARGETS.map((t) => t.url)).toEqual([
      'https://atlass.dpdns.org/',
      'https://dashboard.atlass.dpdns.org/',
      'https://docs.atlass.dpdns.org/',
      'https://atlass.dpdns.org/api/v1/public/plans',
      'https://atlass.dpdns.org/api/v1/public/health',
      'https://al-nour.atlass.dpdns.org/',
    ]);
  });

  it('judges each kind of answer', () => {
    expect(
      probe.judge(target('html'), 200, 'text/html; charset=utf-8', '<html>')
    ).toBeNull();
    expect(probe.judge(target('html'), 502, 'text/html', '')).toBe('HTTP 502');
    expect(probe.judge(target('html'), 301, 'text/html', '')).toBe('HTTP 301');
    expect(
      probe.judge(target('json-array'), 200, 'application/json', '[{"id":1}]')
    ).toBeNull();
    expect(
      probe.judge(target('json-array'), 200, 'application/json', '[]')
    ).not.toBeNull();
    expect(
      probe.judge(target('health'), 200, 'application/json', '{"status":"ok"}')
    ).toBeNull();
    expect(probe.judge(target('health'), 200, 'text/html', '<html>')).toBe(
      'response is not JSON'
    );
  });

  it('retries once, so one dropped request is not an outage', async () => {
    let calls = 0;
    const flaky = async () => {
      calls += 1;
      if (calls === 1) throw new Error('reset');
      return new Response('{"status":"ok"}', { status: 200 });
    };
    expect(
      await probe.checkTarget(target('health'), {
        fetchImpl: flaky,
        sleep: async () => {},
      })
    ).toBeNull();
    expect(calls).toBe(2);
    const dead = async () => new Response('', { status: 503 });
    expect(
      await probe.checkTarget(target('health'), {
        fetchImpl: dead,
        sleep: async () => {},
      })
    ).toBe('HTTP 503');
  });

  it('warns on a certificate expiring within 14 days', () => {
    const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000);
    expect(probe.judgeCertificate(inDays(60), NOW)).toBeNull();
    expect(probe.judgeCertificate(inDays(13.5), NOW)).toBe(
      'TLS certificate expires in 13 day(s)'
    );
    expect(probe.judgeCertificate(inDays(-1), NOW)).toBe(
      'TLS certificate has expired'
    );
    expect(probe.judgeCertificate(null, NOW)).toBeNull();
  });

  it('opens once, stays quiet while nothing changes, comments on a change, closes on recovery', () => {
    expect(probe.decide(null, [])).toBe('none');
    expect(probe.decide(null, [down('a')])).toBe('open');
    const issue = { body: probe.renderStatus([down('a'), down('b')], NOW) };
    // Same set, other order and later time: no comment, no email.
    expect(probe.decide(issue, [down('b'), down('a')])).toBe('none');
    expect(probe.decide(issue, [down('a')])).toBe('comment');
    expect(probe.decide(issue, [])).toBe('close');
  });

  it('runs every 10 minutes with only the permissions it needs and no secrets', () => {
    expect(workflow).toContain("cron: '*/10 * * * *'");
    expect(workflow).toMatch(
      /permissions:\n {2}contents: read\n {2}issues: write\n/
    );
    expect(workflow).not.toMatch(/secrets\./);
    expect(probe.LABEL).toBe('uptime');
  });
});
