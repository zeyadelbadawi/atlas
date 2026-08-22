/**
 * Notification Settings Component.
 *
 * Configure notification preferences and delivery channels.
 */
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function NotificationSettings(): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings:notifications.title")}</CardTitle>
        <CardDescription>
          {t("settings:notifications.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings:notifications.emailNotifications")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:notifications.emailNotificationsDescription")}
            </p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings:notifications.pushNotifications")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:notifications.pushNotificationsDescription")}
            </p>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings:notifications.activityDigest")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:notifications.activityDigestDescription")}
            </p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}
