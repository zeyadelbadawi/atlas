/**
 * The frame every Observability page shares: page header, the four-page tab
 * strip (identical to the sidebar branch) and the page body.
 */
import type { ReactNode } from 'react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import type { BreadcrumbItem } from '@types';
import { OBSERVABILITY_TABS } from './observability-tabs';

export interface ObservabilityShellProps {
  readonly titleKey: string;
  readonly title?: string;
  readonly descriptionKey?: string;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export function ObservabilityShell({
  titleKey,
  title,
  descriptionKey,
  breadcrumbs,
  actions,
  children,
}: ObservabilityShellProps): JSX.Element {
  return (
    <PageContainer>
      <PageHeader
        titleKey={titleKey}
        title={title}
        descriptionKey={descriptionKey}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
      <SectionTabs items={OBSERVABILITY_TABS} className="overflow-x-auto" />
      <div className="space-y-6">{children}</div>
    </PageContainer>
  );
}
