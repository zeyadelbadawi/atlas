/**
 * Google Identity — `/auth/google/return` on an academy host, inside the
 * academy's own chrome. The return URL carries no `/ar` prefix (it is the
 * one URL the backend builds), so the language comes from the page that
 * started the flow, remembered in its flow context.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleReturnFlow, readGoogleFlowContext } from '@features/auth';
import type { PublicWebsiteLocale } from '@types';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { PublicWebsiteAuthShell } from './PublicWebsiteAuthShell';
import { usePublicWebsiteHrefBuilder } from '../utils/public-website-link-renderer';

export const GOOGLE_RETURN_PATH = '/auth/google/return';

/**
 * Translates itself where the shell renders it: the page's language comes
 * from the flow context and is applied by the shell, after this page's own
 * render — a string computed here would stay in the previous language.
 */
function GoogleReturnTitle(): JSX.Element {
  const { t } = useTranslation();
  return <>{t('auth:google.return.title')}</>;
}

export interface PublicWebsiteGoogleReturnPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteGoogleReturnPage({
  lookupKey,
  locale: routeLocale,
}: PublicWebsiteGoogleReturnPageProps): JSX.Element {
  // Read (not consumed) before the first render; the flow consumes it.
  const [locale] = useState<PublicWebsiteLocale>(
    () => readGoogleFlowContext()?.locale ?? routeLocale
  );
  const buildHref = usePublicWebsiteHrefBuilder(locale);

  return (
    <PublicWebsiteAuthShell
      lookupKey={lookupKey}
      locale={locale}
      path={GOOGLE_RETURN_PATH}
      title={<GoogleReturnTitle />}
    >
      {({ academyId }) => (
        <GoogleReturnFlow
          surface="academy"
          academyId={academyId}
          defaultNext={buildHref(LEARNER_ROUTES.root)}
          defaultFrom={buildHref('/sign-in')}
          forgotPasswordHref={buildHref('/forgot-password')}
        />
      )}
    </PublicWebsiteAuthShell>
  );
}
