/**
 * Tests read translations synchronously (`createI18nInstance('en')`), as
 * the app does after `main.tsx` has preloaded the page's language. Both
 * languages are registered up front here.
 */
import { registerLanguageResources } from '@/localization/language-resources';
import { TRANSLATION_RESOURCES } from '@/localization/resources';

registerLanguageResources('en', TRANSLATION_RESOURCES.en);
registerLanguageResources('ar', TRANSLATION_RESOURCES.ar);
