/**
 * The Academy "Coming Soon" page.
 *
 * WHAT THIS REPLACES. An Academy whose website is deliberately unpublished
 * used to render the generic "Temporarily unavailable — please try again
 * shortly" outage screen. That was technically safe but actively
 * misleading: it told a visitor that Atlas was broken, when in fact the
 * Academy's owner had simply not published yet. The two states are now
 * kept apart — a real platform failure still renders the outage screen.
 *
 * WHY IT IS NOT A CMS PAGE. This is a platform-level state, not content.
 * If it were an ordinary editable page row, an Academy could delete or
 * break the very page that covers the window in which they have nothing
 * else to show, and every new Academy would need one seeded. Rendering it
 * from the public runtime means EVERY Academy has a reliable Coming Soon
 * experience automatically, including one created a minute ago, and there
 * is nothing for a customer to accidentally remove.
 *
 * WHAT IT SHOWS, AND WHAT IT REFUSES TO INVENT. Only the Academy identity
 * the hostname resolution already returned — name, and logo when one has
 * been uploaded. No launch date, no marketing copy, no contact details,
 * no social links: none of that is available at this point without
 * reading unpublished configuration, and guessing it would be fabricating
 * business information. The design carries the page instead.
 *
 * It owns the full viewport for the same reason the real website does:
 * anything less lets the surrounding app's background show through on a
 * customer's domain.
 */
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { HostnameResolution } from '@types';
import {
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  type PublicWebsiteLocale,
} from '@features/website';

export interface AcademyComingSoonProps {
  readonly academy: HostnameResolution;
  readonly locale: PublicWebsiteLocale;
}

export function AcademyComingSoon({
  academy,
  locale,
}: AcademyComingSoonProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];

  // The page is rendered outside `WebsiteChrome`, so the locale plumbing
  // that normally follows the public URL is not mounted. Without this the
  // Arabic copy would render with whatever language the shared i18next
  // instance happened to be left on.
  useEffect(() => {
    const previousLanguage = i18n.language;
    const previousDir = document.documentElement.dir;
    const previousLang = document.documentElement.lang;

    void i18n.changeLanguage(locale);
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;

    return () => {
      void i18n.changeLanguage(previousLanguage);
      document.documentElement.dir = previousDir;
      document.documentElement.lang = previousLang;
    };
  }, [i18n, locale, direction]);

  return (
    <div
      dir={direction}
      lang={locale}
      data-testid="academy-coming-soon"
      /*
        Its own palette, deliberately independent of the Atlas dashboard's
        tokens — a customer's domain must not inherit the operator's theme
        or dark-mode preference, exactly as the real public site does not.
      */
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 py-16 text-center text-[hsl(222_22%_12%)]"
    >
      <div className="w-full max-w-lg space-y-8">
        {academy.academyLogo ? (
          <img
            src={academy.academyLogo}
            alt={academy.academyName}
            className="mx-auto h-16 w-auto max-w-[60%] object-contain"
          />
        ) : (
          /* No fabricated mark: the Academy's own initial, not a stock icon. */
          <span
            aria-hidden
            className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[hsl(210_20%_96%)] font-display text-2xl font-semibold text-[hsl(222_16%_45%)]"
          >
            {academy.academyName.trim().charAt(0).toUpperCase()}
          </span>
        )}

        <div className="space-y-3">
          {/*
            The colour is set HERE rather than inherited from the wrapper.
            A global `h1, h2, h3, h4, h5, h6 { color: hsl(var(--foreground)) }`
            rule beats inheritance, and `--foreground` is the ATLAS
            DASHBOARD's token — which follows the operator's own dark-mode
            preference and is stamped on `<html class="dark">` for the whole
            app, public domains included. Caught in the browser against
            production: the Academy's own name rendered in the dashboard's
            near-white dark-mode foreground on this page's white ground,
            leaving the single most important word on the page invisible.

            This is the same hazard `.website-theme-scope` exists to
            neutralise for the real site; this page deliberately renders
            outside `WebsiteChrome`, so it has to defend itself. Every other
            piece of text here already states its own colour — this one was
            the gap.
          */}
          <h1
            className="font-display text-3xl font-semibold tracking-tight text-[hsl(222_22%_12%)] sm:text-4xl"
            dir="auto"
          >
            {academy.academyName}
          </h1>
          <p className="text-lg font-medium text-[hsl(222_16%_35%)]">
            {t('publicWebsite:comingSoon.title')}
          </p>
        </div>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-[hsl(222_12%_48%)]">
          {t('publicWebsite:comingSoon.description')}
        </p>

        {/* A hairline rule rather than a card: this page has one message,
            and boxing it would make an ordinary state look like an error. */}
        <div className="mx-auto h-px w-16 bg-[hsl(214_20%_88%)]" />

        <p className="text-xs text-[hsl(222_10%_58%)]">
          {t('publicWebsite:comingSoon.attribution')}
        </p>
      </div>
    </div>
  );
}
