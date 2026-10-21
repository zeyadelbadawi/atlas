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
});
