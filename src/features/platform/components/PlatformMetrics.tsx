/**
 * Platform Metrics Component.
 *
 * Displays detailed platform-level metrics and health indicators.
 */
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function PlatformMetrics(): JSX.Element {
  const { t } = useTranslation();

  const metrics = [
    {
      label: t("platform:metrics.systemHealth"),
      value: 100,
      status: "healthy" as const,
    },
    {
      label: t("platform:metrics.storageUsage"),
      value: 0,
      status: "normal" as const,
    },
    {
      label: t("platform:metrics.apiUptime"),
      value: 100,
      status: "healthy" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("platform:sections.metrics")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{metric.label}</span>
              <span className="text-muted-foreground">{metric.value}%</span>
            </div>
            <Progress value={metric.value} className="h-2" />
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {t("platform:metrics.lastUpdated", {
              time: new Date().toLocaleTimeString(),
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
