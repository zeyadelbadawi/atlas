import { describe, expect, it } from 'vitest';
import {
  attemptDurationSeconds,
  attemptEventLabelKey,
  autoSubmittedReasonLabelKey,
  formatAttemptDuration,
  fromDateTimeLocalValue,
  sortEventsByServerTime,
  toDateTimeLocalValue,
} from './attempt-review.utils';

describe('attemptDurationSeconds', () => {
  it('prefers the server duration when present', () => {
    expect(
      attemptDurationSeconds(
        '2026-09-22T10:00:00Z',
        '2026-09-22T10:30:00Z',
        95.4
      )
    ).toBe(95);
  });

  it('falls back to submittedAt minus startedAt', () => {
    expect(
      attemptDurationSeconds('2026-09-22T10:00:00Z', '2026-09-22T10:05:20Z')
    ).toBe(320);
    expect(
      attemptDurationSeconds(
        '2026-09-22T10:00:00Z',
        '2026-09-22T10:05:20Z',
        null
      )
    ).toBe(320);
  });

  it('is null when the attempt is not finished or the timestamps are unusable', () => {
    expect(
      attemptDurationSeconds('2026-09-22T10:00:00Z', undefined)
    ).toBeNull();
    expect(attemptDurationSeconds(null, '2026-09-22T10:00:00Z')).toBeNull();
    expect(
      attemptDurationSeconds('not a date', '2026-09-22T10:00:00Z')
    ).toBeNull();
    expect(
      attemptDurationSeconds('2026-09-22T10:05:00Z', '2026-09-22T10:00:00Z')
    ).toBeNull();
    expect(attemptDurationSeconds(null, null, -5)).toBeNull();
  });
});

describe('formatAttemptDuration', () => {
  it('renders mm:ss', () => {
    expect(
      formatAttemptDuration('2026-09-22T10:00:00Z', '2026-09-22T10:05:20Z')
    ).toBe('05:20');
    expect(formatAttemptDuration(null, null, 0)).toBe('00:00');
    expect(formatAttemptDuration(null, null, 59)).toBe('00:59');
  });

  it('adds an unpadded hour component past an hour', () => {
    expect(formatAttemptDuration(null, null, 3720)).toBe('1:02:00');
    expect(formatAttemptDuration(null, null, 36001)).toBe('10:00:01');
  });

  it('is null when the duration is unknown', () => {
    expect(formatAttemptDuration('2026-09-22T10:00:00Z', null)).toBeNull();
  });

  it('routes every digit through the supplied part formatter', () => {
    const arabicIndic = (value: number, minimumDigits: number) =>
      String(value)
        .padStart(minimumDigits, '0')
        .replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
    expect(formatAttemptDuration(null, null, 320, arabicIndic)).toBe('٠٥:٢٠');
  });
});

describe('attemptEventLabelKey', () => {
  it('maps each event type onto the instructor namespace', () => {
    expect(attemptEventLabelKey('visibility_hidden')).toBe(
      'instructor:attemptReview.events.type.visibility_hidden'
    );
    expect(attemptEventLabelKey('warning_acknowledged')).toBe(
      'instructor:attemptReview.events.type.warning_acknowledged'
    );
  });
});

describe('autoSubmittedReasonLabelKey', () => {
  it('knows the engine reasons and nothing else', () => {
    expect(autoSubmittedReasonLabelKey('timeout')).toBe(
      'instructor:quizResults.autoSubmittedReason.timeout'
    );
    expect(autoSubmittedReasonLabelKey('integrity')).toBe(
      'instructor:quizResults.autoSubmittedReason.integrity'
    );
    expect(autoSubmittedReasonLabelKey('something_new')).toBeNull();
    expect(autoSubmittedReasonLabelKey(null)).toBeNull();
    expect(autoSubmittedReasonLabelKey(undefined)).toBeNull();
  });
});

describe('sortEventsByServerTime', () => {
  it('orders by serverAt without mutating the input', () => {
    const events = [
      { id: 'b', serverAt: '2026-09-22T10:00:02Z' },
      { id: 'a', serverAt: '2026-09-22T10:00:01Z' },
      { id: 'c', serverAt: '2026-09-22T10:00:03Z' },
    ] as const;
    const sorted = sortEventsByServerTime(events);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(events.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('datetime-local conversion', () => {
  it('round-trips an ISO instant through the local input value', () => {
    const iso = '2026-09-22T10:30:00.000Z';
    const local = toDateTimeLocalValue(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDateTimeLocalValue(local)).toBe(iso);
  });

  it('treats empty and invalid values as absent', () => {
    expect(toDateTimeLocalValue(null)).toBe('');
    expect(toDateTimeLocalValue('nope')).toBe('');
    expect(fromDateTimeLocalValue('')).toBeNull();
    expect(fromDateTimeLocalValue(undefined)).toBeNull();
    expect(fromDateTimeLocalValue('nope')).toBeNull();
  });
});
