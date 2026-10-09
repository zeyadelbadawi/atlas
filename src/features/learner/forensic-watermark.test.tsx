/**
 * The forensic video watermark (backend `docs/FORENSIC_WATERMARK.md`).
 *
 * What these protect:
 *   - every player draws the SERVER's code (and masked identity / preview
 *     host) over the picture, as a moving label plus a full-frame pattern;
 *   - fullscreen is always the frame, never the bare media element, and a
 *     media element that goes fullscreen on its own is pulled back out;
 *   - the bare elements offer no fullscreen, PiP, casting or presentation
 *     route around the watermark;
 *   - removing or hiding a layer pauses playback, says why, reports once,
 *     and can be undone — but never trips while the player is not laid out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { ContentWatermark, GrantedVideo } from '@types';
import {
  ForensicWatermarkFrame,
  resolveWatermark,
  type ForensicWatermarkFrameHandle,
} from './components/forensic';
import { buildWatermarkPattern } from './components/forensic/watermark-pattern';
import { ProtectedVideoPlayer } from './components/ProtectedVideoPlayer';
import { YouTubeLessonPlayer } from './components/YouTubeLessonPlayer';

const reportWatermarkTamper = vi.fn((_code: string) => Promise.resolve());
vi.mock('./components/forensic/watermark-tamper.service', () => ({
  watermarkTamperService: {
    report: (code: string) => reportWatermarkTamper(code),
  },
}));

const i18n = createI18nInstance('en');
const wrap = (ui: JSX.Element) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

const ACCOUNT: ContentWatermark = {
  enabled: true,
  text: '7K3QM-X9TR7 · l•••@gmail.com',
  code: '7K3QM-X9TR7',
  kind: 'account',
  maskedIdentity: 'l•••@gmail.com',
  host: null,
};

const video = {
  format: 'mp4',
  url: 'https://media.example/a.mp4',
} as GrantedVideo;

/** jsdom lays nothing out; the watchdog only runs on a visible player. */
function layOut(width = 640, height = 360) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
  );
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
    () => [{}] as unknown as DOMRectList
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  reportWatermarkTamper.mockClear();
  document.body.style.overflow = '';
});

describe('resolveWatermark', () => {
  it('uses the structured code and masked identity when the server sends them', () => {
    expect(resolveWatermark(ACCOUNT)).toEqual({
      code: '7K3QM-X9TR7',
      primary: '7K3QM-X9TR7',
      secondary: 'l•••@gmail.com',
      kind: 'account',
    });
  });

  it('shows the academy host for an anonymous preview, never an identity', () => {
    expect(
      resolveWatermark({
        enabled: true,
        text: 'x',
        code: 'AB12C-DE34F',
        kind: 'preview',
        maskedIdentity: null,
        host: 'academy.example',
      })
    ).toMatchObject({ kind: 'preview', secondary: 'academy.example' });
  });

  it('falls back to the flat server label verbatim, and draws nothing when disabled or empty', () => {
    expect(resolveWatermark({ enabled: true, text: 'ID 1A2B3C4D' })).toEqual({
      code: null,
      primary: 'ID 1A2B3C4D',
      secondary: null,
      kind: 'account',
    });
    expect(
      resolveWatermark({ enabled: false, text: 'ID 1A2B3C4D' })
    ).toBeNull();
    expect(resolveWatermark({ enabled: true, text: '  ' })).toBeNull();
    expect(resolveWatermark(undefined)).toBeNull();
  });
});

