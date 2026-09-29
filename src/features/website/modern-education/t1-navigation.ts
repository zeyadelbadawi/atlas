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
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';

export function useT1Navigate(): (path: string) => void {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { locale } = usePublicWebsiteLocale();
  return useCallback(
    (path: string) => {
      const localized =
        locale === 'en' ? path : path === '/' ? '/ar' : `/ar${path}`;
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
    [locale, navigate, searchParams]
  );
}
