/**
 * Google Identity — `/auth/google/return` on the platform host (management
 * sign-in and sign-up, Account settings, the setup page). The flow itself
 * is `GoogleReturnFlow`; this page is its frame.
 */
import { useTranslation } from 'react-i18next';
import {
  AUTHENTICATED_ENTRY_ROUTE,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
} from '@app/routes/route-paths';
import { PageContainer } from '@components/layout';
import { GoogleLogo } from '../google/GoogleAuthButton';
import { GoogleReturnFlow } from '../google/GoogleReturnFlow';

export default function GoogleReturnPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill border border-border bg-background">
            <GoogleLogo className="size-6" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
            {t('auth:google.return.title')}
          </h1>
        </div>
        <GoogleReturnFlow
          surface="management"
          defaultNext={AUTHENTICATED_ENTRY_ROUTE}
          defaultFrom={AUTH_ROUTES.signIn}
          forgotPasswordHref={AUTH_ROUTES.forgotPassword}
          legalLinks={{
            terms: PUBLIC_ROUTES.terms,
            privacy: PUBLIC_ROUTES.privacyPolicy,
          }}
        />
      </div>
    </PageContainer>
  );
}
