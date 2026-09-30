/**
 * The FAQs page's question filter: typed into the page hero (`pageHeader`
 * with `search: 'faq'`), applied by the FAQ list below it. Two sections of
 * one page share it through this small store rather than the URL — a
 * filter is transient, not a shareable state. The hero clears it when it
 * unmounts, so leaving the page never carries a filter to the next one.
 */
import { useSyncExternalStore } from 'react';

let current = '';
const listeners = new Set<() => void>();

export function setFaqFilter(value: string): void {
  if (value === current) return;
  current = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFaqFilter(): string {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => ''
  );
}

/** Case- and diacritic-insensitive matching, for English and Arabic alike. */
export function matchesFaqFilter(text: string, filter: string): boolean {
  const needle = normalise(filter);
  return !needle || normalise(text).includes(needle);
}

function normalise(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}
