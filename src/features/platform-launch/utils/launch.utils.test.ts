import { describe, expect, it } from 'vitest';
import {
  announcementLiveState,
  fromLocalInput,
  isSafeLink,
  isSlugValid,
  isStaleError,
  isValidPagePath,
  normalizePagePath,
  slugify,
  toLocalInput,
  validateTranslation,
} from './launch.utils';

describe('launch utils', () => {
  it('slugs titles to the contract pattern', () => {
    expect(slugify('  Exam Season: 10 Tips! ')).toBe('exam-season-10-tips');
    expect(slugify('Café déjà vu')).toBe('cafe-deja-vu');
    expect(slugify('احمِ دروسك')).toBe('');
    expect(isSlugValid('exam-season')).toBe(true);
    expect(isSlugValid('ex')).toBe(false);
    expect(isSlugValid('double--hyphen')).toBe(false);
    expect(isSlugValid('Upper')).toBe(false);
  });

  it('validates a translation against the contract limits', () => {
    const ok = {
      title: 'Fine title',
      excerpt: 'A long enough excerpt here.',
      body: 'x',
      coverAlt: '',
      seoTitle: '',
      seoDescription: '',
    };
    expect(validateTranslation(ok, false)).toEqual({});
    expect(validateTranslation(ok, true)).toEqual({
      coverAlt: 'editor.validation.coverAltRequired',
    });
    expect(
      validateTranslation({ ...ok, seoTitle: 'x'.repeat(71) }, false)
    ).toEqual({ seoTitle: 'editor.validation.seoTitleLength' });
    // A draft: maximum lengths only.
    expect(
      validateTranslation(
        { ...ok, title: 'x', excerpt: '', body: '' },
        true,
        false
      )
    ).toEqual({});
  });

  it('computes the live state from status and dates', () => {
    const now = Date.parse('2026-10-26T12:00:00Z');
    expect(
      announcementLiveState(
        { status: 'draft', startsAt: null, endsAt: null },
        now
      )
    ).toBe('off');
    expect(
      announcementLiveState(
        { status: 'active', startsAt: null, endsAt: null },
        now
      )
    ).toBe('live');
    expect(
      announcementLiveState(
        { status: 'active', startsAt: '2026-10-27T00:00:00Z', endsAt: null },
        now
      )
    ).toBe('scheduled');
    expect(
      announcementLiveState(
        { status: 'active', startsAt: null, endsAt: '2026-10-26T11:00:00Z' },
        now
      )
    ).toBe('ended');
  });

  it('normalizes and validates page paths and links', () => {
    expect(normalizePagePath('pricing/')).toBe('/pricing');
    expect(normalizePagePath('/ar/features/payments')).toBe(
      '/features/payments'
    );
    expect(normalizePagePath('/ar')).toBe('/');
    expect(isValidPagePath('/pricing?x=1')).toBe(false);
    expect(isValidPagePath('/Pricing')).toBe(false);
    expect(normalizePagePath('/Pricing')).toBe('/pricing');
    expect(isSafeLink('/dashboard')).toBe(true);
    expect(isSafeLink('//evil.com')).toBe(false);
    expect(isSafeLink('http://insecure.com')).toBe(false);
  });

  it('round-trips datetime-local values', () => {
    const iso = '2026-11-01T08:30:00.000Z';
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(fromLocalInput('')).toBeNull();
  });

  it('recognises a stale write but not a slug conflict', () => {
    expect(isStaleError({ status: 409, messageKey: 'errors.blog.stale' })).toBe(
      true
    );
    expect(
      isStaleError({ status: 409, messageKey: 'errors.blog.slugTaken' })
    ).toBe(false);
  });
});
