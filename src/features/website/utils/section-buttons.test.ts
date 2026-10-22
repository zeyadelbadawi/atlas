/**
 * CMS phase 3 — section buttons: where a button goes (WhatsApp, a call, a
 * sign-up page) and what a typed phone number is stored as.
 */
import { describe, expect, it } from 'vitest';
import {
  hasSectionButtons,
  phoneHref,
  resolveWebsiteCtaHref,
  whatsappHref,
} from './link-resolution.utils';
import { storedButtonNumber } from '../components/SectionButtonsEditor';
import type { WebsiteCta } from '@types';

const label = { en: 'Go', ar: 'اذهب' };

describe('where a section button goes', () => {
  it('opens a WhatsApp chat, with the first message in the visitor’s language', () => {
    const cta: WebsiteCta = {
      label,
      whatsapp: '+201001234567',
      whatsappMessage: { en: 'Hi & hello', ar: 'عايز أسأل' },
    };
    expect(resolveWebsiteCtaHref(cta, [], 'en')).toBe(
      'https://wa.me/201001234567?text=Hi%20%26%20hello'
    );
    expect(resolveWebsiteCtaHref(cta, [], 'ar')).toBe(
      `https://wa.me/201001234567?text=${encodeURIComponent('عايز أسأل')}`
    );
  });

  it('falls back to the English message, and to none', () => {
    expect(
      resolveWebsiteCtaHref(
        {
          label,
          whatsapp: '+201001234567',
          whatsappMessage: { en: 'Hi', ar: '' },
        },
        [],
        'ar'
      )
    ).toBe('https://wa.me/201001234567?text=Hi');
    expect(whatsappHref('+201001234567')).toBe('https://wa.me/201001234567');
  });

  it('calls an international number or a hotline', () => {
    expect(resolveWebsiteCtaHref({ label, phone: '19999' }, [])).toBe(
      'tel:19999'
    );
    expect(phoneHref('+20233334444')).toBe('tel:+20233334444');
  });

  it('re-checks a stored number instead of trusting it', () => {
    expect(whatsappHref('javascript:alert(1)')).toBeUndefined();
    expect(whatsappHref('01001234567')).toBeUndefined();
    expect(phoneHref('call-me')).toBeUndefined();
  });

  it('goes nowhere while its number is not typed yet', () => {
    expect(resolveWebsiteCtaHref({ label, whatsapp: '' }, [])).toBeUndefined();
    expect(resolveWebsiteCtaHref({ label, phone: '' }, [])).toBeUndefined();
  });

  it('opens the academy’s own sign-up and sign-in pages', () => {
    expect(resolveWebsiteCtaHref({ label, authAction: 'signUp' }, [])).toBe(
      '/sign-up'
    );
    expect(resolveWebsiteCtaHref({ label, authAction: 'signIn' }, [])).toBe(
      '/sign-in'
    );
  });

  it('knows whether a section has any button', () => {
    expect(hasSectionButtons({})).toBe(false);
    expect(hasSectionButtons({ tertiaryCta: { label } })).toBe(true);
  });
});

describe('what a typed number is stored as', () => {
  it('stores a valid mobile number internationally', () => {
    expect(storedButtonNumber('0100 123 4567', 'EG', 'whatsapp')).toBe(
      '+201001234567'
    );
    expect(storedButtonNumber('٠١٠٠١٢٣٤٥٦٧', 'EG', 'phone')).toBe(
      '+201001234567'
    );
  });

  it('keeps a hotline for a call, but not for WhatsApp', () => {
    expect(storedButtonNumber('19999', 'EG', 'phone')).toBe('19999');
    expect(storedButtonNumber('19999', 'EG', 'whatsapp')).toBe('19999');
  });

  it('puts a landline in international form for a call', () => {
    expect(storedButtonNumber('02 3333 4444', 'EG', 'phone')).toBe(
      '+20233334444'
    );
  });

  it('keeps what cannot be a number as typed, so the form refuses it', () => {
    expect(storedButtonNumber('call me', 'EG', 'phone')).toBe('call me');
    expect(storedButtonNumber('0100', 'EG', 'whatsapp')).toBe('0100');
    expect(storedButtonNumber('  ', 'EG', 'whatsapp')).toBe('');
  });
});
