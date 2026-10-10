/**
 * The academy build screen's window: random 45–75 s per request, kept
 * across a reload, never trusting a tampered or stale stored value.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  ACADEMY_BUILD_MAX_MS,
  ACADEMY_BUILD_MIN_MS,
  academyBuildRemainingMs,
  finishAcademyBuild,
  isAcademyBuildActive,
  readAcademyBuild,
  resetAcademyBuildTimersForTests,
  startAcademyBuild,
} from './utils/academy-build-timer';
import { buildProgressAt } from './utils/academy-build-progress';

afterEach(() => {
  window.sessionStorage.clear();
  resetAcademyBuildTimersForTests();
});

describe('academy build timer', () => {
  it('picks a window between 45 and 75 seconds and reuses it for the same request', () => {
    for (let i = 0; i < 50; i += 1) {
      const timer = startAcademyBuild(`req-${i}`, 1_000);
      expect(timer.durationMs).toBeGreaterThanOrEqual(ACADEMY_BUILD_MIN_MS);
      expect(timer.durationMs).toBeLessThanOrEqual(ACADEMY_BUILD_MAX_MS);
    }
    const first = startAcademyBuild('req-x', 1_000);
    expect(startAcademyBuild('req-x', 5_000)).toEqual(first);
  });

  it('survives a reload through sessionStorage', () => {
    const timer = startAcademyBuild('req-r', 1_000);
    resetAcademyBuildTimersForTests(); // in-memory state gone, as after a reload
    expect(readAcademyBuild('req-r', 2_000)).toEqual(timer);
    expect(academyBuildRemainingMs('req-r', 2_000)).toBe(
      timer.durationMs - 1_000
    );
  });

  it('ignores a tampered or stale stored value', () => {
    const now = Date.now();
    window.sessionStorage.setItem(
      'atlas:academyBuild:req-t',
      JSON.stringify({ startedAt: now, durationMs: 10 * 60_000 })
    );
    expect(readAcademyBuild('req-t', now)).toBeUndefined();
    window.sessionStorage.setItem(
      'atlas:academyBuild:req-s',
      JSON.stringify({ startedAt: now - 60 * 60_000, durationMs: 50_000 })
    );
    expect(readAcademyBuild('req-s', now)).toBeUndefined();
    window.sessionStorage.setItem('atlas:academyBuild:req-j', '{oops');
    expect(readAcademyBuild('req-j', now)).toBeUndefined();
  });

  it('is active until finished, then clears its storage', () => {
    startAcademyBuild('req-f');
    expect(isAcademyBuildActive('req-f')).toBe(true);
    finishAcademyBuild('req-f');
    expect(isAcademyBuildActive('req-f')).toBe(false);
    expect(
      window.sessionStorage.getItem('atlas:academyBuild:req-f')
    ).toBeNull();
  });

  it('never reports 100 % from the window alone and walks the stages in order', () => {
    expect(buildProgressAt(0, 60_000)).toEqual({ stageIndex: 0, percent: 0 });
    const end = buildProgressAt(60_000, 60_000);
    expect(end.percent).toBeLessThan(100);
    expect(end.stageIndex).toBe(9);
    expect(buildProgressAt(30_000, 60_000).stageIndex).toBeGreaterThan(0);
  });
});
