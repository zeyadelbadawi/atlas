/**
 * Atlas API layer — public entry point.
 *
 * Only services may import from here. Components communicate with services.
 */
export { ApiClient, apiClient } from './api-client';
export type { ReadOptions, WriteOptions } from './api-client';
export { HttpClient, httpClient } from './http-client';
export {
  ApiError,
  createApiError,
  errorMessageKey,
  errorTitleKey,
  isApiError,
  normalizeApiError,
  normalizeAxiosError,
  normalizeResponseError,
  normalizeUnknownError,
} from './api-error';
export {
  COLLECTION_PARAM_NAMES,
  buildPaginationMeta,
  emptyPaginatedResult,
  resourcePath,
  toCollectionParams,
} from './request.utils';