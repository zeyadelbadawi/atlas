/**
 * Dashboard overview page.
 *
 * Demonstrates the composition every future module page will follow:
 * PageContainer -> PageHeader -> content sections built from shared components.
 *
 * Deliberately contains no business logic and fetches no data: dashboard
 * business behaviour belongs to a later prompt. This page exists to prove the
 * shell, and to establish the page structure modules must adopt.
 */
import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageContainer, PageHeader, SectionCard } from "@components/layout";
import { EmptyState } from "@components/feedback";

export default function DashboardOverviewPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader
        titleKey="dashboard:overview.title"
        descriptionKey="dashboard:overview.description"
      />

      <SectionCard
        titleKey="dashboard:overview.foundation.title"
        descriptionKey="dashboard:overview.foundation.description"
      >
        <EmptyState
          icon={Compass}
          titleKey="dashboard:overview.empty.title"
          descriptionKey="dashboard:overview.empty.description"
          values={{ product: t("common:product.name") }}
        />
      </SectionCard>
    </PageContainer>
  );
}
