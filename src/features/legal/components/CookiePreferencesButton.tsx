/**
 * The footer entry point to consent.
 *
 * A decision must be revocable as easily as it was given — this is what
 * lets someone who accepted last month change their mind without clearing
 * browser storage by hand. It is a `button`, not a link, because it opens
 * a dialog rather than navigating.
 */
import { useTranslation } from 'react-i18next';
import { useCookieConsent } from '../consent/CookieConsentProvider';

export function CookiePreferencesButton({ className }: { className?: string }) {
  const { t } = useTranslation(['legal']);
  const { openPreferences } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openPreferences}
      data-testid="cookie-preferences-button"
      className={className ?? 'transition-colors hover:text-foreground'}
    >
      {t('legal:cookiePreferences')}
    </button>
  );
}
