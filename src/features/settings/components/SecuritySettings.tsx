/**
 * Security Settings Component.
 *
 * Platform-level security configuration.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SecuritySettings(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings:security.title")}</CardTitle>
          <CardDescription>
            {t("settings:security.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("settings:security.twoFactorAuth")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings:security.twoFactorAuthDescription")}
              </p>
            </div>
            <Switch />
          </div>

          <div className="space-y-2">
            <Label>{t("settings:security.sessionTimeout")}</Label>
            <Select defaultValue="30">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">
                  {t("settings:security.timeout15")}
                </SelectItem>
                <SelectItem value="30">
                  {t("settings:security.timeout30")}
                </SelectItem>
                <SelectItem value="60">
                  {t("settings:security.timeout60")}
                </SelectItem>
                <SelectItem value="never">
                  {t("settings:security.timeoutNever")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
