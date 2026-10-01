/**
 * The analysis Worker's lifecycle (Theme 1 plan §F.4.3 "States"): a result
 * or an error ends it, and a Worker that never answers is terminated at
 * the time limit — the main thread never waits on it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeLogoInWorker, type AnalysisWorkerLike } from './logo-analysis';

function fakeWorker() {
  const worker: AnalysisWorkerLike & {
    terminated: boolean;
    posted: unknown[];
  } = {
    onmessage: null,
    onerror: null,
    terminated: false,
    posted: [],
    postMessage(message) {
      this.posted.push(message);
    },
    terminate() {
      this.terminated = true;
    },
  };
  return worker;
}

afterEach(() => vi.useRealTimers());

describe('analyzeLogoInWorker', () => {
  it('returns the analysis and terminates the worker', async () => {
    const worker = fakeWorker();
    const pending = analyzeLogoInWorker(new Blob(['x']), () => worker, 3000);
    const analysis = {
      seeds: { primary: '24 95% 53%' },
      candidates: [],
      flags: [],
    };
    worker.onmessage!({ data: { ok: true, analysis } } as MessageEvent);
    await expect(pending).resolves.toEqual({ ok: true, analysis });
    expect(worker.terminated).toBe(true);
  });

  it('terminates a worker that never answers, at the time limit', async () => {
    vi.useFakeTimers();
    const worker = fakeWorker();
    const pending = analyzeLogoInWorker(new Blob(['x']), () => worker, 3000);
    vi.advanceTimersByTime(2999);
    expect(worker.terminated).toBe(false);
    vi.advanceTimersByTime(1);
    await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' });
    expect(worker.terminated).toBe(true);
  });

  it('treats a decode failure or a worker error as a failed analysis', async () => {
    const a = fakeWorker();
    const first = analyzeLogoInWorker(new Blob(['x']), () => a, 3000);
    a.onmessage!({ data: { ok: false } } as MessageEvent);
    await expect(first).resolves.toEqual({ ok: false, reason: 'failed' });

    const b = fakeWorker();
    const second = analyzeLogoInWorker(new Blob(['x']), () => b, 3000);
    b.onerror!({} as ErrorEvent);
    await expect(second).resolves.toEqual({ ok: false, reason: 'failed' });
    expect(b.terminated).toBe(true);
  });

  it('fails cleanly when a worker cannot even be created', async () => {
    await expect(
      analyzeLogoInWorker(
        new Blob(['x']),
        () => {
          throw new Error('blocked');
        },
        3000
      )
    ).resolves.toEqual({ ok: false, reason: 'failed' });
  });
});
