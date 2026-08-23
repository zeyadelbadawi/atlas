/**
 * Profile Preferences Section.
 *
 * Edit user preferences. Prompt 13 replacement for the Prompt 3A
 * scaffold — the form used to fake-save via `setTimeout` and collected a
 * `marketingEmails` toggle `UserPreferences.notifications` has no field
 * for (only `email`/`push`/`sms` exist, per `identity.types.ts`); that
 * toggle is removed rather than left half-fake. Language/theme apply
 * immediately via `useLanguage`/`useTheme` (unchanged, already real);
 * only the notification channels are persisted through this mutation.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@components/feedback";
import { useToast, useLanguage, useTheme, useAuth } from "@hooks";
import { useUpdatePreferences } from "../hooks";

const preferencesSchema = z.object({
  language: z.enum(["en", "ar"]),
  theme: z.enum(["light", "dark", "system"]),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

export function ProfilePreferencesSection(): JSX.Element {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { preference, setPreference } = useTheme();
  const { user } = useAuth();
  const updatePreferences = useUpdatePreferences();

  const { register, handleSubmit, setValue, watch } =
    useForm<PreferencesFormData>({
      resolver: zodResolver(preferencesSchema),
      defaultValues: {
        language: language as "en" | "ar",
        theme: preference as "light" | "dark" | "system",
        emailNotifications: user?.preferences?.notifications?.email ?? true,
        pushNotifications: user?.preferences?.notifications?.push ?? false,
      },
    });

  const formValues = watch();

  const handleFormSubmit = (data: PreferencesFormData) => {
    if (data.language !== language) {
      setLanguage(data.language);
    }
    if (data.theme !== preference) {
      setPreference(data.theme);
    }

    updatePreferences.mutate(
      {
        notifications: {
          email: data.emailNotifications,
          push: data.pushNotifications,
          sms: user?.preferences?.notifications?.sms ?? false,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: t("profile:success.preferencesUpdated"),
            description: t("profile:success.changesApplied"),
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile:sections.preferences.title")}</CardTitle>
        <CardDescription>
          {t("profile:sections.preferences.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {updatePreferences.error ? (
            <ErrorState onRetry={handleSubmit(handleFormSubmit)} />
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t("profile:fields.language")}</Label>
              <Select
                value={formValues.language}
                onValueChange={(value) =>
                  setValue("language", value as "en" | "ar", {
                    shouldDirty: true,
                  })
                }
                disabled={updatePreferences.isPending}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    {t("profile:languages.english")}
                  </SelectItem>
                  <SelectItem value="ar">
                    {t("profile:languages.arabic")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">{t("profile:fields.theme")}</Label>
              <Select
                value={formValues.theme}
                onValueChange={(value) =>
                  setValue("theme", value as "light" | "dark" | "system", {
                    shouldDirty: true,
                  })
                }
                disabled={updatePreferences.isPending}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    {t("profile:themes.light")}
                  </SelectItem>
                  <SelectItem value="dark">
                    {t("profile:themes.dark")}
                  </SelectItem>
                  <SelectItem value="system">
                    {t("profile:themes.system")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">
              {t("profile:sections.preferences.notifications")}
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications" className="font-normal">
                  {t("profile:fields.emailNotifications")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("profile:descriptions.emailNotifications")}
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={formValues.emailNotifications}
                onCheckedChange={(checked) =>
                  setValue("emailNotifications", checked, { shouldDirty: true })
                }
                disabled={updatePreferences.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pushNotifications" className="font-normal">
                  {t("profile:fields.pushNotifications")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("profile:descriptions.pushNotifications")}
                </p>
              </div>
              <Switch
                id="pushNotifications"
                checked={formValues.pushNotifications}
                onCheckedChange={(checked) =>
                  setValue("pushNotifications", checked, { shouldDirty: true })
                }
                disabled={updatePreferences.isPending}
              />
            </div>
          </div>

          <Button type="submit" disabled={updatePreferences.isPending}>
            <Save className="me-2 size-4" aria-hidden />
            {updatePreferences.isPending
              ? t("common:actions.saving")
              : t("common:actions.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
