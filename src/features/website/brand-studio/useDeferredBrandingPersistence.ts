/**
 * Saves branding chosen during setup once the Academy exists (Theme 1 plan
 * §F.4.3 step 3):
 *   - the logo, as soon as the `academy` step reports an `academyId`
 *     (uploaded as a MediaAsset, then set on Academy branding);
 *   - the palette, once the `theme` step has created the website
 *     configuration it lives in.
 * Each save is retried with backoff (1 s, 2 s, 4 s); if it still fails the
 * caller shows a "Finish branding" card whose retry starts again. Each step
 * is recorded as done, so nothing is saved twice.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaService } from '@features/media';
import { academyService } from '@features/academy';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import { pendingBrandingStore } from './pending-branding';
import type { ProvisioningRequest } from '@types';

export const BRANDING_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

export type DeferredBrandingState = 'none' | 'saving' | 'saved' | 'failed';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function withRetries<T>(
  task: () => Promise<T>,
  delays: readonly number[],
  wait: (ms: number) => Promise<void>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < delays.length) await wait(delays[attempt]);
    }
  }
  throw lastError;
}

export interface UseDeferredBrandingOptions {
  /** Injected in tests. */
  readonly delays?: readonly number[];
  readonly wait?: (ms: number) => Promise<void>;
}

export function useDeferredBrandingPersistence(
  request: Pick<ProvisioningRequest, 'id' | 'academyId' | 'steps'> | undefined,
  options: UseDeferredBrandingOptions = {}
): { readonly state: DeferredBrandingState; readonly retry: () => void } {
  const delays = options.delays ?? BRANDING_RETRY_DELAYS_MS;
  const wait =
    options.wait ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const entry = request ? pendingBrandingStore.get(request.id) : undefined;
  const [state, setState] = useState<DeferredBrandingState>(() =>
    !entry ? 'none' : entry.logoSaved && entry.paletteSaved ? 'saved' : 'saving'
  );
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);

  const academyId = request?.academyId;
  const themeReady = !!request?.steps.some(
    (step) => step.key === 'theme' && step.status === 'completed'
  );
  const themeSkipped = !!request?.steps.some(
    (step) => step.key === 'theme' && step.status === 'skipped'
  );

  useEffect(() => {
    if (!request || !entry || !academyId || running.current) return;
    const logoDue = !!entry.logoFile && !entry.logoSaved;
    // No theme, no website configuration: the palette has nowhere to go.
    const paletteDue = !!entry.palette && !entry.paletteSaved && !themeSkipped;
    if (!logoDue && !(paletteDue && themeReady)) {
      if (!logoDue && !paletteDue) {
        setState('saved');
        pendingBrandingStore.clear(request.id);
      }
      return;
    }
    running.current = true;
    setState('saving');
    void (async () => {
      try {
        if (logoDue) {
          const file = entry.logoFile!;
          const dataUrl = await readFileAsDataUrl(file);
          await withRetries(
            async () => {
              const asset = await mediaService.uploadAsset(academyId, {
                fileName: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
                dataUrl,
              });
              await academyService.updateAcademyBranding(academyId, {
                logo: asset.url,
              });
            },
            delays,
            wait
          );
          entry.logoSaved = true;
        }
        if (paletteDue && themeReady) {
          await withRetries(
            () =>
              websiteConfigurationService.updateConfiguration(academyId, {
                brand: {
                  palette: entry.palette as unknown as Record<string, unknown>,
                },
              }),
            delays,
            wait
          );
          entry.paletteSaved = true;
        }
        running.current = false;
        // Re-evaluate: the palette may still be waiting for the theme step.
        setAttempt((n) => n + 1);
      } catch {
        running.current = false;
        setState('failed');
      }
    })();
    // `attempt` re-runs this after a retry or a finished step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, academyId, themeReady, themeSkipped, attempt]);

  const retry = useCallback(() => {
    setState('saving');
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
