/**
 * Every notification event the backend can emit must be renderable, in
 * both languages.
 *
 * This exists because the gap is silent by construction. The backend
 * catalogue names a `titleKey`/`messageKey`; if the frontend has no
 * entry, i18next renders the RAW KEY into the notification feed —
 * "notifications:events.enrollmentGranted.title" shown to a learner. No
 * test fails, no error is logged, and it only surfaces when someone looks
 * at the feed. It has already happened twice: the C3 events and the C4
 * OTP event both shipped their backend half with no translations.
 *
 * Arabic drifting behind English is the common half of it, so parity is
 * asserted in both directions rather than just "AR has everything EN has".
 */
import { describe, expect, it } from 'vitest';
import en from './resources/en/notifications.json';
import ar from './resources/ar/notifications.json';

type EventEntry = { title?: string; message?: string };
const enEvents = (en as { events: Record<string, EventEntry> }).events;
const arEvents = (ar as { events: Record<string, EventEntry> }).events;

describe('notification event translations', () => {
  it('defines the same event keys in English and Arabic', () => {
    const enOnly = Object.keys(enEvents).filter((k) => !(k in arEvents));
    const arOnly = Object.keys(arEvents).filter((k) => !(k in enEvents));
    expect({ enOnly, arOnly }).toEqual({ enOnly: [], arOnly: [] });
  });

  it('gives every event both a title and a message in both languages', () => {
    const incomplete: string[] = [];
    for (const [lang, events] of [
      ['en', enEvents],
      ['ar', arEvents],
    ] as const) {
      for (const [key, entry] of Object.entries(events)) {
        if (!entry.title?.trim() || !entry.message?.trim()) {
          incomplete.push(`${lang}.${key}`);
        }
      }
    }
    expect(incomplete).toEqual([]);
  });

  it('uses the same interpolation variables in both languages', () => {
    // A missing `{{courseTitle}}` in the Arabic copy does not throw — it
    // just silently drops the one detail that made the message useful.
    const vars = (text: string) =>
      [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    const mismatched: string[] = [];
    for (const [key, entry] of Object.entries(enEvents)) {
      const other = arEvents[key];
      if (!other) continue;
      for (const field of ['title', 'message'] as const) {
        const a = vars(entry[field] ?? '');
        const b = vars(other[field] ?? '');
        if (a.join(',') !== b.join(',')) {
          mismatched.push(`${key}.${field}: en[${a}] vs ar[${b}]`);
        }
      }
    }
    expect(mismatched).toEqual([]);
  });
});
