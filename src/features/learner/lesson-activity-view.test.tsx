import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { LessonContentGrant } from '@types';
import { LessonActivityView } from './components/LessonActivityView';

const i18n = createI18nInstance('en');
const RENDER_TIMEOUT = 20_000;

function grant(overrides: Partial<LessonContentGrant>): LessonContentGrant {
  return {
    lessonId: 'l-1',
    courseId: 'c-1',
    academyId: 'a-1',
    title: 'Numbers 1-10',
    kind: 'external',
    isPreview: false,
    durationSeconds: null,
    completionRule: 'manual',
    minimumWatchedRatio: null,
    protection: {
      tier: null,
      signedUrl: false,
      boundToSession: false,
      boundToDevice: false,
      revocableBeforeExpiry: false,
      originRestricted: false,
      watermark: false,
      drm: false,
      expiresInSeconds: 0,
    },
    resources: [],
    watermark: { enabled: false, text: '' },
    playbackLease: null,
    resumePositionSeconds: 0,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    ...overrides,
  } as LessonContentGrant;
}

function show(value: LessonContentGrant): void {
  render(
    <I18nextProvider i18n={i18n}>
      <LessonActivityView
        grant={value}
        leaseHeld
        onCredentialFailure={vi.fn()}
        onPositionSource={vi.fn()}
        onFinished={vi.fn()}
      />
    </I18nextProvider>
  );
}

afterEach(cleanup);

/**
 * The unified player's SOURCE selection for external lessons. The server
 * decides what is embeddable (`externalEmbed`); this view must embed only
 * from that descriptor's id, never from the URL, and must keep every other
 * external address as a link-out.
 */
describe('LessonActivityView — external sources', () => {
  it(
    'embeds a supported YouTube lesson inline, by vetted id, on the privacy host',
    () => {
      show(
        grant({
          externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90',
          externalEmbed: {
            provider: 'youtube',
            videoId: 'dQw4w9WgXcQ',
            startSeconds: 90,
          },
        })
      );

      const frame = screen.getByTestId('youtube-lesson-player');
      expect(frame.tagName).toBe('IFRAME');
      const src = new URL(frame.getAttribute('src') ?? '');
      expect(`${src.origin}${src.pathname}`).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
      );
      expect(Object.fromEntries(src.searchParams)).toEqual({
        rel: '0',
        modestbranding: '1',
        start: '90',
        // The embed's own fullscreen is off: the forensic watermark frame
        // goes fullscreen instead, so the watermark stays on screen.
        fs: '0',
        // The embed's ready/error events, for this page only (Task D).
        enablejsapi: '1',
        origin: window.location.origin,
      });
      expect(frame.getAttribute('title')).toMatch(/Numbers 1-10/);
      expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
      // The learner is told, on the page, what this source is and is not.
      expect(screen.getByText(/hosted on YouTube/)).toBeTruthy();
      // No link-out card for an embedded lesson.
      expect(
        screen.queryByRole('link', { name: /open in a new tab/i })
      ).toBeNull();
    },
    RENDER_TIMEOUT
  );

  it(
    'keeps an unsupported external URL as a link-out and never frames it',
    () => {
      show(grant({ externalUrl: 'https://example.com/embed/lesson' }));

      expect(document.querySelector('iframe')).toBeNull();
      const link = screen.getByRole('link', { name: /open in a new tab/i });
      expect(link.getAttribute('href')).toBe(
        'https://example.com/embed/lesson'
      );
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(screen.getByText(/hosted somewhere else/)).toBeTruthy();
    },
    RENDER_TIMEOUT
  );

  it(
    'refuses to frame an embed descriptor whose id is not a YouTube id, even if the server sent one',
    () => {
      show(
        grant({
          externalUrl: 'https://www.youtube.com/watch?v=x',
          externalEmbed: { provider: 'youtube', videoId: '<script>' },
        })
      );

      expect(document.querySelector('iframe')).toBeNull();
    },
    RENDER_TIMEOUT
  );

  it(
    'renders a text lesson as text, with no iframe and no link-out',
    () => {
      show(grant({ kind: 'text', bodyHtml: '<p>Reading material</p>' }));

      expect(screen.getByText('Reading material')).toBeTruthy();
      expect(document.querySelector('iframe')).toBeNull();
      expect(
        screen.queryByRole('link', { name: /open in a new tab/i })
      ).toBeNull();
    },
    RENDER_TIMEOUT
  );
});
