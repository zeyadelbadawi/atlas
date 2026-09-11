/**
 * Sign In/Sign Up copy survives every neighbouring save.
 *
 * `header` is a FULL REPLACE server-side, which makes every partial header
 * write a chance to silently delete something. Editing this copy used to
 * live in two places — the Website Settings → Navigation tab and the Pages
 * list — both going through `buildAuthPageCopyHeaderPatch`. The duplicate
 * block in the Navigation tab has been removed (the Pages list is where an
 * admin already goes to browse the pages of their site, and Sign In/Sign Up
 * are listed there alongside the core pages), so this helper is now reached
 * from exactly one surface.
 *
 * Removing the editor made the carry-forward MORE important, not less: the
 * Navigation tab still writes `header` for CTA and navigation changes, and
 * it no longer has any reason of its own to think about `authPages`. These
 * tests pin the two halves of that — the helper never drops a sibling
 * field, and the header patch always carries the CTA through.
 */
import { describe, expect, it } from 'vitest';
import { buildAuthPageCopyHeaderPatch } from './auth-page-copy.utils';
import type { WebsiteConfiguration } from '@types';

const EN_AR = (en: string, ar: string) => ({ en, ar });

function configurationWith(
  authPages: WebsiteConfiguration['header']['authPages'],
): WebsiteConfiguration {
  return {
    header: {
      cta: { label: EN_AR('Enrol now', 'سجل الآن'), authAction: 'signUp' },
      authPages,
    },
  } as WebsiteConfiguration;
}

describe('buildAuthPageCopyHeaderPatch', () => {
  it('keeps the other auth page untouched when one is edited', () => {
    const configuration = configurationWith({
      signIn: { title: EN_AR('Welcome back', 'مرحبًا بعودتك') },
      signUp: { title: EN_AR('Join us', 'انضم إلينا') },
    });

    const patch = buildAuthPageCopyHeaderPatch(
      configuration,
      'signIn',
      'title',
      EN_AR('Sign in to Elzozo', 'سجّل الدخول'),
    );

    expect(patch.authPages?.signUp?.title).toEqual(EN_AR('Join us', 'انضم إلينا'));
  });

  it('keeps the other FIELD of the same page untouched', () => {
    const configuration = configurationWith({
      signIn: {
        title: EN_AR('Welcome back', 'مرحبًا بعودتك'),
        subtitle: EN_AR('Your courses await', 'دوراتك بانتظارك'),
      },
    });

    const patch = buildAuthPageCopyHeaderPatch(
      configuration,
      'signIn',
      'title',
      EN_AR('Sign in', 'تسجيل الدخول'),
    );

    expect(patch.authPages?.signIn?.subtitle).toEqual(
      EN_AR('Your courses await', 'دوراتك بانتظارك'),
    );
  });

  it('carries the header CTA through, because `header` is replaced wholesale', () => {
    const configuration = configurationWith({});

    const patch = buildAuthPageCopyHeaderPatch(
      configuration,
      'signUp',
      'title',
      EN_AR('Create your account', 'أنشئ حسابك'),
    );

    expect(patch.cta?.label).toEqual(EN_AR('Enrol now', 'سجل الآن'));
    expect(patch.cta?.authAction).toBe('signUp');
  });

  it('clears an override when the value is blank in both languages', () => {
    const configuration = configurationWith({
      signIn: { title: EN_AR('Welcome back', 'مرحبًا بعودتك') },
    });

    const patch = buildAuthPageCopyHeaderPatch(
      configuration,
      'signIn',
      'title',
      EN_AR('  ', ''),
    );

    expect(patch.authPages?.signIn?.title).toBeUndefined();
  });

  it('treats Arabic-only copy as a real override, not as blank', () => {
    const configuration = configurationWith({});

    const patch = buildAuthPageCopyHeaderPatch(
      configuration,
      'signIn',
      'title',
      EN_AR('', 'مرحبًا بعودتك'),
    );

    expect(patch.authPages?.signIn?.title).toEqual(EN_AR('', 'مرحبًا بعودتك'));
  });
});
