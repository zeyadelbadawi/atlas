/**
 * ATO review F11 — Platform Owner tools require an authenticator app.
 *
 * The backend refuses platform routes to a Platform Owner without a
 * confirmed authenticator app once `PLATFORM_OWNER_TOTP_REQUIRED_FROM` has
 * passed (their own security settings stay reachable, which is where they
 * enrol). This notice tells them BEFORE that happens, on every dashboard
 * screen, and links to the setup. It renders nothing for anyone else, or
 * once the app is set up, or while the status is unknown.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@hooks';
import { useApiQuery } from '@/shared/hooks';
import { twoFactorService } from '@services/identity';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { TwoFactorStatus } from '@types';
import type { ApiError } from '@api';

/** Shared with `TwoFactorCard`, so enrolling there clears this notice. */
const TWO_FACTOR_STATUS_KEY = ['auth', '2fa', 'status'] as const;

export function PlatformOwnerMfaNotice(): JSX.Element | null {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isPlatformOwner = !!user?.roles?.includes('platform_owner');

  const status = useApiQuery<TwoFactorStatus, ApiError>({
    queryKey: TWO_FACTOR_STATUS_KEY,
    queryFn: () => twoFactorService.getStatus(),
    enabled: isPlatformOwner,
  });

  if (!isPlatformOwner || !status.data || status.data.enabled) return null;

  return (
    <Alert variant="destructive" data-testid="platform-owner-mfa-notice">
      <ShieldAlert className="size-4" aria-hidden />
      <AlertTitle>{t('profile:platformOwnerMfa.title')}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{t('profile:platformOwnerMfa.description')}</p>
        <Button asChild size="sm" variant="outline">
          <Link to={DASHBOARD_ROUTES.profile}>
            {t('profile:platformOwnerMfa.action')}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
