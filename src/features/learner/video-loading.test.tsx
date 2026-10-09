/**
 * Video loading, buffering and failure (Task D), for every provider.
 *
 * Reported: a lesson video could sit on a spinner forever (a source that
 * failed before its metadata never cleared it), a YouTube lesson was a
 * black box until YouTube drew into it, and a YouTube video that could
 * not play here looked exactly like a slow one. Readiness comes from real
 * media events; the only timer is the "taking longer than usual" notice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { useMediaReadiness } from './hooks/useMediaReadiness';
import {
  BUFFERING_SHOW_AFTER_MS,
  VideoStatusOverlay,
} from './components/VideoStatusOverlay';
import { YouTubeLessonPlayer } from './components/YouTubeLessonPlayer';
import { ProtectedVideoPlayer } from './components/ProtectedVideoPlayer';
import type { GrantedVideo } from '@types';

const i18n = createI18nInstance('en');
const wrap = (ui: JSX.Element) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function videoWithReadyState(readyState = 0): HTMLVideoElement {
  const element = document.createElement('video');
  Object.defineProperty(element, 'readyState', {
    configurable: true,
    get: () => readyState,
  });
  return element;
}

/** These tests are about loading states; the watermark has its own suite. */
const NO_WATERMARK = { enabled: false, text: '' } as const;

describe('useMediaReadiness — real media events', () => {
  function setup(readyState = 0) {
    const element = videoWithReadyState(readyState);
    const ref = { current: element };
    const hook = renderHook(
      ({ key }) =>
        useMediaReadiness(ref, { sourceKey: key, slowAfterMs: 1000 }),
      { initialProps: { key: 'a' } }
    );
    const fire = (type: string) =>
      act(() => {
        element.dispatchEvent(new Event(type));
      });
    return { element, hook, fire };
  }

  it('loading until there is a frame, buffering on waiting, ready again on playing', () => {
    const { hook, fire } = setup();
    expect(hook.result.current.phase).toBe('loading');
    fire('loadeddata');
    expect(hook.result.current.phase).toBe('ready');
    fire('waiting');
    expect(hook.result.current.phase).toBe('buffering');
    fire('playing');
    expect(hook.result.current.phase).toBe('ready');
  });

  it('a source already loaded starts ready', () => {
    const { hook } = setup(4);
    expect(hook.result.current.phase).toBe('ready');
  });

  it('a browser that deliberately stops loading until play (iOS, preload=metadata) shows the poster, not a spinner', () => {
    const { hook, fire } = setup();
    fire('loadstart');
    fire('suspend');
    expect(hook.result.current.phase).toBe('ready');
  });

  it('a media error is an error, not an endless spinner', () => {
    const { hook, fire } = setup();
    fire('loadstart');
    fire('error');
    expect(hook.result.current.phase).toBe('error');
  });

  it('pausing while buffering stops waiting', () => {
    const { hook, fire } = setup(4);
    fire('waiting');
    fire('pause');
    expect(hook.result.current.phase).toBe('ready');
  });

  it('"slow" only after no network progress for the threshold; progress resets it', () => {
    vi.useFakeTimers();
    const { hook, fire } = setup();
    act(() => vi.advanceTimersByTime(700));
    fire('progress');
    act(() => vi.advanceTimersByTime(700));
    expect(hook.result.current.slow).toBe(false);
    act(() => vi.advanceTimersByTime(400));
    expect(hook.result.current.slow).toBe(true);
    fire('canplay');
    expect(hook.result.current.slow).toBe(false);
  });

  it('removes its listeners on unmount', () => {
    const { element, hook } = setup();
    const remove = vi.spyOn(element, 'removeEventListener');
    hook.unmount();
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('waiting', expect.any(Function));
  });
});

