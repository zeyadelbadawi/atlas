// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { applyAuthCtas, handoffKind, hasSignedInHint, initAppHandoff } from './app-handoff';

const APP = 'https://dashboard.atlass.dpdns.org';

describe('marketing → dashboard handoff (DL-63)', () => {
  it('reads the hint by exact name and value only', () => {
    expect(hasSignedInHint('a=b; atlas_signed_in=1')).toBe(true);
    expect(hasSignedInHint('atlas_signed_in=0')).toBe(false);
    expect(hasSignedInHint('xatlas_signed_in=1')).toBe(false);
    expect(hasSignedInHint('atlas_signed_in=1; atlas_signed_in=1x')).toBe(true);
    expect(hasSignedInHint('')).toBe(false);
  });

  it('classifies only links on the app origin', () => {
    expect(handoffKind(`${APP}/dashboard`, APP)).toBe('dashboard');
    expect(handoffKind(`${APP}/auth/sign-in?lang=ar`, APP)).toBe('signIn');
    expect(handoffKind(`${APP}/auth/register?plan=x`, APP)).toBe('signUp');
    expect(handoffKind(`${APP}/auth/sign-up`, APP)).toBe('signUp');
    expect(handoffKind('https://atlass.dpdns.org/pricing', APP)).toBeNull();
    expect(handoffKind('https://dashboard.atlass.dpdns.org.evil.com/x', APP)).toBeNull();
    expect(handoffKind(`${APP}/dashboard`, '')).toBeNull();
    expect(handoffKind('not a url', APP)).toBeNull();
  });

  it('swaps Sign in for Open dashboard only when signed in', () => {
    document.body.innerHTML = `<a data-auth-cta href="${APP}/auth/sign-in" data-signed-in-href="${APP}/dashboard" data-signed-in-label="Open dashboard">Sign in</a>`;
    const link = document.querySelector('a') as HTMLAnchorElement;
    applyAuthCtas(document, false);
    expect(link.textContent).toBe('Sign in');
    applyAuthCtas(document, true);
    expect(link.textContent).toBe('Open dashboard');
    expect(link.href).toBe(`${APP}/dashboard`);
    // Signed out again (a page restored after sign-out): back to Sign in.
    applyAuthCtas(document, false);
    expect(link.textContent).toBe('Sign in');
    expect(link.href).toBe(`${APP}/auth/sign-in`);
  });

  it('marks <html data-signed-in> only when signed in, so the header shows the dashboard button instead of the trial', () => {
    document.documentElement.removeAttribute('data-signed-in');
    applyAuthCtas(document, false);
    expect(document.documentElement.hasAttribute('data-signed-in')).toBe(false);
    applyAuthCtas(document, true);
    expect(document.documentElement.hasAttribute('data-signed-in')).toBe(true);
    document.documentElement.removeAttribute('data-signed-in');
  });

  it('shows the transition on a plain click and navigates; leaves modified clicks alone', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    document.body.innerHTML = `
      <a id="go" href="${APP}/auth/register?plan=a">Start</a>
      <a id="site" href="/pricing">Pricing</a>
      <div id="mk-app-handoff" hidden data-text-dashboard="D" data-text-sign-in="S" data-text-sign-up="U"><p data-handoff-text></p></div>`;
    const navigate = vi.fn();
    initAppHandoff(APP, document, navigate);
    const overlay = document.getElementById('mk-app-handoff') as HTMLElement;

    const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    document.getElementById('go')!.dispatchEvent(ctrl);
    expect(navigate).not.toHaveBeenCalled();
    expect(overlay.hidden).toBe(true);

    const site = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('site')!.dispatchEvent(site);
    expect(navigate).not.toHaveBeenCalled();

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('go')!.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    expect(overlay.hidden).toBe(false);
    expect(overlay.textContent).toContain('U');
    expect(navigate).toHaveBeenCalledWith(`${APP}/auth/register?plan=a`);
  });

  it('re-reads the hint when the page comes back from the back-forward cache (signed out meanwhile)', () => {
    document.cookie = 'atlas_signed_in=1; path=/';
    document.body.innerHTML = `
      <a data-auth-cta href="${APP}/auth/sign-in" data-signed-in-href="${APP}/dashboard" data-signed-in-label="Open dashboard">Sign in</a>
      <div id="mk-app-handoff" hidden><p data-handoff-text></p></div>`;
    initAppHandoff(APP, document, vi.fn());
    const link = document.querySelector('a') as HTMLAnchorElement;
    expect(document.documentElement.hasAttribute('data-signed-in')).toBe(true);
    expect(link.textContent).toBe('Open dashboard');

    document.cookie = 'atlas_signed_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(document.documentElement.hasAttribute('data-signed-in')).toBe(false);
    expect(link.textContent).toBe('Sign in');
    expect(link.href).toBe(`${APP}/auth/sign-in`);
  });
});
