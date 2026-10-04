/**
 * Programmatic navigation for Atelier forms (the Courses masthead's
 * search), with the same two rules as `usePublicWebsiteHrefBuilder`: the
 * `/ar` prefix and the development-preview parameter. `@features/website`
 * can't depend on that hook's feature, so the rule is applied here as
 * Theme 1's `useT1Navigate` and `useCourseDetails` do. Used only on the
 * public runtime (where `linkRenderer` is present).
 */
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEV_OVERRIDE_PARAM } from '@features/public-website';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';

export function useAtelierNavigate(): (path: string) => void {
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
