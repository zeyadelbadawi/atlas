/**
 * Countdown arithmetic: time left, and a wall-clock time in the academy's
 * zone becoming a deadline with that zone's offset on that date (clock
 * changes included).
 */
import { describe, expect, it } from 'vitest';
import {
  countdownRemaining,
  deadlineText,
  deadlineTimeZone,
  deadlineToWallTime,
  utcOffsetLabel,
  wallTimeToDeadline,
} from './countdown.utils';

describe('countdownRemaining', () => {
  it('splits the time left into whole units', () => {
    const deadline = Date.parse('2030-01-10T12:00:00Z');
    expect(
      countdownRemaining(deadline, Date.parse('2030-01-08T09:30:15Z'))
    ).toEqual({ ended: false, days: 2, hours: 2, minutes: 29, seconds: 45 });
  });

  it('ends at the deadline and never goes negative', () => {
    const deadline = Date.parse('2030-01-10T12:00:00Z');
    expect(countdownRemaining(deadline, deadline)).toMatchObject({
      ended: true,
      days: 0,
      seconds: 0,
    });
    expect(countdownRemaining(deadline, deadline + 5000).ended).toBe(true);
  });
});

describe('wall time ↔ deadline', () => {
  it('uses the zone’s offset on that date', () => {
    expect(wallTimeToDeadline('2027-01-15T23:59', 'Africa/Cairo')).toBe(
      '2027-01-15T23:59:00+02:00'
    );
    // Egypt keeps summer time from late April to late October.
    expect(wallTimeToDeadline('2027-07-01T10:00', 'Africa/Cairo')).toBe(
      '2027-07-01T10:00:00+03:00'
    );
    expect(wallTimeToDeadline('2027-07-01T10:00', 'UTC')).toBe(
      '2027-07-01T10:00:00+00:00'
    );
    expect(wallTimeToDeadline('2027-07-01T10:00', 'Asia/Kolkata')).toBe(
      '2027-07-01T10:00:00+05:30'
    );
  });

  it('refuses an incomplete time', () => {
    expect(wallTimeToDeadline('2027-07-01', 'UTC')).toBeUndefined();
    expect(wallTimeToDeadline('', 'UTC')).toBeUndefined();
  });

  it('reads a deadline back on the zone’s clock', () => {
    expect(deadlineToWallTime('2027-01-15T21:59:00Z', 'Africa/Cairo')).toBe(
      '2027-01-15T23:59'
    );
    expect(deadlineToWallTime('nonsense', 'UTC')).toBe('');
  });
});

describe('naming the deadline', () => {
  it('falls back to the deadline’s own offset when the zone is unknown', () => {
    expect(deadlineTimeZone('2027-01-15T23:59:00+02:00', 'Nowhere/City')).toBe(
      'Etc/GMT-2'
    );
    expect(deadlineTimeZone('2027-01-15T23:59:00Z', undefined)).toBe('UTC');
    expect(deadlineTimeZone('2027-01-15T23:59:00+05:30', undefined)).toBe(
      'UTC'
    );
  });

  it('says the offset plainly', () => {
    const instant = Date.parse('2027-01-15T21:59:00Z');
    expect(utcOffsetLabel(instant, 'Africa/Cairo')).toBe('UTC+2');
    expect(utcOffsetLabel(instant, 'Asia/Kolkata')).toBe('UTC+5:30');
    expect(utcOffsetLabel(instant, 'UTC')).toBe('UTC');
  });

  it('writes the date and time in each language', () => {
    const instant = Date.parse('2027-01-15T21:59:00Z');
    expect(deadlineText(instant, 'Africa/Cairo', 'en')).toEqual({
      date: 'Friday 15 January 2027',
      time: '23:59',
      zone: 'UTC+2',
    });
    const ar = deadlineText(instant, 'Africa/Cairo', 'ar');
    expect(ar.date).toContain('يناير');
    expect(ar.time).toBe('١١:٥٩ م');
  });
});