describe('VideoStatusOverlay', () => {
  it('does not flash a spinner for a short rebuffer', () => {
    vi.useFakeTimers();
    const view = wrap(
      <VideoStatusOverlay phase="buffering" slow={false} onRetry={vi.fn()} />
    );
    expect(screen.queryByTestId('video-status-loading')).toBeNull();
    act(() => vi.advanceTimersByTime(BUFFERING_SHOW_AFTER_MS + 1));
    expect(screen.getByTestId('video-status-loading')).toBeTruthy();
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <VideoStatusOverlay phase="ready" slow={false} onRetry={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.queryByTestId('video-status-loading')).toBeNull();
  });

  it('the spinner never blocks the controls under it; slow offers Retry', () => {
    const onRetry = vi.fn();
    wrap(<VideoStatusOverlay phase="loading" slow onRetry={onRetry} />);
    expect(screen.getByTestId('video-status-loading').className).toContain(
      'pointer-events-none'
    );
    expect(screen.getByText('This is taking longer than usual.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Atlas-hosted video', () => {
  const video = {
    url: 'https://media.example/lesson.mp4',
    format: 'mp4',
  } as GrantedVideo;

  beforeEach(() => {
    // jsdom has no MediaError; browsers do (the codes are the spec's).
    vi.stubGlobal('MediaError', {
      MEDIA_ERR_ABORTED: 1,
      MEDIA_ERR_NETWORK: 2,
      MEDIA_ERR_DECODE: 3,
      MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
    });
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(
      () => undefined
    );
  });

  it('a source that fails before its metadata shows the failure with Retry (it used to spin forever), and Retry reloads', () => {
    const onCredentialFailure = vi.fn();
    wrap(
      <ProtectedVideoPlayer
        video={video}
        expiresAt={new Date(Date.now() + 3_600_000).toISOString()}
        resumePositionSeconds={0}
        lessonId="l1"
        title="Lesson"
        watermark={NO_WATERMARK}
        resources={[]}
        onCredentialFailure={onCredentialFailure}
      />
    );
    expect(screen.getByTestId('video-status-loading')).toBeTruthy();
    const element = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(element, 'error', {
      configurable: true,
      value: { code: 2 /* MEDIA_ERR_NETWORK */ },
    });
    act(() => {
      element.dispatchEvent(new Event('error'));
    });
    expect(screen.queryByTestId('video-status-loading')).toBeNull();
    expect(screen.getByTestId('video-status-error')).toBeTruthy();
    // A new credential is asked for at once.
    expect(onCredentialFailure).toHaveBeenCalledTimes(1);

    const load = vi.mocked(HTMLMediaElement.prototype.load);
    load.mockClear();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('Atlas-hosted video — the replacement credential', () => {
  beforeEach(() => {
    vi.stubGlobal('MediaError', { MEDIA_ERR_NETWORK: 2, MEDIA_ERR_DECODE: 3 });
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(
      () => undefined
    );
  });

  it('after a failure, the next granted URL is adopted at once — even before the old one expires', () => {
    const props = {
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      resumePositionSeconds: 0,
      lessonId: 'l1',
      title: 'Lesson',
      watermark: NO_WATERMARK,
      resources: [],
      onCredentialFailure: vi.fn(),
    };
    const first = {
      url: 'https://media.example/a.mp4',
      format: 'mp4',
    } as GrantedVideo;
    const second = {
      url: 'https://media.example/b.mp4',
      format: 'mp4',
    } as GrantedVideo;
    const view = wrap(<ProtectedVideoPlayer video={first} {...props} />);
    const element = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(element, 'error', {
      configurable: true,
      value: { code: 2 },
    });
    act(() => {
      element.dispatchEvent(new Event('error'));
    });
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ProtectedVideoPlayer video={second} {...props} />
      </I18nextProvider>
    );
    // Failed before the fix: the new URL waited for the old credential to
    // expire, so the dead video stayed on screen.
    expect(element.getAttribute('src')).toBe('https://media.example/b.mp4');
  });
});

describe('YouTube', () => {
  const embed = { provider: 'youtube', videoId: 'dQw4w9WgXcQ' } as const;
  const show = () =>
    wrap(
      <YouTubeLessonPlayer
        embed={embed}
        title="Lesson"
        watermark={NO_WATERMARK}
      />
    );
  const frame = () =>
    screen.getByTestId('youtube-lesson-player') as HTMLIFrameElement;
  const postFromEmbed = (
    data: unknown,
    origin = 'https://www.youtube-nocookie.com',
    source: MessageEventSource | null = frame().contentWindow
  ) =>
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify(data),
          origin,
          source,
        })
      );
    });

  it('loading until the frame loads', () => {
    show();
    expect(screen.getByTestId('video-status-loading')).toBeTruthy();
    fireEvent.load(frame());
    expect(screen.queryByTestId('video-status-loading')).toBeNull();
  });

  it('ready on the embed’s own onReady — from YouTube and this frame only', () => {
    show();
    postFromEmbed({ event: 'onReady' }, 'https://evil.example');
    expect(screen.getByTestId('video-status-loading')).toBeTruthy();
    postFromEmbed({ event: 'onReady' }, undefined, window);
    expect(screen.getByTestId('video-status-loading')).toBeTruthy();
    postFromEmbed({ event: 'onReady' });
    expect(screen.queryByTestId('video-status-loading')).toBeNull();
  });

  it('a video that cannot be embedded says so, and Retry reloads the frame', () => {
    show();
    fireEvent.load(frame());
    const first = frame();
    postFromEmbed({ event: 'onError', info: 150 });
    expect(screen.getByTestId('video-status-error').textContent).toMatch(
      /can’t be played here/
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(frame()).not.toBe(first);
    expect(screen.getByTestId('video-status-loading')).toBeTruthy();
  });

  it('a frame that does not load is "slow" with Retry, never an endless spinner', () => {
    vi.useFakeTimers();
    show();
    act(() => vi.advanceTimersByTime(15_001));
    expect(screen.getByText('This is taking longer than usual.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
