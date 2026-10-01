/**
 * Atlas localization — public entry point.
 */
export * from './languages';
export * from './translation.utils';
export { createI18nInstance, DEFAULT_NAMESPACE } from './i18n';
export {
  completeLoadedLanguages,
  ensureLanguageLoaded,
  loadLanguageResources,
  preloadLanguages,
  registerLanguageResources,
  withCompleteTranslations,
} from './language-resources';
