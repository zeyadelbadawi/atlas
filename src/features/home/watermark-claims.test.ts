/**
 * The marketing copy for the forensic video watermark stays honest.
 *
 * The watermark is mandatory on every plan, so the claim may appear on the
 * home page and the features page. It is a deterrent and a trace, never a
 * guarantee: the copy must not say it stops recording, prevents piracy, is
 * unremovable or "100%" anything, and it must say that Atlas (not the
 * academy) does the tracing — academies have no lookup tool of their own.
 */
import { describe, expect, it } from 'vitest';
import enHome from '@/localization/resources/en/home.json';
import arHome from '@/localization/resources/ar/home.json';
import enFeatures from '@/localization/resources/en/features.json';
import arFeatures from '@/localization/resources/ar/features.json';

const OVERCLAIM =
  /100\s?%|unremovable|cannot be removed|impossible|prevents? (piracy|recording|screen)|stops? (piracy|recording)|unrecordable|fully secure/i;

describe('forensic watermark marketing copy', () => {
  const english = [
    enHome.capabilities.watermark,
    enFeatures.groups.security.items.watermark,
  ];

  it('names the feature and says Atlas traces a leak (EN)', () => {
    for (const item of english) {
      expect(item.title).toBe('Forensic watermark on every video');
      expect(item.description).toContain('personal code');
      expect(item.description).toContain(
        'Atlas traces it to the account and session it came from'
      );
      expect(item.description).toContain('on every plan');
    }
    expect(enFeatures.groups.security.items.watermark.description).toContain(
      'No web platform can fully stop screen recording'
    );
  });

  it('never overclaims (EN)', () => {
    for (const item of english) {
      expect(`${item.title} ${item.description}`).not.toMatch(OVERCLAIM);
    }
  });

  it('carries the same claim in Arabic', () => {
    for (const item of [
      arHome.capabilities.watermark,
      arFeatures.groups.security.items.watermark,
    ]) {
      expect(item.title).toBe('علامة مائية تتبّعية على كل فيديو');
      expect(item.description).toContain('وسيتتبّعه أطلس');
      expect(item.description).toContain('في كل الخطط');
    }
    expect(arFeatures.groups.security.items.watermark.description).toContain(
      'لا تستطيع أي منصة ويب منع تسجيل الشاشة منعًا تامًا'
    );
  });
});
