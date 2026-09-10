/**
 * Profile Security Section.
 *
 * Manage password and security settings. Prompt 13 wired password change
 * to the real, pre-existing `currentUserService.changePassword` (it used
 * to fake-save via `setTimeout`).
 *
 * Phase 10 replaced the display-only session block with the real
 * `ProfileSessionsCard`, backed by `GET /auth/sessions` and
 * `DELETE /auth/sessions/:id`.
 *
 * Phase 10.3 replaced the permanently-disabled Two-Factor control with
 * the real `TwoFactorCard`, backed by `/auth/2fa/*`.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@components/feedback";
import { useToast } from "@hooks";
import { useChangePassword } from "../hooks";
import { ProfileSessionsCard } from "./ProfileSessionsCard";
import { TwoFactorCard } from "./TwoFactorCard";

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "profile:errors.currentPasswordRequired"),
    newPassword: z.string().min(8, "profile:errors.passwordTooShort"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "profile:errors.passwordMismatch",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export function ProfileSecuritySection(): JSX.Element {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const isLoading = changePassword.isPending;

  const handleFormSubmit = (data: PasswordFormData) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          toast({
            title: t("profile:success.passwordChanged"),
            description: t("profile:success.passwordUpdated"),
          });
          reset();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile:sections.security.changePassword")}</CardTitle>
          <CardDescription>
            {t("profile:sections.security.passwordDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {changePassword.error ? (
              <ErrorState onRetry={handleSubmit(handleFormSubmit)} />
            ) : null}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  {t("profile:fields.currentPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder={t("profile:placeholders.currentPassword")}
                    disabled={isLoading}
                    {...register("currentPassword")}
                    aria-invalid={!!errors.currentPassword}
                    className="pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                    aria-label={
                      showCurrentPassword
                        ? t("common:actions.hidePassword")
                        : t("common:actions.showPassword")
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                {errors.currentPassword ? (
                  <p className="text-sm text-destructive">
                    {t(
                      errors.currentPassword.message ||
                        "profile:errors.currentPasswordRequired",
                    )}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {t("profile:fields.newPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder={t("profile:placeholders.newPassword")}
                    disabled={isLoading}
                    {...register("newPassword")}
                    aria-invalid={!!errors.newPassword}
                    className="pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                    aria-label={
                      showNewPassword
                        ? t("common:actions.hidePassword")
                        : t("common:actions.showPassword")
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                {errors.newPassword ? (
                  <p className="text-sm text-destructive">
                    {t(
                      errors.newPassword.message ||
                        "profile:errors.passwordTooShort",
                    )}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {t("profile:hints.passwordRequirements")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t("profile:fields.confirmNewPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("profile:placeholders.confirmPassword")}
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
                        "profile:errors.passwordMismatch",
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t("common:actions.saving")
                : t("profile:actions.changePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <TwoFactorCard />

      <ProfileSessionsCard />
    </div>
  );
}
