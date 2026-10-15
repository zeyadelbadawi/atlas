/**
 * B0-WEB-02 (interim) — the academy "Localization" card used to say the
 * default language applies "across your academy". It does not: it sets the
 * language of emails and certificates only. The website's main language is
 * its own setting (B0-WEB-02 fix: Website settings → Language; it used to be
 * fixed at English, which the interim copy said). The copy must say what the
 * settings really do, in both languages.
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
    expect(en.settings.localizationDescription).toContain('Website settings');
    expect(en.settings.localizationDescription).not.toMatch(
      /main address is in English/
    );
    expect(ar.settings.localizationDescription).toContain('الشهادات');
    expect(ar.settings.localizationDescription).toContain(
      'إعدادات الموقع الإلكتروني'
    );
  });
});
