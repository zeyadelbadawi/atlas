/**
 * B3 — marketing banners and pop-up (client script): feed parsing, safe
 * text and links, dismissal per version, pop-up delay and frequency,
 * dialog accessibility (labelled, focus in, Tab trapped, Escape, backdrop,
 * focus restored) and fire-and-forget events. Storage failures tolerated.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  feedUrl,
  initAnnouncements,
  parseFeed,
  renderAnnouncements,
  sendEvent,
  type AnnouncementDeps,
  type MarketingAnnouncement,
} from './announcements';
import {
  pathMatchesPages,
  popupAllowed,
  safeStore,
  unlocalizedPath,
} from '../announcements/presentation';

const BANNER: MarketingAnnouncement = {
  id: 'b1',
  tone: 'promo',
  title: 'We are live',
  body: 'Atlas is open for every teacher.',
  ctaLabel: 'See pricing',
  ctaUrl: '/pricing',
  imageUrl: null,
  dismissible: true,
  popupDelaySeconds: 0,
  popupFrequency: 'once',
  updatedAt: '2026-10-26T10:00:00.000Z',
};
const POPUP: MarketingAnnouncement = {
  ...BANNER,
  id: 'p1',
  title: 'Exam season',
  ctaLabel: 'Read more',
  ctaUrl: '/blog',
  popupDelaySeconds: 5,
};

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    map,
  };
}

let timers: { fn: () => void; ms: number }[];
let beacon: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;
let local: ReturnType<typeof memoryStore>;
let session: ReturnType<typeof memoryStore>;

function deps(): AnnouncementDeps {
  return {
    fetch: fetchMock as unknown as typeof fetch,
    sendBeacon: beacon as unknown as AnnouncementDeps['sendBeacon'],
    local,
    session,
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
  };
}

beforeEach(() => {
  document.body.innerHTML = `
    <a href="#main" class="mk-skip">Skip</a>
    <div data-mk-announcements data-label-region="Announcement" data-label-dismiss="Dismiss announcement" data-label-close="Close"></div>
    <header data-header><a href="/">Home</a></header>
    <button id="before">Before</button>`;
  timers = [];
  beacon = vi.fn(() => true);
  fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  local = memoryStore();
  session = memoryStore();
});
afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.style.overflow = '';
});

describe('feed', () => {
  it('builds the feed URL for the page', () => {
    expect(feedUrl('ar', '/ar/pricing')).toBe(
      '/api/v1/public/site-announcements?surface=marketing&locale=ar&path=%2Far%2Fpricing'
    );
  });

  it('drops malformed items, unsafe links and keeps two banners', () => {
    const feed = parseFeed({
      banners: [
        BANNER,
        { ...BANNER, id: 'b2', ctaUrl: 'javascript:alert(1)' },
        { ...BANNER, id: 'b3' },
        { id: 'bad' },
      ],
      popup: { ...POPUP, popupDelaySeconds: 999, tone: 'weird' },
    });
    expect(feed.banners.map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(feed.banners[1].ctaUrl).toBeNull();
    expect(feed.popup?.popupDelaySeconds).toBe(60);
    expect(feed.popup?.tone).toBe('info');
    expect(parseFeed(null)).toEqual({ banners: [], popup: null });
  });

  it('matches page prefixes without the locale', () => {
    expect(unlocalizedPath('/ar/pricing/')).toBe('/pricing');
    expect(pathMatchesPages('/ar/blog/x', ['/blog'])).toBe(true);
    expect(pathMatchesPages('/blogger', ['/blog'])).toBe(false);
    expect(pathMatchesPages('/pricing', ['/'])).toBe(false);
    expect(pathMatchesPages('/anything', [])).toBe(true);
  });
});

describe('banners', () => {
  it('renders a labelled region with plain text, a safe CTA and a dismiss button, and sends a view', () => {
    renderAnnouncements(
      document,
      parseFeed({
        banners: [{ ...BANNER, body: '<img src=x onerror=alert(1)>' }],
        popup: null,
      }),
      deps()
    );
    const region = document.querySelector(
      '[role="region"][aria-label="Announcement"]'
    ) as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.querySelector('img')).toBeNull();
    expect(region.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(region.querySelector('a')?.getAttribute('href')).toBe('/pricing');
    expect(region.querySelector('button')?.getAttribute('aria-label')).toBe(
      'Dismiss announcement'
    );
    expect(beacon).toHaveBeenCalledWith(
      '/api/v1/public/site-announcements/b1/events',
      expect.any(Blob)
    );
  });

  it('remembers a dismissal for this version and sends dismiss and click events', () => {
    document.addEventListener('click', (event) => event.preventDefault(), {
      once: true,
    });
    renderAnnouncements(
      document,
      parseFeed({ banners: [BANNER], popup: null }),
      deps()
    );
    (
      document.querySelector('[data-announcement="b1"] a') as HTMLAnchorElement
    ).dispatchEvent(new MouseEvent('click', { cancelable: true }));
    (
      document.querySelector(
        '[data-announcement="b1"] button'
      ) as HTMLButtonElement
    ).click();
    expect(document.querySelector('[data-announcement]')).toBeNull();
    expect(
      local.map.get('atlas:ann:dismissed:b1:2026-10-26T10:00:00.000Z')
    ).toBe('1');
    expect(beacon).toHaveBeenCalledTimes(3);
    renderAnnouncements(
      document,
      parseFeed({ banners: [BANNER], popup: null }),
      deps()
    );
    expect(document.querySelector('[data-announcement]')).toBeNull();
    renderAnnouncements(
      document,
      parseFeed({
        banners: [{ ...BANNER, updatedAt: '2026-10-27T00:00:00.000Z' }],
        popup: null,
      }),
      deps()
    );
    expect(document.querySelector('[data-announcement]')).toBeTruthy();
  });

  it('has no close button when not dismissible', () => {
    renderAnnouncements(
      document,
      parseFeed({ banners: [{ ...BANNER, dismissible: false }], popup: null }),
      deps()
    );
    expect(document.querySelector('[data-announcement] button')).toBeNull();
  });
});

describe('pop-up', () => {
  it('opens after its delay as an accessible modal and closes with Escape, restoring focus', () => {
    (document.getElementById('before') as HTMLButtonElement).focus();
    renderAnnouncements(
      document,
      parseFeed({ banners: [], popup: POPUP }),
      deps()
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(timers[0].ms).toBe(5000);
    timers[0].fn();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(
      document.getElementById(dialog.getAttribute('aria-labelledby') as string)
        ?.textContent
    ).toBe('Exam season');
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') as string)
        ?.textContent
    ).toBe(POPUP.body);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close');
    expect(document.documentElement.style.overflow).toBe('hidden');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement?.id).toBe('before');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('keeps Tab inside the dialog and closes on a backdrop click', () => {
    renderAnnouncements(
      document,
      parseFeed({ banners: [], popup: POPUP }),
      deps()
    );
    timers[0].fn();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const focusables = dialog.querySelectorAll<HTMLElement>('a[href], button');
    const last = focusables[focusables.length - 1];
    last.focus();
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(focusables[0]);
    const backdrop = document.querySelector('[data-mk-popup]') as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('follows its frequency: once per browser, once per visit, always', () => {
    renderAnnouncements(
      document,
      parseFeed({ banners: [], popup: POPUP }),
      deps()
    );
    timers[0].fn();
    expect(popupAllowed(POPUP, { local, session })).toBe(false);
    (
      document.querySelector(
        '[role="dialog"] button[aria-label="Close"]'
      ) as HTMLButtonElement
    ).click();
    const session1 = { ...POPUP, id: 'p2', popupFrequency: 'session' as const };
    expect(popupAllowed(session1, { local, session })).toBe(true);
    renderAnnouncements(
      document,
      parseFeed({ banners: [], popup: session1 }),
      deps()
    );
    timers[timers.length - 1].fn();
    expect(popupAllowed(session1, { local, session })).toBe(false);
    expect(popupAllowed(session1, { local, session: memoryStore() })).toBe(
      true
    );
    const always = { ...POPUP, id: 'p3', popupFrequency: 'always' as const };
    expect(popupAllowed(always, { local, session })).toBe(true);
  });

  it('never opens a pop-up without a title', () => {
    renderAnnouncements(
      document,
      parseFeed({ banners: [], popup: { ...POPUP, title: null } }),
      deps()
    );
    expect(timers).toHaveLength(0);
  });
});

describe('robustness', () => {
  it('falls back to fetch keepalive when sendBeacon is unavailable', () => {
    sendEvent({ fetch: fetchMock as unknown as typeof fetch }, 'b1', 'click');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/public/site-announcements/b1/events',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
        body: '{"type":"click"}',
      })
    );
  });

  it('tolerates storage that throws', () => {
    const broken = safeStore(() => {
      throw new Error('blocked');
    });
    expect(broken.getItem('x')).toBeNull();
    expect(() => broken.setItem('x', '1')).not.toThrow();
  });

  it('fetches after load and renders nothing on a failed request', async () => {
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(new Response('nope', { status: 500 }));
    document.documentElement.lang = 'en';
    initAnnouncements(window);
    window.dispatchEvent(new Event('load'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('surface=marketing&locale=en'),
      expect.objectContaining({ credentials: 'omit' })
    );
    expect(document.querySelector('[data-announcement]')).toBeNull();
    fetchSpy.mockRestore();
  });
});
