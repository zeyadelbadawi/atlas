/**
 * The error kind a learner PAGE may show for a failed READ.
 *
 * `ErrorState` has a sentence per `ApiErrorKind`, and most of them are
 * right for a page that failed to load (no network, signed out, not
 * found, rate limited, server). Two are not: `validation` reads as a
 * form ("Check the highlighted fields") and `conflict` as a write that
 * lost a race — neither describes a GET that the server refused, and
 * showing them on a page load sends the learner looking for a field that
 * does not exist. Those, and anything unexpected, fall back to the
 * generic sentence, which at least tells the truth.
 */
import { isApiError } from '@api';
import type { ApiErrorKind } from '@types';

const READ_KINDS: ReadonlySet<ApiErrorKind> = new Set<ApiErrorKind>([
  'network',
  'timeout',
  'unauthorized',
  'forbidden',
  'notFound',
  'rateLimited',
  'server',
]);

export function readErrorKind(error: unknown): ApiErrorKind {
  if (isApiError(error) && READ_KINDS.has(error.kind)) return error.kind;
  return 'unknown';
}
