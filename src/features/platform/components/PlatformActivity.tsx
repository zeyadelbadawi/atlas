/**
 * Platform Activity Component.
 *
 * Displays recent platform-wide activity and events.
 */
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PlatformActivity(): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("platform:sections.activity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                {t("platform:activity.empty")}
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
