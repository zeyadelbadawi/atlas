/**
 * B9 (UX audit) V10 — a page's name in the visitor's language, for its
 * browser title ("Courses · Academy"): the page's navigation label in that
 * language, else a core page's default title translated, else the title the
 * owner gave it. Home has none — its title is the academy's name alone.
 */
import type { TFunction } from 'i18next';
import type { WebsiteNavigationItem, WebsitePage } from '@types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import { corePageTitleKey } from '../components/website-display-labels';
import { resolveLocalizedText } from './localized-text.utils';

export function publicPageName(
  page: Pick<WebsitePage, 'id' | 'coreType' | 'title'>,
  navigation: readonly WebsiteNavigationItem[],
  locale: PublicWebsiteLocale,
  t: TFunction
): string {
  if (page.coreType === 'home') return '';
  const item = navigation.find((candidate) => candidate.pageId === page.id);
  const label = item ? resolveLocalizedText(item.label, locale).trim() : '';
  if (label) return label;
  const key = corePageTitleKey(page);
  return key ? t(key) : page.title.trim();
}
