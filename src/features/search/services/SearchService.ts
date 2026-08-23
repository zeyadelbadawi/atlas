/**
 * Search Service.
 *
 * Global search — flat resource, session-scoped (the backend returns only
 * results the caller may see). Replaces the Prompt 3A `SearchPage`'s
 * self-documented mock array + `setTimeout`-as-latency with a real
 * contract; the frontend never fabricates results.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { SearchResults } from '@types';

export class SearchService extends BaseService {
  protected readonly resource = 'search';

  async search(query: string, options?: ReadOptions): Promise<SearchResults> {
    return this.client.get<SearchResults>(this.path(), {
      ...options,
      params: { q: query, ...options?.params },
    });
  }
}

export const searchService = new SearchService();
