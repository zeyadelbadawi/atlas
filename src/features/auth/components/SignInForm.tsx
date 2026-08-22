/**
 * Sign In Form.
 *
 * Email and password authentication form with validation.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AUTH_ROUTES } from "@app/routes/route-paths";
import type { ApiError } from "@api";

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "auth:signIn.errors.emailRequired")
    .email("auth:signIn.errors.invalidEmail"),
  password: z.string().min(1, "auth:signIn.errors.passwordRequired"),
  rememberMe: z.boolean().optional(),
});

type SignInFormData = z.infer<typeof signInSchema>;

export interface SignInFormProps {
  readonly onSubmit: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
}

export function SignInForm({
  onSubmit,
  isLoading,
  error,
}: SignInFormProps): JSX.Element {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const handleFormSubmit = async (data: SignInFormData) => {
    await onSubmit(data.email, data.password, data.rememberMe ?? false);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t(error.messageKey || "auth:signIn.errors.invalidCredentials")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth:signIn.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth:signIn.emailPlaceholder")}
            autoComplete="email"
            disabled={isLoading}
            {...register("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {t(errors.email.message || "auth:signIn.errors.emailRequired")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth:signIn.password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth:signIn.passwordPlaceholder")}
              autoComplete="current-password"
              disabled={isLoading}
              {...register("password")}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
              aria-label={
                showPassword
                  ? t("common:actions.hidePassword")
                  : t("common:actions.showPassword")
              }
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.password ? (
            <p id="password-error" className="text-sm text-destructive">
              {t(
                errors.password.message ||
                  "auth:signIn.errors.passwordRequired",
              )}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              {...register("rememberMe")}
              disabled={isLoading}
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-normal cursor-pointer"
            >
              {t("auth:signIn.rememberMe")}
            </Label>
          </div>

          <Link
            to={AUTH_ROUTES.forgotPassword}
            className="text-sm font-medium text-primary hover:underline"
            tabIndex={isLoading ? -1 : 0}
          >
            {t("auth:signIn.forgotPassword")}
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? t("common:actions.loading") : t("auth:signIn.submit")}
      </Button>
    </form>
  );
}
