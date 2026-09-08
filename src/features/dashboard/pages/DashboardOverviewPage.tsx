/**
 * Dashboard overview page (Phase 8).
 *
 * Replaces the original placeholder shell (which deliberately fetched no
 * data, pending this phase) with the real widget dashboard, built on the
 * ONE server-side aggregation endpoint — never several calls stitched
 * together in the browser, and never a wider scope filtered down here.
 *
 * Scope (Organization Owner's whole organization vs. an Academy
 * Manager's single academy) is resolved by `useDashboardScope` for
 * PRESENTATION only; the real boundary is the backend's own guards and
 * RLS, which decide what data exists for this caller regardless of what
 * this page asks for.
 *
 * Deliberately NOT built here: the Phase 11 business components (Revenue
 * Card with trend, Trial Countdown, Academy Health Score, redesigned
 * Storage widget). This is the Phase 8 foundation those will later build
 * on, composed from the existing design system only.
 */
import { BookOpen, Building2, GraduationCap, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageContainer, PageHeader, SectionCard } from "@components/layout";
import { EmptyState, ErrorState } from "@components/feedback";
import { MetricCard } from "@components/data-display";
import { SectionLoader } from "@components/loading";
import { MyTicketsList } from "../components/MyTicketsList";
import { RecentActivityList } from "../components/RecentActivityList";
import { RevenueSummary } from "../components/RevenueSummary";
import { SubmitTicketForm } from "../components/SubmitTicketForm";
import { UsageSummary } from "../components/UsageSummary";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { useDashboardScope } from "../hooks/useDashboardScope";

export default function DashboardOverviewPage(): JSX.Element {
  const { i18n } = useTranslation();
  const scope = useDashboardScope();
  const { data, isLoading, isError, refetch } = useDashboardOverview();

  const formatCount = (value: number): string =>
    new Intl.NumberFormat(i18n.language).format(value);

  // No organization or academy context resolved — an honest empty state,
  // never a dashboard of zeros implying real, empty data.
  if (scope.kind === "none") {
    return (
      <PageContainer>
        <PageHeader
          titleKey="dashboard:overview.title"
          descriptionKey="dashboard:overview.description"
        />
        <SectionCard>
          <EmptyState
            icon={Building2}
            titleKey="dashboard:overview.noScope.title"
            descriptionKey="dashboard:overview.noScope.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="dashboard:overview.title"
          descriptionKey="dashboard:overview.description"
        />
        <SectionLoader />
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="dashboard:overview.title"
          descriptionKey="dashboard:overview.description"
        />
        <ErrorState
          titleKey="dashboard:overview.error.title"
          descriptionKey="dashboard:overview.error.description"
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const isAcademyScope = data.scope.type === "academy";

  return (
    <PageContainer>
      <PageHeader
        titleKey="dashboard:overview.title"
        descriptionKey={
          isAcademyScope
            ? "dashboard:overview.academyDescription"
            : "dashboard:overview.description"
        }
        values={{ academy: data.scope.academyName ?? "" }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* An Academy Manager sees their own academy's numbers only — the
            academy count is meaningless at that scope, so it is replaced
            by published courses rather than shown as a misleading "1". */}
        {isAcademyScope ? (
          <MetricCard
            labelKey="dashboard:metrics.publishedCourses"
            value={formatCount(data.counts.publishedCourses)}
            icon={BookOpen}
          />
        ) : (
          <MetricCard
            labelKey="dashboard:metrics.academies"
            value={formatCount(data.counts.academies)}
            icon={Building2}
          />
        )}
        <MetricCard
          labelKey="dashboard:metrics.courses"
          value={formatCount(data.counts.courses)}
          icon={BookOpen}
        />
        <MetricCard
          labelKey="dashboard:metrics.students"
          value={formatCount(data.counts.students)}
          icon={GraduationCap}
        />
        <MetricCard
          labelKey="dashboard:metrics.instructors"
          value={formatCount(data.counts.instructors)}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          titleKey="dashboard:revenue.title"
          descriptionKey="dashboard:revenue.description"
        >
          <RevenueSummary revenue={data.revenue} />
        </SectionCard>

        <SectionCard
          titleKey="dashboard:usage.title"
          descriptionKey="dashboard:usage.description"
        >
          {data.usage ? (
            <UsageSummary usage={data.usage} />
          ) : (
            <EmptyState
              icon={Building2}
              titleKey="dashboard:usage.unavailable.title"
              descriptionKey="dashboard:usage.unavailable.description"
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        titleKey="dashboard:activity.title"
        descriptionKey="dashboard:activity.description"
      >
        <RecentActivityList items={data.recentActivity} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          titleKey="dashboard:support.form.title"
          descriptionKey="dashboard:support.form.description"
        >
          <SubmitTicketForm />
        </SectionCard>

        <SectionCard
          titleKey="dashboard:support.list.title"
          descriptionKey="dashboard:support.list.description"
        >
          <MyTicketsList />
        </SectionCard>
      </div>
    </PageContainer>
  );
}
