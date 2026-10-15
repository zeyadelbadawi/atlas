/**
 * `BaseService.fetchCollection` — the page counts every list screen built on
 * it shows (Platform users, organizations, academies, courses, audit log,
 * support cases, notifications, ...).
 *
 * The API answers `{ items, pagination: { page, pageSize, totalItems,
 * totalPages } }` (backend `PaginatedResult`). The normalizer used to look for
 * the totals at the TOP level only, so it fell back to `items.length`: a list
 * of 137 rows read as "20 items, 1 page" and the pager never offered page 2.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './api/api-client';
import { BaseService } from './base.service';
import type { CollectionQuery } from '@types';

class WidgetService extends BaseService {
  protected readonly resource = 'widgets';
  list(query?: CollectionQuery) {
    return this.fetchCollection<{ id: string }>(query);
  }
}

function serviceAnswering(response: unknown) {
  const get = vi.fn().mockResolvedValue(response);
  return new WidgetService({ get } as unknown as ApiClient);
}

const page2 = Array.from({ length: 20 }, (_, i) => ({ id: `w${20 + i}` }));

describe('BaseService.fetchCollection', () => {
  it("reads the API's nested pagination (the server total, not the page length)", async () => {
    const service = serviceAnswering({
      items: page2,
      pagination: { page: 2, pageSize: 20, totalItems: 137, totalPages: 7 },
    });
    const result = await service.list({
      pagination: { page: 2, pageSize: 20 },
    });
    expect(result.items).toHaveLength(20);
    expect(result.pagination.totalItems).toBe(137);
    expect(result.pagination.totalPages).toBe(7);
    expect(result.pagination.page).toBe(2);
  });

  it('still accepts a top-level total and a bare array', async () => {
    const flat = await serviceAnswering({ items: page2, total: 45 }).list();
    expect(flat.pagination.totalItems).toBe(45);

    const bare = await serviceAnswering([{ id: 'a' }, { id: 'b' }]).list();
    expect(bare.pagination.totalItems).toBe(2);
  });
});
