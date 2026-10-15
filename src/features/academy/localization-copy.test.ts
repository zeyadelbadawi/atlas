/**
 * B0-WEB-02 (interim) — the academy "Localization" card used to say the
 * default language applies "across your academy". It does not: it sets the
 * language of emails and certificates only, and the public website is
 * always English at `/` with Arabic under `/ar`. The copy must say what the
 * settings really do, in both languages.
 *
 * D5-3 — the currency now drives something: it is the default for new
 * course prices. The copy says so, says existing prices keep their own
 * currency, and never claims a conversion happens.
 */
import { describe, expect, it } from 'vitest';
import en from '@localization/resources/en/academy.json';
import ar from '@localization/resources/ar/academy.json';

describe('academy localization settings copy', () => {
  it('does not claim the language applies across the whole academy', () => {
    expect(en.settings.localizationDescription).not.toMatch(
      /across your academy/i
    );
  });

  it('says what each setting really does (EN + AR)', () => {
    expect(en.settings.localizationDescription).toMatch(
      /emails and certificates/
    );
    expect(en.settings.localizationDescription).toContain('/ar');
    expect(ar.settings.localizationDescription).toContain('الشهادات');
    expect(ar.settings.localizationDescription).toContain('/ar');
  });

  it('says the currency is the default for new course prices, without claiming a conversion (EN + AR)', () => {
    const enText = en.settings.localizationDescription;
    expect(enText).toMatch(/Currency is the default for new course prices/);
    expect(enText).toMatch(/each course keeps the currency it is priced in/);
    expect(enText).toMatch(/never converts/);
    expect(enText).not.toMatch(
      /stored but unused|use the currency set on each course\./
    );
    // A claim that amounts are converted would be false.
    expect(enText).not.toMatch(/\bconverted (to|into)\b|exchange rate/i);
    const arText = ar.settings.localizationDescription;
    expect(arText).toContain('العملة الافتراضية لأسعار الدورات الجديدة');
    expect(arText).toContain('لا يؤدي تغييرها أبدًا إلى تحويل');
    expect(en.profile.currencyHelp).toMatch(/nothing is converted/);
    expect(ar.profile.currencyHelp).toContain('لا يتم تحويل');
  });
});
