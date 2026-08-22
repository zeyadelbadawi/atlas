/**
 * Query infrastructure — public entry point.
 */
export {
  createQueryClient,
  getGlobalQueryClient,
  setGlobalQueryClient,
  clearGlobalQueryClient,
} from './query-client';
export type { QueryErrorReporter } from './query-client';
export * from './query-keys';
export * from './query-utils';