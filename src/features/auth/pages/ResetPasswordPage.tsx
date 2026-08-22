/**
 * Reset Password Page.
 *
 * Set new password after receiving reset link.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { AUTH_ROUTES } from "@app/routes/route-paths";
import { PageContainer, PageHeader } from "@components/layout";
import { ResetPasswordForm } from "../components/ResetPasswordForm";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const token = searchParams.get("token");

  useEffect(() => {
    // Validate reset token
    if (!token) {
      setTokenValid(false);
      return;
    }

    // Token validation will be connected to backend service in future
    // For now, accept any token
    setTokenValid(true);
  }, [token]);

  if (tokenValid === null) {
    return (
      <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t("common:actions.loading")}</p>
        </div>
      </PageContainer>
    );
  }

  if (tokenValid === false) {
    return (
      <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <Alert variant="destructive">
            <AlertDescription>
              {t("auth:resetPassword.errors.invalidToken")}
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Link
              to={AUTH_ROUTES.forgotPassword}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("auth:resetPassword.requestNewLink")}
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <PageHeader
            titleKey="auth:resetPassword.title"
            descriptionKey="auth:resetPassword.subtitle"
            className="mt-6"
          />
        </div>

        <ResetPasswordForm token={token!} />
      </div>
    </PageContainer>
  );
}
