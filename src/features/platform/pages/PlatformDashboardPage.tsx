/**
 * Platform Owner Dashboard Page.
 *
 * Provides platform-wide overview for Platform Owners including metrics,
 * health indicators, and operational summaries.
 */
import { useTranslation } from "react-i18next";
import { Building2, Users, GraduationCap, TrendingUp } from "lucide-react";
import { PageContainer, PageHeader } from "@components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformMetrics } from "../components/PlatformMetrics";
import { PlatformActivity } from "../components/PlatformActivity";

export default function PlatformDashboardPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:dashboard.title"
        descriptionKey="platform:dashboard.description"
      />

      <div className="space-y-6">
        {/* Key Metrics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("platform:metrics.totalAcademies")}
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                {t("platform:metrics.academiesGrowth", { value: "+0%" })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("platform:metrics.totalUsers")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                {t("platform:metrics.usersGrowth", { value: "+0%" })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("platform:metrics.activeCourses")}
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                {t("platform:metrics.coursesGrowth", { value: "+0%" })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("platform:metrics.revenue")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">
                {t("platform:metrics.revenueGrowth", { value: "+0%" })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PlatformMetrics />
          <PlatformActivity />
        </div>
      </div>
    </PageContainer>
  );
}
