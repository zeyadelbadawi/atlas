/**
 * B5 (UX audit) — V20: a custom domain must look like one; V28: the
 * messages name the real limits ("or fewer"); the client leaves exact
 * IDNA validity to the server.
 */
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';
import {
  customerRequestFormSchema,
  isPlausibleDomain,
} from './components/CreateCustomerRequestDialog';

describe('V20 — the desired domain', () => {
  it.each([
    'myacademy.com',
    'learn.myacademy.com',
    'my-academy.co.uk',
    'أكاديمية.مصر',
    'उदाहरण.भारत',
    '',
  ])('accepts %s', (value) => {
    expect(isPlausibleDomain(value)).toBe(true);
  });

  it.each([
    'my academy dot com',
    'https://myacademy.com',
    'myacademy.com/courses',
    'me@myacademy.com',
    'myacademy',
    'myacademy.c',
    '.myacademy.com',
    'myacademy..com',
  ])('refuses %s', (value) => {
    expect(isPlausibleDomain(value)).toBe(false);
  });

  it('refuses it on the field, with an example, in both languages', () => {
    const result = customerRequestFormSchema.safeParse({
      type: 'domain',
      title: 'A new domain',
      description: 'We want our own address.',
      priority: 'normal',
      details: { desiredDomain: 'my academy dot com' },
      alreadyOwned: 'unsure',
    });
    expect(result.success).toBe(false);
    const issue = result.success ? undefined : result.error.issues[0];
    expect(issue?.path).toEqual(['details', 'desiredDomain']);
    expect(createI18nInstance('en').t(issue!.message)).toContain(
      'myacademy.com'
    );
    expect(createI18nInstance('ar').t(issue!.message)).toContain(
      'myacademy.com'
    );
  });

  it('says "or fewer" — the limit itself is allowed (V28)', () => {
    expect(
      createI18nInstance('en').t('customerRequests:fields.tooLong', {
        max: 253,
      })
    ).toBe('Use 253 characters or fewer.');
  });
});
