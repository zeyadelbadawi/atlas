/**
 * Per-language translation loading (P-2): a language is added to a live
 * i18n instance before it is switched to, and the first render's
 * languages come from the preference and the public `/ar/` URL.
 */
import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import {
  ensureLanguageLoaded,
  loadLanguageResources,
} from './language-resources';
import { TRANSLATION_RESOURCES } from './resources';
import { languagesForFirstRender } from '@/app/providers/localization/initial-language';

describe('language resources', () => {
  it('loads each language as its own bundle, with every namespace', async () => {
    for (const language of ['en', 'ar'] as const) {
      const bundle = await loadLanguageResources(language);
      expect(Object.keys(bundle).sort()).toEqual(
        Object.keys(TRANSLATION_RESOURCES[language]).sort()
      );
    }
  });

  it('adds a language to an instance that did not have it, then switches', async () => {
    // An instance holding only English, as the app has after preloading it.
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'en',
      resources: {
        en: { website: { public: { poweredBy: 'Powered by Atlas' } } },
      },
      nsSeparator: ':',
      keySeparator: '.',
    });
    expect(i18n.hasResourceBundle('ar', 'website')).toBe(false);

    await ensureLanguageLoaded(i18n, 'ar');
    await i18n.changeLanguage('ar');
    expect(i18n.hasResourceBundle('ar', 'common')).toBe(true);
    expect(i18n.t('website:public.poweredBy')).toBe(
      (TRANSLATION_RESOURCES.ar.website as { public: { poweredBy: string } })
        .public.poweredBy
    );
  });

  it('preloads Arabic for public /ar pages as well as the preferred language', () => {
    expect(languagesForFirstRender('/courses')).toHaveLength(1);
    expect(languagesForFirstRender('/ar')).toContain('ar');
    expect(languagesForFirstRender('/ar/courses')).toContain('ar');
    expect(languagesForFirstRender('/arts')).not.toContain('ar');
  });
});
