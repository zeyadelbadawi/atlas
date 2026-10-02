/**
 * P6 — real-user monitoring in the browser: page templates (never URLs),
 * sampling, the privacy opt-outs, and what the beacon carries.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRumSampleRate } from '@/config/env.config';
import { rumRouteTemplate } from './route-template';
import { inSample, optedOut, startRum } from './rum';

const reporters: Record<string, (m: { name: string; value: number }) => void> =
  {};
vi.mock('web-vitals', () => ({
  onLCP: (cb: (m: { name: string; value: number }) => void) =>
    (reporters.LCP = cb),
  onINP: (cb: (m: { name: string; value: number }) => void) =>
    (reporters.INP = cb),
  onCLS: (cb: (m: { name: string; value: number }) => void) =>
    (reporters.CLS = cb),
}));

describe('rumRouteTemplate', () => {
  it.each([
    ['/', 'academy-website', 'public:home'],
    ['/ar', 'academy-website', 'public:home'],
    ['/courses', 'academy-website', 'public:courses'],
    ['/ar/courses/intro-to-js', 'academy-website', 'public:course'],
    ['/sign-in', 'academy-website', 'public:auth'],
    ['/my/courses/123/activities/9', 'academy-website', 'public:learn'],
    ['/about', 'academy-website', 'public:page'],
    ['/dashboard', 'atlas-app', 'app:dashboard'],
    ['/dashboard/academy/abc/website/pages/p1', 'atlas-app', 'app:builder'],
    [
      '/dashboard/instructor/courses/c/quizzes/q',
      'atlas-app',
      'app:instructor',
    ],
    ['/dashboard/platform/observability/metrics', 'atlas-app', 'app:platform'],
    ['/my/courses/c/learn/l', 'atlas-app', 'app:learn'],
    ['/auth/sign-in', 'atlas-app', 'app:auth'],
    ['/pricing', 'atlas-app', 'app:other'],
  ] as const)('%s on %s → %s', (path, surface, template) => {
    expect(rumRouteTemplate(path, surface)).toBe(template);
  });
});

describe('sampling and opt-out', () => {
  it('parses the build’s rate safely (absent, junk, out of range)', () => {
    expect(
      [undefined, '', 'abc', '-1', '0.25', '7'].map(parseRumSampleRate)
    ).toEqual([0, 0, 0, 0, 0.25, 1]);
  });

  it('samples by rate; 0 is never in the sample', () => {
    expect(inSample(0, () => 0)).toBe(false);
    expect(inSample(0.1, () => 0.05)).toBe(true);
    expect(inSample(0.1, () => 0.5)).toBe(false);
    expect(inSample(Number.NaN, () => 0)).toBe(false);
  });

  it('honours Global Privacy Control and Do Not Track', () => {
    expect(optedOut({ doNotTrack: '1' } as Navigator)).toBe(true);
    expect(
      optedOut({ globalPrivacyControl: true } as unknown as Navigator)
    ).toBe(true);
    expect(optedOut({ doNotTrack: null } as Navigator)).toBe(false);
  });
});

describe('startRum', () => {
  let sent: string[];
  beforeEach(() => {
    sent = [];
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: (url: string, blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => sent.push(`${url} ${String(reader.result)}`);
        reader.readAsText(blob);
        return true;
      },
    });
    window.matchMedia = ((query: string) => ({
      matches: query.includes('767'),
    })) as typeof window.matchMedia;
    window.history.replaceState(null, '', '/courses/secret-slug?email=a@b.c#x');
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('a visit outside the sample loads nothing and sends nothing', async () => {
    await expect(
      startRum({
        sampleRate: 0.1,
        apiBaseUrl: '/api/v1',
        surface: 'academy-website',
        random: () => 0.9,
      })
    ).resolves.toBe(false);
  });

  it('sends only metric, value, page template and device — never the URL, slug or query', async () => {
    await expect(
      startRum({
        sampleRate: 1,
        apiBaseUrl: '/api/v1/',
        surface: 'academy-website',
        random: () => 0,
      })
    ).resolves.toBe(true);
    reporters.LCP({ name: 'LCP', value: 2100 });
    reporters.CLS({ name: 'CLS', value: 0.04 });
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    const bodies = sent.map((entry) => {
      const [url, json] = entry.split(' ');
      expect(url).toBe('/api/v1/rum/vitals');
      return JSON.parse(json) as unknown;
    });
    expect(bodies).toEqual([
      {
        samples: [
          {
            metric: 'LCP',
            value: 2100,
            route: 'public:course',
            device: 'mobile',
          },
        ],
      },
      {
        samples: [
          {
            metric: 'CLS',
            value: 0.04,
            route: 'public:course',
            device: 'mobile',
          },
        ],
      },
    ]);
    const body = sent.join(' ');
    expect(body).not.toMatch(/secret-slug|email|a@b\.c/);
  });
});
