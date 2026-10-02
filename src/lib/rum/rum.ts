/**
 * Real-user monitoring (P6) — LCP, INP and CLS from a SAMPLE of real
 * visits, sent to Atlas's own API (`POST /rum/vitals`) and nowhere else.
 *
 * When RUM is off (the build's sample rate is 0, the default) nothing of
 * it is downloaded. When it is on, `main.tsx` loads this small module
 * after the first render; the `web-vitals` library is downloaded only for
 * visits in the sample.
 *
 * What is sent: the metric, its value, the page TEMPLATE
 * (`rumRouteTemplate`) and "mobile"/"desktop" from the viewport width.
 * Not sent: the URL, any id, the user, a session or device identifier.
 * Nothing is stored in the browser. A browser asking not to be tracked
 * (Global Privacy Control or Do Not Track) is not sampled.
 *
 * The template is the page the visit started on: LCP belongs to it; INP
 * and CLS are reported when the page is hidden and cover the whole visit,
 * so in this single-page app they are attributed to the landing page —
 * a documented limit (Reports/REAL_USER_MONITORING.md).
 */
import type { Metric } from 'web-vitals';
import { rumRouteTemplate, type RumRouteTemplate } from './route-template';

export interface RumOptions {
  /** 0–1; the share of visits measured. */
  readonly sampleRate: number;
  /** The API base (`/api/v1` in production). */
  readonly apiBaseUrl: string;
  readonly surface: 'academy-website' | 'atlas-app';
  /** Injected in tests. */
  readonly random?: () => number;
}

interface Sample {
  readonly metric: 'LCP' | 'INP' | 'CLS';
  readonly value: number;
  readonly route: RumRouteTemplate;
  readonly device: 'mobile' | 'desktop';
}

/** Global Privacy Control or Do Not Track asks not to be measured. */
export function optedOut(nav: Navigator = navigator): boolean {
  const withSignals = nav as Navigator & { globalPrivacyControl?: boolean };
  return withSignals.globalPrivacyControl === true || nav.doNotTrack === '1';
}

/** Whether this visit is in the sample. */
export function inSample(
  sampleRate: number,
  random: () => number = Math.random
): boolean {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return false;
  return random() < Math.min(1, sampleRate);
}

function send(url: string, samples: readonly Sample[]): void {
  if (samples.length === 0) return;
  const body = JSON.stringify({ samples });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.(url, blob)) return;
  } catch {
    // Fall through to fetch.
  }
  void fetch(url, {
    method: 'POST',
    body,
    keepalive: true,
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => undefined);
}

/** Starts measuring this visit if it is sampled. Never throws. */
export async function startRum(options: RumOptions): Promise<boolean> {
  try {
    if (!inSample(options.sampleRate, options.random) || optedOut())
      return false;
    const { onCLS, onINP, onLCP } = await import('web-vitals');
    const route = rumRouteTemplate(window.location.pathname, options.surface);
    const device = window.matchMedia('(max-width: 767px)').matches
      ? 'mobile'
      : 'desktop';
    const url = `${options.apiBaseUrl.replace(/\/+$/, '')}/rum/vitals`;
    // web-vitals calls back once per metric with its final value — as the
    // page is hidden, or on the first interaction for LCP. Send from inside
    // that callback: a beacon is allowed while the page unloads, and some of
    // the library's listeners are registered lazily, so a separate "flush
    // on hide" listener of ours could run before they report.
    const report = (metric: Metric) => {
      if (
        metric.name !== 'LCP' &&
        metric.name !== 'INP' &&
        metric.name !== 'CLS'
      )
        return;
      send(url, [{ metric: metric.name, value: metric.value, route, device }]);
    };
    onLCP(report);
    onINP(report);
    onCLS(report);
    return true;
  } catch {
    return false;
  }
}
