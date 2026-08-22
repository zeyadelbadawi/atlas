/**
 * Profile Preferences Section.
 *
 * Edit user preferences (language, theme, notifications).
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
import { useToast, useLanguage, useTheme } from "@hooks";
import { useState } from "react";

const preferencesSchema = z.object({
  language: z.enum(["en", "ar"]),
  theme: z.enum(["light", "dark", "system"]),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  marketingEmails: z.boolean(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

export function ProfilePreferencesSection(): JSX.Element {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { preference, setPreference } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setValue, watch } =
    useForm<PreferencesFormData>({
      resolver: zodResolver(preferencesSchema),
      defaultValues: {
        language: language as "en" | "ar",
        theme: preference as "light" | "dark" | "system",
        emailNotifications: true,
        pushNotifications: false,
        marketingEmails: false,
      },
    });

  const formValues = watch();

  const handleFormSubmit = async (data: PreferencesFormData) => {
    setIsLoading(true);

    try {
      // Apply language and theme changes immediately
      if (data.language !== language) {
        setLanguage(data.language);
      }
      if (data.theme !== preference) {
        setPreference(data.theme);
      }

      // Preferences update will be connected to backend service in future
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: t("profile:success.preferencesUpdated"),
        description: t("profile:success.changesApplied"),
      });
    } finally {
      setIsLoading(false);
    }
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketingEmails" className="font-normal">
                  {t("profile:fields.marketingEmails")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("profile:descriptions.marketingEmails")}
                </p>
              </div>
              <Switch
                id="marketingEmails"
                checked={formValues.marketingEmails}
                onCheckedChange={(checked) =>
                  setValue("marketingEmails", checked, { shouldDirty: true })
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            <Save className="me-2 size-4" aria-hidden />
            {isLoading ? t("common:actions.saving") : t("common:actions.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
