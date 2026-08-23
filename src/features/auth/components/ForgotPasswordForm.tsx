/**
 * Forgot Password Form.
 *
 * Request password reset link via email. Prompt 13 replacement for the
 * Prompt 3A scaffold — this used to fake-succeed via `setTimeout`. Now a
 * real mutation via `useRequestPasswordReset`
 * (`authenticationService.requestPasswordReset`).
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { ErrorState } from "@components/feedback";
import { useRequestPasswordReset } from "../hooks";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "auth:forgotPassword.errors.emailRequired")
    .email("auth:forgotPassword.errors.invalidEmail"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm(): JSX.Element {
  const { t } = useTranslation();
  const requestPasswordReset = useRequestPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const isLoading = requestPasswordReset.isPending;

  const handleFormSubmit = (data: ForgotPasswordFormData) => {
    requestPasswordReset.mutate({ email: data.email });
  };

  if (requestPasswordReset.isSuccess) {
    return (
      <Alert className="border-success bg-success/10">
        <CheckCircle2 className="size-4 text-success" />
        <AlertDescription className="text-success-foreground">
          {t("auth:forgotPassword.success.description")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {requestPasswordReset.error ? (
        <ErrorState onRetry={handleSubmit(handleFormSubmit)} />
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth:forgotPassword.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth:forgotPassword.emailPlaceholder")}
            autoComplete="email"
            disabled={isLoading}
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">
              {t(
                errors.email.message ||
                  "auth:forgotPassword.errors.emailRequired",
              )}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t("auth:forgotPassword.emailHint")}
          </p>
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
          : t("auth:forgotPassword.submit")}
      </Button>
    </form>
  );
}
