/**
 * W3 — presentation helpers shared by the Email & Notifications consoles:
 * status tones (always paired with a text label, never colour alone) and
 * the period options.
 */
import type { StatusTone } from '@components/data-display';
import type {
  EmailActivityStatus,
  SecurityEventType,
} from '../services/platform-email-monitoring.types';

export const K_EMAIL = 'platformEmail';

export const ACTIVITY_RANGE_DAYS = [7, 30, 90] as const;
export const SECURITY_RANGE_DAYS = [1, 7, 30, 90] as const;

const ACTIVITY_TONE: Record<EmailActivityStatus, StatusTone> = {
  queued: 'neutral',
  retrying: 'warning',
  waiting: 'neutral',
  sent: 'info',
  delivered: 'success',
  delayed: 'warning',
  bounced: 'destructive',
  complained: 'destructive',
  not_sent: 'neutral',
  in_app_only: 'neutral',
  suppressed: 'warning',
  failed: 'destructive',
};

export function activityStatusTone(status: EmailActivityStatus): StatusTone {
  return ACTIVITY_TONE[status] ?? 'neutral';
}

export function securityEventTone(type: SecurityEventType): StatusTone {
  if (type.endsWith('_verified')) return 'success';
  if (type.endsWith('_sent') || type === 'otp_resent') return 'info';
  if (type.endsWith('_locked') || type === 'otp_suppressed')
    return 'destructive';
  return 'warning';
}

/** ISO instant `days` before now, rounded down to the minute so query keys stay stable. */
export function windowStart(days: number, now: number = Date.now()): string {
  const minute = Math.floor(now / 60_000) * 60_000;
  return new Date(minute - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Parses a positive integer from the URL, falling back when absent or not allowed. */
export function parseAllowedNumber<T extends number>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  const value = Number(raw);
  return (allowed as readonly number[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Narrows a URL value to one of `allowed`, or `undefined`. */
export function parseAllowed<T extends string>(
  raw: string | null,
  allowed: readonly T[]
): T | undefined {
  return raw && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseUuid(raw: string | null): string | undefined {
  return raw && UUID.test(raw) ? raw : undefined;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isPlausibleEmail(value: string): boolean {
  return value.length <= 320 && EMAIL.test(value);
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
export function isPlausibleIp(value: string): boolean {
  return (
    IPV4.test(value) ||
    (value.includes(':') && IPV6.test(value) && value.length <= 45)
  );
}
