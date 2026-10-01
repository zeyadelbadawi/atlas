/**
 * `toQueryParams` — typed query objects (the platform Zoom and add-on
 * filters) become request params: absent fields are dropped, never sent as
 * `key=undefined`, and empty strings only when asked.
 */
import { describe, expect, it } from 'vitest';
import { toQueryParams } from './request.utils';

interface ExampleQuery {
  readonly page?: number;
  readonly search?: string;
  readonly status?: 'live' | 'ended';
  readonly issuesOnly?: boolean;
}

describe('toQueryParams', () => {
  it('drops undefined fields and keeps every real value as is', () => {
    const query: ExampleQuery = {
      page: 2,
      status: 'live',
      issuesOnly: false,
      search: undefined,
    };
    expect(toQueryParams(query)).toEqual({
      page: 2,
      status: 'live',
      issuesOnly: false,
    });
  });

  it('keeps an empty string unless told to drop it', () => {
    const query: ExampleQuery = { search: '' };
    expect(toQueryParams(query)).toEqual({ search: '' });
    expect(toQueryParams(query, { dropEmptyStrings: true })).toEqual({});
  });

  it('accepts an interface without an index signature (the typing this replaced rejected it)', () => {
    const typed: ExampleQuery = { page: 1 };
    const params: Record<string, unknown> = toQueryParams(typed);
    expect(params).toEqual({ page: 1 });
  });
});
