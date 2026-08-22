/**
 * Translation helpers.
 *
 * These utilities keep translation keys type-safe and centralise the small
 * amount of key manipulation Atlas needs, so no component assembles keys with
 * ad-hoc string concatenation.
 */
import type { TranslationNamespace } from '@types';

/** A fully qualified translation key, e.g. `common:actions.save`. */
export type TranslationKey = string;

/**
 * Builds a namespaced translation key.
 *
 * @example translationKey('errors', 'network.title') // 'errors:network.title'
 */
export function translationKey(
  namespace: TranslationNamespace,
  path: string
): TranslationKey {
  return `${namespace}:${path}`;
}

/** Creates a helper that prefixes every key with the same namespace. */
export function createNamespaceResolver(namespace: TranslationNamespace) {
  return (path: string): TranslationKey => translationKey(namespace, path);
}

/** Returns true when a key already carries an explicit namespace. */
export function hasNamespace(key: TranslationKey): boolean {
  return key.includes(':');
}

/**
 * Chooses between a translation key and literal text.
 *
 * Some labels are user data (an academy name) rather than product copy. This
 * helper lets shared components accept either without duplicating branches.
 */
export interface LocalizableText {
  /** Translation key, used when no literal `text` is supplied. */
  readonly key?: TranslationKey;
  /** Literal text, used for values that originate from data. */
  readonly text?: string;
  /** Interpolation values for the translation key. */
  readonly values?: Record<string, string | number>;
}

/**
 * Resolves a {@link LocalizableText} using the provided translate function.
 *
 * @param value Key/literal pair to resolve.
 * @param translate The `t` function from `useTranslation`.
 */
export function resolveLocalizableText(
  value: LocalizableText | undefined,
  translate: (key: string, values?: Record<string, string | number>) => string
): string {
  if (!value) return '';
  if (value.text !== undefined) return value.text;
  if (value.key !== undefined) return translate(value.key, value.values);
  return '';
}