/**
 * Programmatic navigation for Theme 1 forms (the hero's course search),
 * applying the same two rules as `usePublicWebsiteHrefBuilder`: the `/ar`
 * prefix and the development-preview parameter. They're re-applied here
 * because `@features/website` can't depend on that hook's feature; this is
 * the same local copy `CourseDetailsTemplate` documents. Callers use it
 * only on the public runtime (where `linkRenderer` is present).
 */
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEV_OVERRIDE_PARAM } from '@features/public-website';
import {
  usePublicWebsiteDefaultLocale,
  usePublicWebsiteLocale,
} from '../renderer/PublicWebsiteLocaleContext';
import { publicWebsiteLocalePrefix } from '../constants/locale.constants';

export function useT1Navigate(): (path: string) => void {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { locale } = usePublicWebsiteLocale();
  const defaultLocale = usePublicWebsiteDefaultLocale();
  return useCallback(
    (path: string) => {
      const prefix = publicWebsiteLocalePrefix(locale, defaultLocale);
      const localized = !prefix
        ? path
        : path === '/'
          ? prefix
          : `${prefix}${path}`;
      const devSlug = searchParams.get(DEV_OVERRIDE_PARAM);
      if (!devSlug) {
        navigate(localized);
        return;
      }
      const separator = localized.includes('?') ? '&' : '?';
      navigate(
        `${localized}${separator}${DEV_OVERRIDE_PARAM}=${encodeURIComponent(devSlug)}`
      );
    },
    [locale, defaultLocale, navigate, searchParams]
  );
}
