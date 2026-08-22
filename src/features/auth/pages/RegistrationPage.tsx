/**
 * Registration Page.
 *
 * New user registration with email and password.
 */
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@hooks';
import {
  AUTHENTICATED_ENTRY_ROUTE,
  AUTH_ROUTES,
} from '@app/routes/route-paths';
import { PageContainer, PageHeader } from '@components/layout';
import { RegistrationForm } from '../components/RegistrationForm';

export default function RegistrationPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();

  // Redirect authenticated users
  useEffect(() => {
    if (session.status === 'authenticated') {
      navigate(AUTHENTICATED_ENTRY_ROUTE, { replace: true });
    }
  }, [session.status, navigate]);

  if (session.status === 'authenticated') {
    return <></>;
  }

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
            <UserPlus className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <PageHeader
            titleKey="auth:register.title"
            descriptionKey="auth:register.subtitle"
            values={{ product: t('common:product.name') }}
            className="mt-6"
          />
        </div>

        <RegistrationForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {t('auth:register.hasAccount')}{' '}
          </span>
          <Link
            to={AUTH_ROUTES.signIn}
            className="font-medium text-primary hover:underline"
          >
            {t('auth:register.signIn')}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
