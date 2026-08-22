/**
 * General Settings Component.
 *
 * Platform-wide general configuration settings.
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function GeneralSettings(): JSX.Element {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t("settings:general.saved"),
      description: t("settings:general.savedDescription"),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings:general.title")}</CardTitle>
        <CardDescription>{t("settings:general.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="platform-name">
              {t("settings:general.platformName")}
            </Label>
            <Input
              id="platform-name"
              defaultValue="Atlas Platform"
              placeholder={t("settings:general.platformNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform-description">
              {t("settings:general.platformDescription")}
            </Label>
            <Textarea
              id="platform-description"
              rows={4}
              placeholder={t("settings:general.platformDescriptionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">
              {t("settings:general.supportEmail")}
            </Label>
            <Input
              id="support-email"
              type="email"
              placeholder={t("settings:general.supportEmailPlaceholder")}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">{t("settings:general.save")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
