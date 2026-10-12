/**
 * Who can see a learner's phone number, in every place we tell them.
 *
 * WHAT WAS WRONG (CF-33). The sign-up hint said "Only you can see it" and
 * the profile card and the add-number prompt said "Academies and other users
 * can't see it". By design the academy's owners and managers (and the
 * organization owner) can read their students' numbers, and the Platform
 * Owner can read any student's number (`readStudentPhones` in the backend).
 * The copy has to say so, in both languages, and so does the Privacy Policy.
 */
import { describe, expect, it } from 'vitest';
import enAuth from '@localization/resources/en/auth.json';
import arAuth from '@localization/resources/ar/auth.json';
import enProfile from '@localization/resources/en/profile.json';
import arProfile from '@localization/resources/ar/profile.json';
import { PRIVACY_POLICY_EN } from '@/features/legal/content/privacy-policy.en';
import { PRIVACY_POLICY_AR } from '@/features/legal/content/privacy-policy.ar';

const enTexts = [
  enAuth.register.phoneHint,
  enProfile.phone.description,
  enProfile.phone.prompt.body,
];
const arTexts = [
  arAuth.register.phoneHint,
  arProfile.phone.description,
  arProfile.phone.prompt.body,
];

describe('phone visibility copy', () => {
  it('never tells a learner that nobody else can see their number', () => {
    for (const text of enTexts) {
      expect(text).not.toMatch(/only you can see/i);
      expect(text).not.toMatch(/can.t see it/i);
    }
    for (const text of arTexts) {
      expect(text).not.toContain('لا يراه أحد غيرك');
      expect(text).not.toContain('لا تراه الأكاديميات');
    }
  });

  it('names who can see it: academy owners and managers, and Atlas administrators', () => {
    for (const text of enTexts) {
      expect(text).toMatch(/owners and managers/);
      expect(text).toMatch(/Atlas platform administrators/);
    }
    for (const text of arTexts) {
      expect(text).toContain('مديرو');
      expect(text).toContain('مسؤولو منصة أطلس');
    }
  });

  it('is disclosed in the Privacy Policy account-information entry (EN + AR)', () => {
    expect(JSON.stringify(PRIVACY_POLICY_EN)).toContain(
      'your phone number can be seen by that academy’s owners and managers and by Atlas platform administrators'
    );
    expect(JSON.stringify(PRIVACY_POLICY_AR)).toContain(
      'ومسؤولو منصة أطلس رؤية رقم هاتفك'
    );
  });
});
