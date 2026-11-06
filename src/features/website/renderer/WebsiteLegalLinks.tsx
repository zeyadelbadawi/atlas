/**
 * B9 (UX audit) V05 — the legal links on an academy website's footer, in
 * every theme: the platform's Terms of Service and Privacy Policy (the
 * documents a visitor agrees to when they sign up; absolute URLs on the
 * platform's site, opened in a new tab — academy hosts don't route
 * `/terms` or `/privacy-policy`), and Cookie Preferences, so a choice made
 * on the banner can be changed later.
 *
 * Rendered in the builder preview too, so the preview's footer has the same
 * height as the site's (J50). The links inherit the footer's colour, so each
 * theme's footer ground keeps its contrast.
 */
import { useTranslation } from 'react-i18next';
import { platformLegalHref, useOptionalCookieConsent } from '@features/legal';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from './PublicWebsiteLocaleContext';

const LINK_CLASS =
  'inline-flex min-h-6 items-center rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

export function WebsiteLegalLinks({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const consent = useOptionalCookieConsent();
  const newTab = (
    <span className="sr-only"> {t('legal:consent.learnMoreNewTab')}</span>
  );
  return (
    <nav
      aria-label={t('legal:footer.label')}
      data-testid="website-legal-links"
      className={cn('shrink-0 text-xs', className)}
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <li>
          <a
            href={platformLegalHref('terms', locale)}
            target="_blank"
            rel="noopener"
            className={LINK_CLASS}
          >
            {t('legal:terms')}
            {newTab}
          </a>
        </li>
        <li>
          <a
            href={platformLegalHref('privacy', locale)}
            target="_blank"
            rel="noopener"
            className={LINK_CLASS}
          >
            {t('legal:privacyPolicy')}
            {newTab}
          </a>
        </li>
        {consent ? (
          <li>
            <button
              type="button"
              onClick={consent.openPreferences}
              data-testid="cookie-preferences-button"
              className={LINK_CLASS}
            >
              {t('legal:cookiePreferences')}
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
