/**
 * Academy Branding Page.
 *
 * Manage academy visual identity including logo, favicon, and display name.
 * The form itself is `AcademyBrandingForm`, shared with the New Customer
 * Onboarding shell's Branding step.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SectionTabs } from '@components/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAcademy } from '../hooks';
import { getAcademyAdminTabs } from '../utils/academy-navigation.utils';
import { AcademyBrandingForm } from '../components/AcademyBrandingForm';
import type { BreadcrumbItem } from '@types';

export default function AcademyBrandingPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const {
    data: academy,
    isLoading,
    error: loadError,
    refetch,
  } = useAcademy(academyId ?? '');

  const handleCancel = () => {
    navigate(DASHBOARD_ROUTES.academy + `?academyId=${academyId}`);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || !academy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:branding.title"
          descriptionKey="academy:branding.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academy.name,
      path: DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'academy:branding.title' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="academy:branding.title"
        descriptionKey="academy:branding.subtitle"
        breadcrumbs={breadcrumbs}
      />

      <SectionTabs items={getAcademyAdminTabs(academyId ?? '')} />

      {/*
        This page only ever managed name/logo/favicon — brand COLORS live
        on the Website Builder's own Brand tab (`WebsiteBrandTab.tsx`,
        which carries the exact symmetric pointer back to this page for
        logo/name). Without this, an Owner looking for colors here would
        find nothing and no signpost to where they actually are.
      */}
      <Alert>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{t('academy:branding.colorsPointer')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(
                buildPath(DASHBOARD_ROUTES.websiteSettings, {
                  academyId: academyId ?? '',
                })
              )
            }
          >
            {t('academy:branding.colorsPointerAction')}
            <ExternalLink className="size-3.5" aria-hidden />
          </Button>
        </AlertDescription>
      </Alert>

      <AcademyBrandingForm academy={academy} onCancel={handleCancel} />
    </PageContainer>
  );
}
