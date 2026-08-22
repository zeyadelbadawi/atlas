/**
 * Reset Password Form.
 *
 * Set new password with confirmation.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@hooks";
import { AUTH_ROUTES } from "@app/routes/route-paths";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "auth:resetPassword.errors.passwordTooShort"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth:resetPassword.errors.passwordMismatch",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export interface ResetPasswordFormProps {
  readonly token: string;
}

export function ResetPasswordForm({
  token,
}: ResetPasswordFormProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleFormSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Password reset logic will be connected to backend service in future
      // For now, simulate password reset
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: t("auth:resetPassword.success.title"),
        description: t("auth:resetPassword.success.description"),
      });

      navigate(AUTH_ROUTES.signIn);
    } catch (err) {
      setError("auth:resetPassword.errors.resetFailed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{t(error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">
            {t("auth:resetPassword.newPassword")}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth:resetPassword.passwordPlaceholder")}
              autoComplete="new-password"
              disabled={isLoading}
              {...register("password")}
              aria-invalid={!!errors.password}
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
            <p className="text-sm text-destructive">
              {t(
                errors.password.message ||
                  "auth:resetPassword.errors.passwordTooShort",
              )}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("auth:resetPassword.passwordHint")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            {t("auth:resetPassword.confirmPassword")}
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth:resetPassword.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              disabled={isLoading}
              {...register("confirmPassword")}
              aria-invalid={!!errors.confirmPassword}
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
              aria-label={
                showConfirmPassword
                  ? t("common:actions.hidePassword")
                  : t("common:actions.showPassword")
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {t(
                errors.confirmPassword.message ||
                  "auth:resetPassword.errors.passwordMismatch",
              )}
            </p>
          ) : null}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading
          ? t("common:actions.loading")
          : t("auth:resetPassword.submit")}
      </Button>
    </form>
  );
}
