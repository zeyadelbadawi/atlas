/**
 * B2 (UX audit, V34) — names the dashboard shows in the person's own
 * language for things the site stores in one language only.
 *
 * - A website content language ("English", "Arabic") is a choice in the
 *   dashboard, so it reads «الإنجليزية» on the Arabic dashboard. (The
 *   public site's own language switcher keeps each language's own name.)
 * - A core page created with its default English title ("Home", "About"…)
 *   has no Arabic title of its own: the dashboard names it in the
 *   dashboard's language. A title the owner typed is always shown as typed.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { WebsiteCorePageType, WebsitePage } from '@types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';

/** The titles core pages are created with (`CORE_PAGE_DEFAULTS` in the API). */
const CORE_PAGE_DEFAULT_TITLES: Readonly<Record<WebsiteCorePageType, string>> =
  {
    home: 'Home',
    about: 'About',
    courses: 'Courses',
    faqs: 'FAQs',
    contact: 'Contact',
    courseDetails: 'Course Details',
  };

/** The translation key naming a content language in the dashboard. */
export function contentLocaleLabelKey(locale: PublicWebsiteLocale): string {
  return locale === 'ar'
    ? 'website:editor.languageArabic'
    : 'website:editor.languageEnglish';
}

/** The translation key for a core page still carrying its default title, else `null`. */
export function corePageTitleKey(
  page: Pick<WebsitePage, 'coreType' | 'title'>
): string | null {
  if (!page.coreType) return null;
  return page.title.trim() === CORE_PAGE_DEFAULT_TITLES[page.coreType]
    ? `website:corePageTitles.${page.coreType}`
    : null;
}

/** A page's name as the dashboard shows it (see this file's doc comment). */
export function useDisplayPageTitle(): (
  page: Pick<WebsitePage, 'coreType' | 'title'>
) => string {
  const { t } = useTranslation();
  return useCallback(
    (page) => {
      const key = corePageTitleKey(page);
      return key ? t(key) : page.title;
    },
    [t]
  );
}
