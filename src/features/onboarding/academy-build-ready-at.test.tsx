/**
 * The build screen reaches 100 % at the server's `presentedReadyAt` —
 * the instant the backend releases the "your academy is ready" email —
 * and never before it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import {
  ACADEMY_BUILD_MAX_MS,
  ACADEMY_BUILD_MIN_MS,
  AcademyBuildExperience,
  presentedBuildWindow,
  readAcademyBuild,
  resetAcademyBuildTimersForTests,
  startAcademyBuild,
  syncAcademyBuild,
} from '@components/academy-build';

const CREATED_AT = Date.parse('2026-11-06T10:00:00.000Z');
const WINDOW_MS = 52_000;
const READY_AT = CREATED_AT + WINDOW_MS;
const presented = {
  createdAt: new Date(CREATED_AT).toISOString(),
  presentedReadyAt: new Date(READY_AT).toISOString(),
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'Date',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
  vi.setSystemTime(CREATED_AT);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
  resetAcademyBuildTimersForTests();
});

describe('the build window is the server’s', () => {
  it('pins the bounds the backend picks the window from (keep in step with presented-build.ts)', () => {
    // MIRRORED: PRESENTED_BUILD_MIN_MS / PRESENTED_BUILD_MAX_MS in
    // atlas-backend/src/provisioning/dto/presented-build.ts. Changing these
    // alone fails this test on purpose.
    expect(ACADEMY_BUILD_MIN_MS).toBe(45_000);
    expect(ACADEMY_BUILD_MAX_MS).toBe(75_000);
  });

  it('starts the create-response timer for the server’s window', () => {
    const timer = startAcademyBuild('req-1', CREATED_AT, presented);
    expect(timer).toEqual({
      startedAt: CREATED_AT,
      durationMs: WINDOW_MS,
      presented: true,
    });
  });

  it('replaces a locally guessed window with the server’s, counted from createdAt', () => {
    vi.setSystemTime(CREATED_AT + 10_000);
    startAcademyBuild('req-2', CREATED_AT + 10_000); // older response: random
    const timer = syncAcademyBuild('req-2', presented, CREATED_AT + 10_000);
    expect(timer.startedAt).toBe(CREATED_AT);
    expect(timer.durationMs).toBe(WINDOW_MS);
    expect(readAcademyBuild('req-2', CREATED_AT + 10_000)).toEqual(timer);
  });

  it('ignores a missing or out-of-bounds window (falls back to the local one)', () => {
    expect(
      presentedBuildWindow({ createdAt: presented.createdAt })
    ).toBeUndefined();
    expect(
      presentedBuildWindow({
        createdAt: presented.createdAt,
        presentedReadyAt: new Date(CREATED_AT + 10 * 60_000).toISOString(),
      })
    ).toBeUndefined();
  });
});

function renderBuild(serverReady: boolean) {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <AcademyBuildExperience
        requestId="req-ring"
        academyName="Nile Academy"
        serverReady={serverReady}
        presented={presented}
        onComplete={() => undefined}
      />
    </I18nextProvider>
  );
}

const percentShown = () =>
  Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'));

describe('the ring reaches 100 % at presentedReadyAt', () => {
  it('fast provisioning: holds below 100 % until readyAt, then completes', () => {
    // The request was created on this device a moment ago.
    startAcademyBuild('req-ring', CREATED_AT, presented);
    renderBuild(true); // the server finished its real work long ago

    act(() => {
      vi.advanceTimersByTime(WINDOW_MS - 1_000);
    });
    expect(percentShown()).toBeLessThan(100);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(Date.now()).toBe(READY_AT);
    expect(percentShown()).toBe(100);
  });

  it('opened on another device mid-build: still ends at readyAt, not a fresh window later', () => {
    vi.setSystemTime(CREATED_AT + 30_000);
    renderBuild(true);
    expect(percentShown()).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(WINDOW_MS - 30_000 - 500);
    });
    expect(percentShown()).toBeLessThan(100);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(percentShown()).toBe(100);
  });

  it('slow provisioning: the ring holds past readyAt until the server is really ready', () => {
    startAcademyBuild('req-ring', CREATED_AT, presented);
    const view = renderBuild(false);
    act(() => {
      vi.advanceTimersByTime(WINDOW_MS + 20_000);
    });
    expect(percentShown()).toBeLessThan(100);

    view.rerender(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <AcademyBuildExperience
          requestId="req-ring"
          academyName="Nile Academy"
          serverReady
          presented={presented}
          onComplete={() => undefined}
        />
      </I18nextProvider>
    );
    expect(percentShown()).toBe(100);
  });
});
