/**
 * The help center's header account button (DL-63): the hint cookie decides
 * "Sign in" or "Open dashboard"; a plain click shows the full-screen notice
 * and then navigates. Run against the real chrome markup.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shell } from '../components/chrome';
import type { DocLang } from '../types';
import { applyAuthCta, initAuthCta, isPlainClick, isSignedIn, readCookie } from './auth-cta';

const APP = 'https://dashboard.atlass.dpdns.org';

function mount(lang: DocLang = 'en') {
  document.body.innerHTML = renderToStaticMarkup(
    <Shell lang={lang} siteUrl="https://atlass.dpdns.org" appUrl={APP} altPath="/ar" nav={new Map()} buildYear={2026}>
      <p>x</p>
    </Shell>,
  );
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-auth-cta]'));
  const overlay = document.querySelector<HTMLElement>('[data-auth-overlay]')!;
  return { links, overlay, text: overlay.querySelector<HTMLElement>('[data-auth-overlay-text]')! };
}

/** rAF + setTimeout run synchronously so navigation is observable. */
function fakeWindow() {
  const listeners: Record<string, ((e: Event) => void)[]> = {};
  return {
    requestAnimationFrame: (cb: FrameRequestCallback) => (cb(0), 0),
    setTimeout: (cb: () => void) => (cb(), 0),
    addEventListener: (type: string, cb: (e: Event) => void) => (listeners[type] ??= []).push(cb),
    fire: (type: string, e: Event) => listeners[type]?.forEach((cb) => cb(e)),
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('readCookie / isSignedIn', () => {
  it('matches the cookie name exactly', () => {
    expect(readCookie('a=1; atlas_signed_in=1; b=2', 'atlas_signed_in')).toBe('1');
    expect(readCookie('atlas_signed_in=1', 'atlas_signed_in')).toBe('1');
    expect(readCookie('xatlas_signed_in=1; atlas_signed_in_old=1', 'atlas_signed_in')).toBeNull();
    expect(readCookie('', 'atlas_signed_in')).toBeNull();
  });

  it('is signed in only for the exact value 1', () => {
    expect(isSignedIn('theme=dark; atlas_signed_in=1')).toBe(true);
    expect(isSignedIn('atlas_signed_in=0')).toBe(false);
    expect(isSignedIn('atlas_signed_in=1x')).toBe(false);
    expect(isSignedIn('atlas_signed_in=')).toBe(false);
    expect(isSignedIn('atlas_signed_in=true')).toBe(false);
    expect(isSignedIn('other=atlas_signed_in=1')).toBe(false);
    expect(isSignedIn('')).toBe(false);
  });
});

describe('header account button', () => {
  it('renders "Sign in" without JavaScript, desktop and drawer', () => {
    const { links, overlay } = mount();
    expect(links).toHaveLength(2);
    for (const a of links) {
      expect(a.textContent).toBe('Sign in');
      expect(a.getAttribute('href')).toBe(`${APP}/auth/sign-in`);
    }
    expect(overlay.hidden).toBe(true);
    expect(overlay.getAttribute('role')).toBe('status');
    expect(overlay.getAttribute('aria-live')).toBe('polite');
  });

  it('swaps to "Open dashboard" when signed in, and back', () => {
    const { links } = mount();
    applyAuthCta(document, true);
    for (const a of links) {
      expect(a.textContent).toBe('Open dashboard');
      expect(a.getAttribute('href')).toBe(`${APP}/dashboard`);
    }
    applyAuthCta(document, false);
    for (const a of links) {
      expect(a.textContent).toBe('Sign in');
      expect(a.getAttribute('href')).toBe(`${APP}/auth/sign-in`);
    }
  });

  it('uses the Arabic labels from the page', () => {
    const { links } = mount('ar');
    expect(links[0].getAttribute('href')).toBe(`${APP}/auth/sign-in?lang=ar`);
    applyAuthCta(document, true);
    expect(links[0].textContent).toBe('افتح لوحة التحكم');
  });

  it('shows the notice on a plain click, then navigates', () => {
    const { links, overlay, text } = mount('ar');
    const navigate = vi.fn();
    const win = fakeWindow();
    initAuthCta(document, win as unknown as Window, { navigate, cookies: () => 'atlas_signed_in=1' });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    links[0].dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(overlay.hidden).toBe(false);
    expect(text.textContent).toBe('بنفتحلك لوحة التحكم…');
    expect(navigate).toHaveBeenCalledWith(`${APP}/dashboard`);
  });

  it('says it is opening the sign-in page when signed out', () => {
    const { links, text } = mount();
    const navigate = vi.fn();
    initAuthCta(document, fakeWindow() as unknown as Window, { navigate, cookies: () => '' });
    links[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(text.textContent).toBe('Opening the sign-in page…');
    expect(navigate).toHaveBeenCalledWith(`${APP}/auth/sign-in`);
  });

  it('leaves modified and non-primary clicks to the browser', () => {
    const { links, overlay } = mount();
    const navigate = vi.fn();
    initAuthCta(document, fakeWindow() as unknown as Window, { navigate, cookies: () => '' });
    // Record what the button did, then stop jsdom's own (unimplemented) navigation.
    const prevented: boolean[] = [];
    const record = (e: Event) => {
      prevented.push(e.defaultPrevented);
      e.preventDefault();
    };
    document.addEventListener('click', record);
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
      expect(isPlainClick(e)).toBe(false);
      links[0].dispatchEvent(e);
    }
    document.removeEventListener('click', record);
    expect(prevented).toEqual([false, false, false, false, false]);
    expect(overlay.hidden).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('removes the notice when the page comes back from the back/forward cache', () => {
    const { links, overlay, text } = mount();
    const win = fakeWindow();
    initAuthCta(document, win as unknown as Window, { navigate: vi.fn(), cookies: () => '' });
    links[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(overlay.hidden).toBe(false);
    win.fire('pageshow', Object.assign(new Event('pageshow'), { persisted: false }));
    expect(overlay.hidden).toBe(false);
    win.fire('pageshow', Object.assign(new Event('pageshow'), { persisted: true }));
    expect(overlay.hidden).toBe(true);
    expect(text.textContent).toBe('');
  });
});
