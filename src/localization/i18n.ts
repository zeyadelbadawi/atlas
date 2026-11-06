/**
 * i18next bootstrap.
 *
 * Created as a dedicated instance rather than the global singleton so the
 * configuration is explicit and the instance can be provided to tests.
 * Language *selection* and document side effects belong to the Localization
 * Provider; this module only configures the translation engine.
 */
import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_CONFIG, ENV } from '@config';
import { TRANSLATION_NAMESPACES } from '@types';
import type { LanguageCode } from '@types';
import { SUPPORTED_LANGUAGE_CODES } from '@types';
import {
  attachI18nInstance,
  registeredLanguageResources,
} from './language-resources';

/** Namespace loaded when a translation key carries no explicit namespace. */
export const DEFAULT_NAMESPACE = 'common' as const;

/**
 * The languages loaded so far (`language-resources.ts`): the app preloads
 * the ones the first render needs, and loads others before switching.
 */
function buildResources() {
  return registeredLanguageResources() as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
}

/** The sentence of a `{ title, description }` group, or '' (never an object). */
export function groupSentence(
  instance: Pick<I18nInstance, 't'>,
  key: string,
  value: unknown,
  options: Record<string, unknown>
): string {
  if (value === null || typeof value !== 'object') return '';
  const group = value as Record<string, unknown>;
  const leaf = (['description', 'title'] as const).find(
    (name) => typeof group[name] === 'string'
  );
  if (!leaf) return '';
  const text: unknown = instance.t(`${key}.${leaf}`, {
    ...options,
    returnObjects: false,
  });
  return typeof text === 'string' ? text : '';
}

/**
 * Creates and initialises an Atlas i18n instance.
 *
 * @param initialLanguage Language to activate immediately.
 */
export function createI18nInstance(
  initialLanguage: LanguageCode
): I18nInstance {
  const instance = i18next.createInstance();

  void instance.use(initReactI18next).init({
    resources: buildResources(),
    lng: initialLanguage,
    fallbackLng: APP_CONFIG.defaultLanguage,
    supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
    ns: [...TRANSLATION_NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    fallbackNS: DEFAULT_NAMESPACE,
    // Atlas keys use dots for structure; ':' separates the namespace.
    keySeparator: '.',
    nsSeparator: ':',
    interpolation: {
      // React escapes output already; double escaping corrupts Arabic text.
      escapeValue: false,
    },
    returnNull: false,
    debug: false,
    // Surfacing a missing key during development prevents silent gaps.
    saveMissing: false,
    parseMissingKeyHandler: (key) => (ENV.isProduction ? '' : key),
    // B8 (UX audit) V06 — some keys name a GROUP (`errors:conflict` is
    // `{ title, description }`). `t()` on one used to put "key 'conflict
    // (en)' returned an object instead of string." on screen. Every such
    // call now reads the group's sentence (its description, else its
    // title), interpolated, and never the raw object or that notice.
    returnedObjectHandler: ((
      key: string,
      value: unknown,
      options: Record<string, unknown>
    ) => groupSentence(instance, key, value, options)) as never,
    react: {
      useSuspense: false,
      // A public website renders with its core translations and receives
      // the rest just after (language-resources.ts): re-render when a
      // namespace is added, so nothing stays on a missing key.
      bindI18nStore: 'added',
    },
  });

  attachI18nInstance(instance);
  return instance;
}
