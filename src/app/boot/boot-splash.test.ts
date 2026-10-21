// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismissBootSplash } from './boot-splash';

const SCRIPT = readFileSync(resolve(__dirname, '../../../public/boot-splash.js'), 'utf-8');
const APP = 'https://dashboard.atlass.dpdns.org';

function mount(host: string, path = '/', cookie = ''): HTMLElement {
  document.body.innerHTML = `<div id="atlas-boot-splash" data-app-url="${APP}" hidden><p data-splash-text></p></div>`;
  vi.stubGlobal('location', { ...window.location, hostname: host, pathname: path, search: '' });
  document.cookie = 'atlas_signed_in=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  if (cookie) document.cookie = cookie;
  new Function(SCRIPT)();
  return document.getElementById('atlas-boot-splash') as HTMLElement;
}

describe('dashboard boot splash (DL-63)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the tab after the dashboard on the dashboard host only', () => {
    document.title = 'Atlas';
    mount('nour.atlass.dpdns.org');
    expect(document.title).toBe('Atlas');
    mount('dashboard.atlass.dpdns.org', '/dashboard');
    expect(['Atlas Dashboard', 'لوحة تحكم أطلس']).toContain(document.title);
  });

  it('stays hidden on any host but the dashboard', () => {
    expect(mount('nour.atlass.dpdns.org').hidden).toBe(true);
    expect(mount('atlass.dpdns.org').hidden).toBe(true);
    expect(mount('learn.example.com').hidden).toBe(true);
  });

  it('says the dashboard is opening when the hint is present, sign-in otherwise', () => {
    const signedIn = mount('dashboard.atlass.dpdns.org', '/dashboard', 'atlas_signed_in=1');
    expect(signedIn.hidden).toBe(false);
    expect(signedIn.textContent).toMatch(/dashboard|لوحة التحكم/);
    const anonymous = mount('dashboard.atlass.dpdns.org', '/dashboard');
    expect(anonymous.textContent).toMatch(/sign-in|الدخول/);
    const register = mount('dashboard.atlass.dpdns.org', '/auth/register');
    expect(register.textContent).toMatch(/sign-up|التسجيل/);
  });

  it('is removed by the app, and removing it twice or on another host is harmless', () => {
    const el = mount('dashboard.atlass.dpdns.org', '/');
    vi.useFakeTimers();
    dismissBootSplash();
    expect(el.hasAttribute('data-leaving')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(document.getElementById('atlas-boot-splash')).toBeNull();
    dismissBootSplash();
    vi.useRealTimers();
  });
});
