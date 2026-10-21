/**
 * AtlasSiteLink — makes an Atlas mark a link to the Atlas website (the
 * marketing site, `VITE_SITE_URL`).
 *
 * Opens in a new tab: it leads away from a dashboard or an Academy's own
 * website, which should stay where the person left it. `rel="noopener"`
 * only, so the Atlas site can still see which host the visit came from.
 * Without a configured site URL (local development) the children render
 * unchanged, never as a link to a guessed address.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ENV } from '@config';
import { cn } from '@utils';

export interface AtlasSiteLinkProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function AtlasSiteLink({
  children,
  className,
}: AtlasSiteLinkProps): JSX.Element {
  const { t } = useTranslation();
  if (!ENV.siteUrl) return <>{children}</>;
  return (
    <a
      href={`${ENV.siteUrl}/`}
      target="_blank"
      rel="noopener"
      data-testid="atlas-site-link"
      className={cn(
        'rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      {children}
      <span className="sr-only">{t('common:attribution.opensInNewTab')}</span>
    </a>
  );
}
