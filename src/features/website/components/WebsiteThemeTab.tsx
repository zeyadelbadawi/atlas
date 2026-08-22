/**
 * Website Theme Tab.
 */
import { EmptyState } from '@components/feedback';
import { listWebsiteThemes } from '../themes/website-theme.registry';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { WebsiteThemePreviewCard } from './WebsiteThemePreviewCard';
import type { WebsiteConfiguration, WebsitePage } from '@types';

export interface WebsiteThemeTabProps {
  readonly academyId: string;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
}

export function WebsiteThemeTab({
  academyId,
  academyName,
  academyLogo,
  configuration,
  pages,
}: WebsiteThemeTabProps): JSX.Element {
  const updateConfig = useUpdateWebsiteConfiguration();
  const homePage = pages.find((page) => page.coreType === 'home');

  if (!homePage) {
    return <EmptyState titleKey="website:theme.noHomePage" />;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listWebsiteThemes().map((theme) => (
        <WebsiteThemePreviewCard
          key={theme.key}
          theme={theme}
          isActive={configuration.themeKey === theme.key}
          academyId={academyId}
          academyName={academyName}
          academyLogo={academyLogo}
          configuration={configuration}
          pages={pages}
          homePage={homePage}
          isSelecting={updateConfig.isPending}
          onSelect={() =>
            updateConfig.mutate({
              academyId,
              payload: { themeKey: theme.key },
            })
          }
        />
      ))}
    </div>
  );
}
