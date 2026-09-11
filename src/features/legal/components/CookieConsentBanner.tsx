/**
 * The consent banner.
 *
 * ACCEPT AND REJECT ARE EQUALLY EASY. Both are buttons of the same size,
 * side by side, in the same place. Making "Reject" harder to find than
 * "Accept" is the standard dark pattern here, and it is the specific
 * thing regulators object to; it is not done.
 *
 * It renders only while no decision exists. A user who has decided sees
 * nothing until they deliberately open preferences from the footer.
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '../consent/CookieConsentProvider';

export function CookieConsentBanner() {
  const { t } = useTranslation(['legal']);
  const { needsDecision, decide, openPreferences } = useCookieConsent();

  if (!needsDecision) return null;

  return (
    <div
      // `role="region"` rather than `dialog`: this does not trap
      // focus and must not stop someone reading the page — including
      // the Privacy Policy that explains what they are consenting to.
      role="region"
      aria-label={t('legal:consent.bannerTitle')}
      data-testid="cookie-consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {t('legal:consent.bannerTitle')}
          </p>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('legal:consent.bannerBody')}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={openPreferences}>
            {t('legal:consent.managePreferences')}
          </Button>
          {/* Same variant and size as Accept, deliberately. */}
          <Button variant="outline" onClick={() => decide(false)}>
            {t('legal:consent.rejectAll')}
          </Button>
          <Button onClick={() => decide(true)}>
            {t('legal:consent.acceptAll')}
          </Button>
        </div>
      </div>
    </div>
  );
}