describe('buildWatermarkPattern', () => {
  it('carries the code in an escaped SVG tile a CSS parser accepts', () => {
    const pattern = buildWatermarkPattern('<b>&"x"</b>');
    expect(pattern.startsWith('url("data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(pattern.slice(24, -2));
    expect(svg).toContain('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
    expect(svg).not.toContain('<b>');
    // Nothing that ends `url(...)` early is left unencoded.
    expect(pattern.slice(4, -1)).not.toMatch(/[()']/);
  });
});

describe('ForensicWatermarkFrame', () => {
  function renderFrame(onTamper = vi.fn()) {
    const ref = { current: null as ForensicWatermarkFrameHandle | null };
    wrap(
      <ForensicWatermarkFrame
        ref={(handle) => {
          ref.current = handle;
        }}
        watermark={resolveWatermark(ACCOUNT)!}
        onTamper={onTamper}
      >
        <div data-testid="media" />
      </ForensicWatermarkFrame>
    );
    return { ref, onTamper };
  }

  it('draws the code and masked identity over the media, plus the full-frame pattern, without catching the pointer', () => {
    renderFrame();
    const label = screen.getByTestId('forensic-watermark-label');
    expect(label.textContent).toBe('7K3QM-X9TR7 · l•••@gmail.com');
    expect(label.getAttribute('aria-hidden')).toBe('true');
    expect(label.className).toContain('pointer-events-none');
    const pattern = screen.getByTestId('forensic-watermark-pattern');
    expect(pattern.style.backgroundImage).toContain('data:image/svg+xml');
    expect(pattern.className).toContain('pointer-events-none');
    const frame = screen.getByTestId('media').closest('[data-forensic-frame]');
    expect(frame?.contains(label)).toBe(true);
  });

  it('moves the label to a visibly different place within 45 seconds', () => {
    vi.useFakeTimers();
    renderFrame();
    const label = screen.getByTestId('forensic-watermark-label');
    const before = `${label.style.top}|${label.style.insetInlineStart}`;
    act(() => {
      vi.advanceTimersByTime(46_000);
    });
    const after = `${label.style.top}|${label.style.insetInlineStart}`;
    expect(after).not.toBe(before);
  });

  it('never trips while the player is not laid out (a hidden tab, a closed dialog)', () => {
    vi.useFakeTimers();
    const { onTamper } = renderFrame();
    act(() => {
      screen.getByTestId('forensic-watermark-label').remove();
      vi.advanceTimersByTime(5_000);
    });
    expect(onTamper).not.toHaveBeenCalled();
  });

  it('pauses, explains, reports once, and restores the layers on resume when the label is removed', () => {
    vi.useFakeTimers();
    layOut();
    const { onTamper } = renderFrame();

    act(() => {
      screen.getByTestId('forensic-watermark-label').remove();
      vi.advanceTimersByTime(2_500);
    });

    expect(onTamper).toHaveBeenCalledWith('removed');
    expect(screen.getByTestId('forensic-watermark-tamper').textContent).toMatch(
      /playback paused/i
    );
    expect(reportWatermarkTamper).toHaveBeenCalledTimes(1);
    expect(reportWatermarkTamper).toHaveBeenCalledWith('7K3QM-X9TR7');

    fireEvent.click(
      screen.getByRole('button', { name: /restore and continue/i })
    );
    expect(screen.queryByTestId('forensic-watermark-tamper')).toBeNull();
    expect(
      screen.getByTestId('forensic-watermark-label').textContent
    ).toContain('7K3QM-X9TR7');

    // Removed again straight away: paused again, but not reported twice
    // inside the 30-second window.
    act(() => {
      screen.getByTestId('forensic-watermark-label').remove();
      vi.advanceTimersByTime(2_500);
    });
    expect(onTamper).toHaveBeenCalledTimes(2);
    expect(reportWatermarkTamper).toHaveBeenCalledTimes(1);
  });

  it('trips on a hidden or altered label, not only a removed one', () => {
    vi.useFakeTimers();
    layOut();
    const { onTamper } = renderFrame();
    act(() => {
      screen.getByTestId('forensic-watermark-label').style.visibility =
        'hidden';
      vi.advanceTimersByTime(2_500);
    });
    expect(onTamper).toHaveBeenCalledWith('hidden');

    cleanup();
    const second = renderFrame(vi.fn());
    act(() => {
      screen.getByTestId('forensic-watermark-label').textContent =
        'nothing here';
      vi.advanceTimersByTime(2_500);
    });
    expect(second.onTamper).toHaveBeenCalledWith('altered');
  });

  it('trips when the pattern layer loses its tile', () => {
    vi.useFakeTimers();
    layOut();
    const { onTamper } = renderFrame();
    act(() => {
      screen.getByTestId('forensic-watermark-pattern').style.backgroundImage =
        'none';
      vi.advanceTimersByTime(2_500);
    });
    expect(onTamper).toHaveBeenCalledWith('altered');
  });

  it('makes the FRAME fullscreen when the browser can', () => {
    const request = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    HTMLElement.prototype.requestFullscreen = request;
    const { ref } = renderFrame();

    act(() => ref.current?.toggleFullscreen());

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.contexts[0]).toBe(
      screen.getByTestId('media').closest('[data-forensic-frame]')
    );
    // @ts-expect-error -- test cleanup of a stubbed browser API
    delete HTMLElement.prototype.requestFullscreen;
  });

  it('fills the viewport instead where only media can go fullscreen (iPhone), and Escape leaves', () => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: false,
    });
    const { ref } = renderFrame();
    const frame = screen.getByTestId('media').closest('[data-forensic-frame]')!;

    act(() => ref.current?.toggleFullscreen());
    expect(frame.className).toContain('fixed');
    expect(frame.getAttribute('data-fullscreen')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(
      screen.getByRole('button', { name: /exit full screen/i })
    ).toBeTruthy();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(frame.className).not.toContain('fixed');
    expect(document.body.style.overflow).toBe('');
  });

  it('pulls a media element that went fullscreen on its own back out, and shows the frame instead', () => {
    const exit = vi.fn(() => Promise.resolve());
    document.exitFullscreen = exit;
    renderFrame();
    const media = screen.getByTestId('media');
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => media,
    });

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(exit).toHaveBeenCalled();
    expect(
      media.closest('[data-forensic-frame]')?.getAttribute('data-fullscreen')
    ).toBe('true');
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });
  });
});

