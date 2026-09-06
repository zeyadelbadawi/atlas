/**
 * Atlas Platform Attribution — Phase 6.
 *
 * A small, subtle, MANDATORY "Powered by Atlas" mark shown on every
 * Academy-branded surface (public website footer, Academy sign-in/sign-up,
 * Dashboard shell, Student LMS shell). Academies get a strong white-label
 * identity elsewhere (logo, name, colors — see `useAcademyIdentity`), but
 * this one mark is deliberately PLATFORM-owned, not Academy content:
 *
 *   - There is no prop, config field, or CMS toggle that hides it. It is
 *     placed directly by the application-layer shell components
 *     (`DashboardLayout`, `LearningLayout`, `WebsiteChrome`'s footer,
 *     `PublicWebsiteSignInPage`/`SignUpPage`) — never read from
 *     `WebsiteConfiguration`/`Academy` data an Owner/Manager can edit.
 *   - It is ONE component, not text duplicated at each call site, so its
 *     wording/styling/behavior stays identical everywhere and can only
 *     change in one place.
 *   - It stays visually subordinate to Academy branding by design: text
 *     size never exceeds `text-xs`, the mark is `markOnly` at the
 *     smallest size, and color is always `text-muted-foreground` — it
 *     must never compete with the Academy's own logo/wordmark for
 *     attention.
 *
 * Business rationale (master plan, Phase 6): prevents an Academy customer
 * from stripping every trace of Atlas and reselling the product as
 * independently-developed software.
 */
import { useTranslation } from 'react-i18next';
import { AtlasLogo } from './AtlasLogo';
import { cn } from '@utils';

export interface AtlasPlatformAttributionProps {
  readonly className?: string;
}

export function AtlasPlatformAttribution({
  className,
}: AtlasPlatformAttributionProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <p
      className={cn(
        'flex items-center justify-center gap-1.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <span>{t('common:attribution.poweredBy')}</span>
      <AtlasLogo size="sm" markOnly className="gap-0" />
      <span className="font-medium text-foreground/80">{t('common:product.name')}</span>
    </p>
  );
}
