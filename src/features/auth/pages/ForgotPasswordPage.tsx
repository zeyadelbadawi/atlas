/**
 * Forgot Password Page.
 *
 * Request password reset email.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import { AUTH_ROUTES } from "@app/routes/route-paths";
import { PageContainer, PageHeader } from "@components/layout";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export default function ForgotPasswordPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
            <KeyRound className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <PageHeader
            titleKey="auth:forgotPassword.title"
            descriptionKey="auth:forgotPassword.subtitle"
            className="mt-6"
          />
        </div>

        <ForgotPasswordForm />

        <div className="text-center text-sm">
          <Link
            to={AUTH_ROUTES.signIn}
            className="font-medium text-primary hover:underline"
          >
            {t("auth:forgotPassword.backToSignIn")}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
