/**
 * Sign In Page.
 *
 * Authenticates users with email and password using the existing
 * SessionService and AuthenticationService infrastructure.
 */
import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";
import { useAuth, useSignIn } from "@hooks";
import {
  AUTHENTICATED_ENTRY_ROUTE,
  AUTH_ROUTES,
} from "@app/routes/route-paths";
import { PageContainer, PageHeader } from "@components/layout";
import { SignInForm } from "../components/SignInForm";

export default function SignInPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { signIn, isLoading, error, clearError } = useSignIn();

  // Redirect authenticated users
  useEffect(() => {
    if (session.status === "authenticated") {
      const redirectTo =
        searchParams.get("redirect") || AUTHENTICATED_ENTRY_ROUTE;
      navigate(redirectTo, { replace: true });
    }
  }, [session.status, navigate, searchParams]);

  const handleSignIn = async (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => {
    clearError();
    try {
      await signIn({ email, password, rememberMe });
      // Navigation happens automatically via the effect above
    } catch {
      // Error is already set by useSignIn
    }
  };

  if (session.status === "authenticated") {
    return <></>;
  }

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
            <LogIn className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <PageHeader
            titleKey="auth:signIn.title"
            descriptionKey="auth:signIn.subtitle"
            values={{ product: t("common:product.name") }}
            className="mt-6"
          />
        </div>

        <SignInForm
          onSubmit={handleSignIn}
          isLoading={isLoading}
          error={error}
        />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {t("auth:signIn.noAccount")}{" "}
          </span>
          <Link
            to={AUTH_ROUTES.register}
            className="font-medium text-primary hover:underline"
          >
            {t("auth:signIn.signUp")}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
