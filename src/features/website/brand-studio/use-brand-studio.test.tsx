/**
 * Brand Studio state (Theme 1 plan §F.4.5, §I.2 "Manual colour override",
 * "Regeneration"): a logo proposes a palette; the four alternatives cycle
 * deterministically and keep overrides; a failing override can't be
 * accepted until fixed; any edit after accepting makes it "proposed" again;
 * a failed analysis keeps the last good palette.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BRAND_PALETTE_VARIANTS, contrastRatio } from '../brand-engine';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { toPaletteInput, useBrandStudio } from './useBrandStudio';
import type { AnalysisWorkerLike } from './logo-analysis';

const theme = getWebsiteTheme('modern-education');

function pngFile(): File {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 64);
  view.setUint32(20, 64);
  return new File([bytes], 'logo.png', { type: 'image/png' });
}

/** A worker that answers with `analysis` (or fails when `null`). */
function workerAnswering(analysis: unknown | null) {
  return (): AnalysisWorkerLike => {
    const worker: AnalysisWorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage() {
        queueMicrotask(() =>
          worker.onmessage?.({
            data: analysis ? { ok: true, analysis } : { ok: false },
          } as MessageEvent)
        );
      },
      terminate: vi.fn(),
    };
    return worker;
  };
}

const ORANGE_LOGO = {
  seeds: { primary: '24 95% 53%', secondary: '199 89% 38%' },
  candidates: [{ color: '24 95% 53%', share: 0.7, class: 'chromatic' }],
  flags: [],
};

describe('useBrandStudio', () => {
  it('starts from the theme default, then proposes the palette a logo suggests', async () => {
    const { result } = renderHook(() =>
      useBrandStudio({
        theme,
        analysisOptions: { createWorker: workerAnswering(ORANGE_LOGO) },
      })
    );
    expect(result.current.draft.source).toBe('themeDefault');

    await act(() => result.current.actions.analyzeFile(pngFile()));
    await waitFor(() => expect(result.current.analysis.kind).toBe('done'));
    expect(result.current.draft).toMatchObject({
      source: 'logo',
      status: 'proposed',
      seeds: ORANGE_LOGO.seeds,
    });
    expect(result.current.draft.extraction?.logoFingerprint).toMatch(
      /^[a-f0-9]{64}$/
    );
    expect(result.current.hasLogoSuggestion).toBe(true);
    // Every text pair of the proposal passes (the engine's guarantee, live).
    expect(result.current.validation.valid).toBe(true);
  });

  it('keeps the last good palette when a logo cannot be analysed', async () => {
    const { result } = renderHook(() =>
      useBrandStudio({
        theme,
        analysisOptions: { createWorker: workerAnswering(null) },
      })
    );
    const before = result.current.palette.roles;
    await act(() => result.current.actions.analyzeFile(pngFile()));
    expect(result.current.analysis).toEqual({
      kind: 'error',
      error: 'analysisFailed',
    });
    expect(result.current.palette.roles).toEqual(before);
  });

  it('cycles the four deterministic alternatives, keeping role overrides', () => {
    const { result } = renderHook(() => useBrandStudio({ theme }));
    act(() => result.current.actions.setOverride('link', '221 83% 30%'));
    const seen: string[] = [];
    for (let i = 0; i < BRAND_PALETTE_VARIANTS.length; i += 1) {
      seen.push(result.current.variant);
      expect(result.current.palette.roles.link).toBe('221 83% 30%');
      act(() => result.current.actions.regenerate());
    }
    expect(seen).toEqual([...BRAND_PALETTE_VARIANTS]);
    expect(result.current.variant).toBe(BRAND_PALETTE_VARIANTS[0]);
  });

  it('blocks accepting a failing override and offers the nearest passing colour', () => {
    const { result } = renderHook(() => useBrandStudio({ theme }));
    act(() => result.current.actions.setOverride('link', '221 83% 80%'));
    expect(result.current.validation.valid).toBe(false);
    act(() => result.current.actions.accept());
    expect(result.current.draft.status).toBe('proposed');

    // One suggestion that passes every pair the link is in (background AND
    // surface), not just the first one that failed.
    act(() => result.current.actions.applySuggestion('link'));
    expect(result.current.validation.valid).toBe(true);
    const { roles } = result.current.palette;
    expect(contrastRatio(roles.link, roles.background)).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrastRatio(roles.link, roles.surface)).toBeGreaterThanOrEqual(
      4.5
    );
    act(() => result.current.actions.accept());
    expect(result.current.draft.status).toBe('confirmed');
  });

  it('any change after accepting makes the palette "proposed" again', () => {
    const { result } = renderHook(() => useBrandStudio({ theme }));
    act(() => result.current.actions.accept());
    expect(result.current.draft.status).toBe('confirmed');
    act(() => result.current.actions.setSeed('primary', '262 70% 50%'));
    expect(result.current.draft).toMatchObject({
      status: 'proposed',
      source: 'manual',
    });
  });

  it('resets to the theme default, dropping overrides', () => {
    const { result } = renderHook(() => useBrandStudio({ theme }));
    act(() => result.current.actions.setSeed('primary', '262 70% 50%'));
    act(() => result.current.actions.setOverride('focus', '262 70% 40%'));
    act(() => result.current.actions.resetToThemeDefault());
    expect(result.current.draft).toMatchObject({
      source: 'themeDefault',
      overrides: {},
      seeds: { primary: theme.tokens.defaultPrimary },
    });
  });

  it('sends only inputs to the server, never derived roles', () => {
    const { result } = renderHook(() => useBrandStudio({ theme }));
    const input = toPaletteInput(result.current.draft);
    expect(Object.keys(input).sort()).toEqual(
      ['overrides', 'seeds', 'source', 'status', 'variant'].sort()
    );
  });

  // Reported as "the preview gets stuck": a throw during analysis left the
  // studio "analyzing" for good, which disables the logo picker.
  it('a file that cannot be read ends as a failure, never stuck "analyzing"', async () => {
    const { result } = renderHook(() =>
      useBrandStudio({
        theme,
        analysisOptions: { createWorker: workerAnswering(ORANGE_LOGO) },
      })
    );
    const unreadable = pngFile();
    unreadable.arrayBuffer = () => Promise.reject(new Error('read failed'));
    await act(async () => {
      await result.current.actions.analyzeFile(unreadable).catch(() => {});
    });
    await waitFor(() =>
      expect(result.current.analysis).toEqual({
        kind: 'error',
        error: 'analysisFailed',
      })
    );
  });
});
