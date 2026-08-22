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
import { TRANSLATION_RESOURCES } from './resources';

/** Namespace loaded when a translation key carries no explicit namespace. */
export const DEFAULT_NAMESPACE = 'common' as const;

function buildResources() {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const code of SUPPORTED_LANGUAGE_CODES) {
    resources[code] = TRANSLATION_RESOURCES[code];
  }

  return resources;
}

/**
 * Creates and initialises an Atlas i18n instance.
 *
 * @param initialLanguage Language to activate immediately.
 */
export function createI18nInstance(initialLanguage: LanguageCode): I18nInstance {
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
    react: {
      useSuspense: false,
    },
  });

  return instance;
}