/**
 * Forensic watermark lookup hook (docs/FORENSIC_WATERMARK.md).
 *
 * `code` is the NORMALISED code the page has already validated
 * client-side, or `null` — nothing is requested until a valid code is
 * submitted, so a misread never costs an audited, rate-limited lookup.
 *
 * PERSONAL DATA. The response names a person (name, email, phone, IP), so:
 *   - `gcTime: 0` — the result leaves the cache as soon as the page stops
 *     showing it;
 *   - `meta.persistOffline: false` — belt and braces with the offline
 *     allowlist, which does not include the `platform-watermarks` root;
 *   - `placeholderData: undefined` — one code's person is never shown, even
 *     for a beat, under another code.
 *
 * NO RETRIES, NO BACKGROUND REFETCHES. Every request is audited and counts
 * against the per-owner limit; a 4xx will not change on retry, and a
 * reconnect must not silently look the person up again. The operator
 * re-submits on purpose instead. Failures are rendered by the page
 * (`INLINE_ERRORS_META`), so the app-wide error toast stays quiet.
 */
import { useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, platformWatermarkKeys } from '@services/query';
import type { ApiError } from '@api';
import {
  platformWatermarkService,
  type WatermarkLookupResponse,
} from '../services/PlatformWatermarkService';

export function usePlatformWatermarkLookup(code: string | null) {
  return useApiQuery<WatermarkLookupResponse, ApiError>({
    queryKey: platformWatermarkKeys.lookup(code ?? ''),
    queryFn: ({ signal }) =>
      platformWatermarkService.lookup(code ?? '', { signal }),
    enabled: code !== null && code.length > 0,
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    placeholderData: undefined,
    meta: { persistOffline: false, [INLINE_ERRORS_META]: true },
  });
}
