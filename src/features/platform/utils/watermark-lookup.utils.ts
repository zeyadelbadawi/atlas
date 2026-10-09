/**
 * Watermark lookup page helpers (docs/FORENSIC_WATERMARK.md): how a failed
 * lookup reads to the operator, and the badge tone of each state.
 */
import type { ApiError } from '@api';
import type { StatusTone } from '@components/data-display';
import type {
  WatermarkAccountState,
  WatermarkSurface,
} from '../services/PlatformWatermarkService';

const K = 'platform:watermarkLookup';

/** Every way a lookup can fail, as the operator needs to tell them apart. */
export type WatermarkLookupFailure =
  | 'invalid'
  | 'checksum'
  | 'notFound'
  | 'rateLimited'
  | 'unavailable'
  | 'forbidden'
  | 'network'
  | 'generic';

/**
 * Reads the backend's specific `messageKey` first
 * (`PlatformWatermarksController` / `WatermarkLookupService`), then falls
 * back to the HTTP-derived kind — the per-IP throttle, for instance,
 * answers 429 without a watermark-specific key.
 */
export function watermarkLookupFailure(
  error: ApiError
): WatermarkLookupFailure {
  switch (error.messageKey) {
    case 'errors.watermark.invalidCode':
      return 'invalid';
    case 'errors.watermark.checksumMismatch':
      return 'checksum';
    case 'errors.watermark.notFound':
      return 'notFound';
    case 'errors.watermark.lookupRateLimited':
      return 'rateLimited';
    case 'errors.watermark.lookupUnavailable':
      return 'unavailable';
    default:
      break;
  }
  switch (error.kind) {
    case 'validation':
      return error.details?.problem === 'checksum' ? 'checksum' : 'invalid';
    case 'notFound':
      return 'notFound';
    case 'rateLimited':
      return 'rateLimited';
    case 'forbidden':
    case 'unauthorized':
      return 'forbidden';
    case 'network':
    case 'timeout':
      return 'network';
    case 'server':
      return error.status === 503 ? 'unavailable' : 'generic';
    default:
      return 'generic';
  }
}

export interface WatermarkFailureCopy {
  readonly titleKey: string;
  readonly descriptionKey: string;
  /** Whether repeating the same lookup could succeed. */
  readonly retryable: boolean;
}

export const WATERMARK_FAILURE_COPY: Readonly<
  Record<WatermarkLookupFailure, WatermarkFailureCopy>
> = {
  invalid: {
    titleKey: `${K}.errors.invalid.title`,
    descriptionKey: 'errors:watermark.invalidCode',
    retryable: false,
  },
  checksum: {
    titleKey: `${K}.errors.checksum.title`,
    descriptionKey: 'errors:watermark.checksumMismatch',
    retryable: false,
  },
  notFound: {
    titleKey: `${K}.errors.notFound.title`,
    descriptionKey: 'errors:watermark.notFound',
    retryable: false,
  },
  rateLimited: {
    titleKey: `${K}.errors.rateLimited.title`,
    descriptionKey: 'errors:watermark.lookupRateLimited',
    retryable: true,
  },
  unavailable: {
    titleKey: `${K}.errors.unavailable.title`,
    descriptionKey: 'errors:watermark.lookupUnavailable',
    retryable: true,
  },
  forbidden: {
    titleKey: `${K}.errors.forbidden.title`,
    descriptionKey: `${K}.errors.forbidden.description`,
    retryable: false,
  },
  network: {
    titleKey: `${K}.errors.network.title`,
    descriptionKey: 'errors:network.description',
    retryable: true,
  },
  generic: {
    titleKey: `${K}.errors.generic.title`,
    descriptionKey: 'errors:unknown.description',
    retryable: true,
  },
};

export const ACCOUNT_STATE_TONE: Readonly<
  Record<WatermarkAccountState, StatusTone>
> = {
  active: 'success',
  suspended: 'warning',
  deleted: 'destructive',
  missing: 'warning',
  anonymous: 'info',
};

export function accountStateLabelKey(state: WatermarkAccountState): string {
  return `${K}.accountState.${state}`;
}

export function surfaceLabelKey(surface: WatermarkSurface): string {
  return `${K}.surface.${surface}`;
}

/** The most specific title a related code carries: lesson, else live session, else course. */
export function relatedContentTitle(related: {
  readonly courseTitle: string | null;
  readonly lessonTitle: string | null;
  readonly liveSessionTitle: string | null;
}): { readonly primary: string | null; readonly secondary: string | null } {
  if (related.lessonTitle) {
    return { primary: related.lessonTitle, secondary: related.courseTitle };
  }
  if (related.liveSessionTitle) {
    return {
      primary: related.liveSessionTitle,
      secondary: related.courseTitle,
    };
  }
  return { primary: related.courseTitle, secondary: null };
}