describe('ProtectedVideoPlayer — no route around the watermark', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(
      () => undefined
    );
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
      () => undefined
    );
  });

  function renderPlayer() {
    return wrap(
      <ProtectedVideoPlayer
        video={video}
        expiresAt={new Date(Date.now() + 3_600_000).toISOString()}
        resumePositionSeconds={0}
        lessonId="l1"
        title="Lesson"
        watermark={ACCOUNT}
        resources={[]}
        onCredentialFailure={vi.fn()}
      />
    );
  }

  it('turns off the element’s own fullscreen, PiP and casting, and draws the watermark over it', () => {
    renderPlayer();
    const element = document.querySelector('video')!;
    expect((element.getAttribute('controlslist') ?? '').split(' ')).toEqual(
      expect.arrayContaining(['nodownload', 'nofullscreen', 'noremoteplayback'])
    );
    expect(element.hasAttribute('disablepictureinpicture')).toBe(true);
    expect(element.hasAttribute('disableremoteplayback')).toBe(true);
    expect(element.getAttribute('x-webkit-airplay')).toBe('deny');
    expect(element.closest('[data-forensic-frame]')).toBeTruthy();
    expect(
      screen.getByTestId('forensic-watermark-label').textContent
    ).toContain('7K3QM-X9TR7');
    expect(
      screen.getByTestId('forensic-watermark-caption').textContent
    ).toMatch(/personal watermark/i);
  });

  it('F and the Full screen button fullscreen the frame — never the video element', () => {
    const request = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    HTMLElement.prototype.requestFullscreen = request;
    renderPlayer();
    const element = document.querySelector('video')!;
    const frame = element.closest('[data-forensic-frame]');

    fireEvent.keyDown(screen.getByRole('group'), { key: 'f' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.contexts[0]).toBe(frame);

    fireEvent.click(screen.getByRole('button', { name: /^full screen$/i }));
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.contexts.every((context) => context === frame)).toBe(
      true
    );
    // @ts-expect-error -- test cleanup of a stubbed browser API
    delete HTMLElement.prototype.requestFullscreen;
  });

  it('pauses the video when the watchdog trips', () => {
    vi.useFakeTimers();
    layOut();
    renderPlayer();
    act(() => {
      screen.getByTestId('forensic-watermark-pattern').remove();
      vi.advanceTimersByTime(2_500);
    });
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByTestId('forensic-watermark-tamper')).toBeTruthy();
  });
});

describe('YouTube — the embed cannot leave the frame', () => {
  it('embeds with fs=0 and no fullscreen, PiP or presentation permission, under the watermark', () => {
    wrap(
      <YouTubeLessonPlayer
        embed={{ provider: 'youtube', videoId: 'dQw4w9WgXcQ' }}
        title="Lesson"
        watermark={ACCOUNT}
      />
    );
    const frame = screen.getByTestId(
      'youtube-lesson-player'
    ) as HTMLIFrameElement;
    expect(new URL(frame.src).searchParams.get('fs')).toBe('0');
    expect(frame.hasAttribute('allowfullscreen')).toBe(false);
    expect(frame.getAttribute('allow') ?? '').not.toContain(
      'picture-in-picture'
    );
    expect(frame.getAttribute('sandbox') ?? '').not.toContain(
      'allow-presentation'
    );
    expect(frame.closest('[data-forensic-frame]')).toBeTruthy();
    expect(
      screen.getByTestId('forensic-watermark-label').textContent
    ).toContain('7K3QM-X9TR7');
  });
});
