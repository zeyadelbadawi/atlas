/**
 * Profile Personal Section.
 *
 * Edit personal information (name, email, phone, bio).
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast, useUnsavedChanges } from "@hooks";
import type { CurrentUser } from "@types";

const personalSchema = z.object({
  firstName: z.string().min(1, "profile:errors.firstNameRequired"),
  lastName: z.string().min(1, "profile:errors.lastNameRequired"),
  email: z.string().email("profile:errors.invalidEmail"),
  phone: z.string().optional(),
  bio: z.string().max(500, "profile:errors.bioTooLong").optional(),
});

type PersonalFormData = z.infer<typeof personalSchema>;

export interface ProfilePersonalSectionProps {
  readonly user: CurrentUser;
}

export function ProfilePersonalSection({
  user,
}: ProfilePersonalSectionProps): JSX.Element {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<PersonalFormData>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      firstName: user.name.split(" ")[0] || "",
      lastName: user.name.split(" ").slice(1).join(" ") || "",
      email: user.email,
      phone: "",
      bio: "",
    },
  });

  useUnsavedChanges({
    isDirty: isDirty && isEditing,
    messageKey: "profile:unsavedChanges",
  });

  const handleFormSubmit = async (data: PersonalFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Profile update will be connected to backend service in future
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: t("profile:success.profileUpdated"),
        description: t("profile:success.changesApplied"),
      });

      setIsEditing(false);
      reset(data);
    } catch (err) {
      setError("profile:errors.updateFailed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile:sections.personal.title")}</CardTitle>
        <CardDescription>
          {t("profile:sections.personal.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{t(error)}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("profile:fields.firstName")}</Label>
              <Input
                id="firstName"
                disabled={!isEditing || isLoading}
                {...register("firstName")}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName ? (
                <p className="text-sm text-destructive">
                  {t(
                    errors.firstName.message ||
                      "profile:errors.firstNameRequired",
                  )}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">{t("profile:fields.lastName")}</Label>
              <Input
                id="lastName"
                disabled={!isEditing || isLoading}
                {...register("lastName")}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName ? (
                <p className="text-sm text-destructive">
                  {t(
                    errors.lastName.message ||
                      "profile:errors.lastNameRequired",
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("profile:fields.email")}</Label>
            <Input
              id="email"
              type="email"
              disabled={!isEditing || isLoading}
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">
                {t(errors.email.message || "profile:errors.invalidEmail")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("profile:fields.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t("profile:placeholders.phone")}
              disabled={!isEditing || isLoading}
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t("profile:fields.bio")}</Label>
            <Textarea
              id="bio"
              placeholder={t("profile:placeholders.bio")}
              disabled={!isEditing || isLoading}
              {...register("bio")}
              rows={4}
              aria-invalid={!!errors.bio}
            />
            {errors.bio ? (
              <p className="text-sm text-destructive">
                {t(errors.bio.message || "profile:errors.bioTooLong")}
              </p>
            ) : null}
          </div>

          <div className="flex gap-3">
            {!isEditing ? (
              <Button type="button" onClick={() => setIsEditing(true)}>
                {t("common:actions.edit")}
              </Button>
            ) : (
              <>
                <Button type="submit" disabled={isLoading || !isDirty}>
                  <Save className="me-2 size-4" aria-hidden />
                  {isLoading
                    ? t("common:actions.saving")
                    : t("common:actions.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="me-2 size-4" aria-hidden />
                  {t("common:actions.cancel")}
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
