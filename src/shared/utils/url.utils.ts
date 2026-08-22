/**
 * URL helpers.
 *
 * Query strings are built from typed parameters so services never assemble URLs
 * by concatenating strings, which is both error-prone and unsafe.
 */
import type { QueryParams, QueryParamValue } from '@types';

function appendParam(
  search: URLSearchParams,
  key: string,
  value: QueryParamValue
): void {
  if (value === null || value === undefined || value === '') return;

  if (Array.isArray(value)) {
    for (const entry of value) {
      search.append(key, String(entry));
    }
    return;
  }

  search.append(key, String(value));
}

/**
 * Serialises query parameters, skipping empty values so requests stay clean.
 *
 * @returns The query string without a leading `?`, or an empty string.
 */
export function buildQueryString(params?: QueryParams): string {
  if (!params) return '';

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    appendParam(search, key, value);
  }

  return search.toString();
}

/** Joins a base URL and a path with exactly one separating slash. */
export function joinUrl(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return trimmedPath.length === 0
    ? trimmedBase
    : `${trimmedBase}/${trimmedPath}`;
}

/**
 * Reports whether a URL points outside the current origin.
 * Malformed values are treated as external, which is the safer default.
 */
export function isExternalUrl(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/** Attributes required for safely opening an external link in a new tab. */
export const EXTERNAL_LINK_ATTRIBUTES = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;