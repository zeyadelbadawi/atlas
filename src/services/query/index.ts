/**
 * Query infrastructure — public entry point.
 */
export {
  createQueryClient,
  getGlobalQueryClient,
  setGlobalQueryClient,
  clearGlobalQueryClient,
  INLINE_ERRORS_META,
} from './query-client';
export type { QueryErrorReporter } from './query-client';
export * from './query-keys';
export * from './query-utils';
export * from './invalidation';
export * from './placeholder';
