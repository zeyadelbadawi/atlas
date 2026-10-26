/**
 * G1 — the acquisition-channel vocabulary and the self-reported
 * "How did you first hear about us?" answer: shuffled with Other last,
 * free text only with Other, scrubbed of emails/phones, ≤ 100 characters.
 */
import { describe, expect, it } from 'vitest';
import {
  ACQUISITION_CHANNELS,
  HEARD_FROM_OPTIONS,
  SPEND_CHANNELS,
  cleanHeardFromOther,
  heardFromPayload,
  isAcquisitionChannel,
  isHeardFrom,
  shuffledHeardFromOptions,
} from './acquisition-channel.utils';

describe('acquisition channels', () => {
  it('is the closed vocabulary of the contract, spend excluding unknown', () => {
    expect(ACQUISITION_CHANNELS).toHaveLength(16);
    expect(SPEND_CHANNELS).not.toContain('unknown');
    expect(SPEND_CHANNELS).toHaveLength(15);
    expect(isAcquisitionChannel('meta_ads')).toBe(true);
    expect(isAcquisitionChannel('myspace')).toBe(false);
  });

  it('offers the eleven self-reported answers', () => {
    expect(HEARD_FROM_OPTIONS).toEqual([
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
    ]);
    expect(isHeardFrom('google_ads')).toBe(false);
    expect(isHeardFrom('unknown')).toBe(false);
  });
});

describe('shuffledHeardFromOptions', () => {
  it('keeps every option once and Other last', () => {
    for (const seed of [0, 0.3, 0.7, 0.999]) {
      const order = shuffledHeardFromOptions(() => seed);
      expect(order).toHaveLength(HEARD_FROM_OPTIONS.length);
      expect(new Set(order)).toEqual(new Set(HEARD_FROM_OPTIONS));
      expect(order[order.length - 1]).toBe('other');
    }
  });

  it('actually changes the order', () => {
    const fixed = shuffledHeardFromOptions(() => 0).join();
    const other = shuffledHeardFromOptions(() => 0.999).join();
    expect(fixed).not.toBe(other);
  });
});

describe('the answer payload', () => {
  it('sends nothing when unanswered or invalid', () => {
    expect(heardFromPayload('')).toEqual({});
    expect(heardFromPayload(undefined)).toEqual({});
    expect(heardFromPayload('myspace')).toEqual({});
  });

  it('sends the free text only with Other', () => {
    expect(heardFromPayload('youtube', 'ignored')).toEqual({
      heardFrom: 'youtube',
    });
    expect(heardFromPayload('other', '  a friend   at the  centre ')).toEqual({
      heardFrom: 'other',
      heardFromOther: 'a friend at the centre',
    });
    expect(heardFromPayload('other', '   ')).toEqual({ heardFrom: 'other' });
  });

  it('drops an email or phone and caps at 100 characters', () => {
    expect(cleanHeardFromOther('me@mail.test')).toBeUndefined();
    expect(cleanHeardFromOther('call +20 100 000 0000')).toBeUndefined();
    expect(cleanHeardFromOther('x'.repeat(150))).toHaveLength(100);
    expect(cleanHeardFromOther('من صديق')).toBe('من صديق');
  });
});
