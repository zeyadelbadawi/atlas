/**
 * G1 — the closed acquisition-channel vocabulary (`acquisition_channel` on
 * the server) and the self-reported "How did you first hear about us?"
 * answer that the organization sign-up and the marketing contact form ask.
 *
 * Pure and dependency-free so that both the app and the static marketing
 * bundle can import it. The answer is voluntary (never required), so it is
 * sent whenever the visitor gives one. It is not gated by the attribution
 * flag. The server is the authority: it refuses an unknown value and
 * scrubs the free text with the same personal-data rules as attribution.
 */
import { looksLikePersonalData } from './landing-attribution.core';

/** Every channel an organization can be attributed to (contract §1). */
export const ACQUISITION_CHANNELS = [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'whatsapp',
  'teacher_referral',
  'assistant_or_agency',
  'google_search',
  'google_ads',
  'meta_ads',
  'ai_assistant',
  'event',
  'email',
  'partner',
  'other',
  'unknown',
] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

/** Channels spend can be logged against (everything but `unknown`). */
export const SPEND_CHANNELS = ACQUISITION_CHANNELS.filter(
  (channel): channel is Exclude<AcquisitionChannel, 'unknown'> =>
    channel !== 'unknown'
);
export type SpendChannel = Exclude<AcquisitionChannel, 'unknown'>;

/** The self-reported answers, in the analytics plan's (§6.2) reference order. */
export const HEARD_FROM_OPTIONS = [
  'facebook',
  'youtube',
  'tiktok',
  'instagram',
  'whatsapp',
  'teacher_referral',
  'assistant_or_agency',
  'google_search',
  'ai_assistant',
  'event',
  'other',
] as const;
export type HeardFrom = (typeof HEARD_FROM_OPTIONS)[number];

/** Longest free-text "Other" answer the server keeps. */
export const HEARD_FROM_OTHER_MAX = 100;

export function isAcquisitionChannel(
  value: unknown
): value is AcquisitionChannel {
  return (
    typeof value === 'string' &&
    (ACQUISITION_CHANNELS as readonly string[]).includes(value)
  );
}

export function isHeardFrom(value: unknown): value is HeardFrom {
  return (
    typeof value === 'string' &&
    (HEARD_FROM_OPTIONS as readonly string[]).includes(value)
  );
}

/**
 * The answers in a random order with "Other" always last (§6.2: a fixed
 * order biases the answer toward the first options). Fisher–Yates.
 */
export function shuffledHeardFromOptions(
  random: () => number = Math.random
): HeardFrom[] {
  const options = HEARD_FROM_OPTIONS.filter((option) => option !== 'other');
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [options[index], options[swap]] = [options[swap], options[index]];
  }
  return [...options, 'other'];
}

const CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g;

/**
 * The "Other" text as it is sent: trimmed, single-spaced, at most 100
 * characters, and dropped when it looks like an email address or a phone
 * number (the server drops it too).
 */
export function cleanHeardFromOther(
  value: string | null | undefined
): string | undefined {
  if (!value) return undefined;
  const text = value.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  if (!text || looksLikePersonalData(text)) return undefined;
  return (
    Array.from(text).slice(0, HEARD_FROM_OTHER_MAX).join('').trim() || undefined
  );
}

/**
 * The request fields for an answer: nothing when unanswered, the free text
 * only with "Other".
 */
export function heardFromPayload(
  heardFrom: string | null | undefined,
  other?: string | null
): { heardFrom?: HeardFrom; heardFromOther?: string } {
  if (!isHeardFrom(heardFrom)) return {};
  if (heardFrom !== 'other') return { heardFrom };
  const heardFromOther = cleanHeardFromOther(other);
  return heardFromOther ? { heardFrom, heardFromOther } : { heardFrom };
}
