/**
 * Security Settings Component.
 *
 * B0-SEC-02 — this tab used to offer "Require two-factor authentication"
 * and "Session timeout" controls. Both were saved to `platform_settings`
 * but nothing in the backend or frontend read them, so an operator could
 * believe a platform-wide 2FA rule or idle timeout was in force when it was
 * not. The controls are gone until they are enforced; the stored columns
 * are left untouched. What the tab says now is only what is true today:
 * two-factor authentication is set up per account, from the profile.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';

export function SecuritySettings(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:security.title')}</CardTitle>
          <CardDescription>
            {t('settings:security.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            {t('settings:security.perAccountTwoFactor')}{' '}
            <Link
              to={DASHBOARD_ROUTES.profile}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('settings:security.openProfile')}
            </Link>
          </p>
          <p className="text-muted-foreground">
            {t('settings:security.notYetAvailable')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
