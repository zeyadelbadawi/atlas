/**
 * Academy offline — what the learner SEES: the connectivity banner, the
 * saved-copy lesson, the honest "needs a connection" state, the video
 * notice — and that every new string exists in English and Arabic.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { LessonContentGrant } from '@types';
import {
  reportNetworkFailure,
  reportServerReached,
  resetConnectivityForTesting,
} from '@/services/offline/connectivity';
import { setOfflineSavedAt } from '@app/providers/offline/offline-status';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ session: { status: 'authenticated' } }),
  useDateFormatter: () => ({ dateTime: (iso: string) => iso }),
}));

import { LearnerConnectivityBanner } from './LearnerConnectivityBanner';
import { OfflineLessonView } from './OfflineLessonView';
import { LessonNeedsConnection } from './LessonNeedsConnection';
import { LessonActivityView } from './LessonActivityView';

let online = true;
beforeEach(() => {
  online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  resetConnectivityForTesting('online');
  setOfflineSavedAt(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LearnerConnectivityBanner', () => {
  it('is silent online and explains what still works offline', () => {
    const { container } = render(<LearnerConnectivityBanner />);
    expect(container.textContent).toBe('');

    online = false;
    setOfflineSavedAt(Date.UTC(2026, 9, 9, 14, 5));
    act(() => reportNetworkFailure());
    const banner = screen.getByRole('status');
    expect(banner.getAttribute('data-learner-connectivity')).toBe('offline');
    expect(banner.textContent).toContain(
      'learning:offline.banner.offlineTitle'
    );
    expect(banner.textContent).toContain('learning:offline.banner.savedAt');
    expect(banner.textContent).toContain('learning:offline.banner.whatWorks');
    // Logical alignment only, so it mirrors under dir="rtl".
    expect(banner.querySelector('p')?.className).toContain('text-start');

    online = true;
    act(() => reportServerReached());
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('offline lesson states', () => {
  it('a saved lesson says it is the device copy and until when it is kept', () => {
    render(
      <OfflineLessonView
        lesson={{
          kind: 'lesson',
          userId: 'u1',
          courseId: 'c1',
          lessonId: 'l1',
          title: 'Reading 1',
          bodyHtml: '<p>Offline body text</p>',
          completionRule: 'manual',
          durationSeconds: null,
          savedAt: Date.now(),
          until: Date.UTC(2026, 9, 12),
          bytes: 10,
        }}
      />
    );
    expect(screen.getByText('Offline body text')).toBeTruthy();
    expect(
      screen.getByText('learning:offline.lesson.savedCopyTitle')
    ).toBeTruthy();
    expect(
      screen.getByText(/learning:offline.lesson.savedCopyDescription/)
        .textContent
    ).toContain('2026-10-12');
  });

  it('anything else says it needs a connection — never a fake player', () => {
    const { container } = render(<LessonNeedsConnection />);
    expect(
      screen.getByText(/learning:offline\.lesson\.needsConnectionTitle/)
    ).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });

  it('a video lesson open when the connection drops is labelled online-only', () => {
    const grant = {
      lessonId: 'l1',
      courseId: 'c1',
      academyId: 'a1',
      title: 'Video',
      kind: 'external',
      isPreview: false,
      durationSeconds: 60,
      completionRule: 'manual',
      minimumWatchedRatio: null,
      protection: {} as never,
      externalUrl: 'https://example.test/x',
      resources: [],
      watermark: { enabled: false, text: '' },
      playbackLease: null,
      resumePositionSeconds: 0,
      expiresAt: new Date().toISOString(),
    } as unknown as LessonContentGrant;
    const props = {
      grant,
      leaseHeld: true,
      onCredentialFailure: vi.fn(),
      onPositionSource: vi.fn(),
      onFinished: vi.fn(),
    };
    const { rerender, container } = render(<LessonActivityView {...props} />);
    expect(container.querySelector('[data-offline-video]')).toBeNull();
    rerender(<LessonActivityView {...props} isOffline />);
    expect(container.querySelector('[data-offline-video]')).not.toBeNull();
    expect(screen.getByText('learning:offline.video.title')).toBeTruthy();
  });
});

describe('copy', () => {
  const read = (lang: string, ns: string) =>
    JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          `../../../localization/resources/${lang}/${ns}.json`
        ),
        'utf8'
      )
    ) as Record<string, unknown>;
  const at = (bundle: Record<string, unknown>, path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (node, key) => (node as Record<string, unknown> | undefined)?.[key],
        bundle
      );

  it.each(['en', 'ar'])(
    'every new learner offline string exists in %s',
    (lang) => {
      const learning = read(lang, 'learning');
      const errors = read(lang, 'errors');
      for (const path of [
        'offline.banner.offlineTitle',
        'offline.banner.savedAt',
        'offline.banner.noCopy',
        'offline.banner.whatWorks',
        'offline.banner.reconnecting',
        'offline.banner.syncing',
        'offline.banner.synced',
        'offline.lesson.savedCopyTitle',
        'offline.lesson.savedCopyDescription',
        'offline.lesson.needsConnectionTitle',
        'offline.lesson.needsConnectionDescription',
        'offline.video.title',
        'offline.video.description',
        'offline.completion.queuedTitle',
        'offline.completion.queuedComplete',
        'offline.completion.queuedUndo',
        'offline.assignment.queuedTitle',
        'offline.assignment.queuedDescription',
        'offline.assignment.conflictTitle',
        'offline.assignment.keepMine',
        'offline.assignment.useTheirs',
        'offline.assignment.cancel',
        'offline.sync.tooOld',
      ]) {
        expect(typeof at(learning, path), `${lang}: learning.${path}`).toBe(
          'string'
        );
      }
      for (const plural of ['pending', 'attention']) {
        expect(typeof at(learning, `offline.banner.${plural}_other`)).toBe(
          'string'
        );
      }
      for (const key of [
        'submissionChanged',
        'draftConflict',
        'idempotencyKeyReused',
      ]) {
        expect(typeof at(errors, `assignment.${key}`)).toBe('string');
      }
    }
  );

  it('the Arabic copy is Arabic, with all six plural forms', () => {
    const learning = read('ar', 'learning');
    expect(String(at(learning, 'offline.banner.offlineTitle'))).toMatch(
      /[؀-ۿ]/
    );
    for (const form of ['zero', 'one', 'two', 'few', 'many', 'other']) {
      expect(typeof at(learning, `offline.banner.pending_${form}`)).toBe(
        'string'
      );
    }
  });
});
