/**
 * Website Theme Tab.
 *
 * A website still on a retired theme (Themes 2–5) keeps it, shown as the
 * current card, and is told plainly what moving to Modern Education means
 * before it happens: the switch can't be undone, because a retired theme
 * can't be chosen again (the backend accepts only the selectable themes).
 * It changes the draft only; the live site changes on publish.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { EmptyState } from '@components/feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getWebsiteTheme,
  listWebsiteThemes,
} from '../themes/website-theme.registry';
import { RequestServiceCard } from '@features/customer-requests';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { WebsiteThemePreviewCard } from './WebsiteThemePreviewCard';
import { RETIRED_WEBSITE_THEME_KEYS } from '@types';
import type {
  WebsiteConfiguration,
  WebsitePage,
  WebsiteThemeDefinition,
} from '@types';

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
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration();
  const [pendingTheme, setPendingTheme] =
    useState<WebsiteThemeDefinition | null>(null);
  const homePage = pages.find((page) => page.coreType === 'home');
  const isRetired = (RETIRED_WEBSITE_THEME_KEYS as readonly string[]).includes(
    configuration.themeKey
  );
  const currentName = t(getWebsiteTheme(configuration.themeKey).nameKey);

  if (!homePage) {
    return <EmptyState titleKey="website:theme.noHomePage" />;
  }

  const select = (theme: WebsiteThemeDefinition) =>
    updateConfig.mutate({ academyId, payload: { themeKey: theme.key } });

  return (
    <div className="space-y-6">
      {isRetired ? (
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>
            {t('website:theme.retiredTitle', { theme: currentName })}
          </AlertTitle>
          <AlertDescription>
            {t('website:theme.retiredDescription', { theme: currentName })}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listWebsiteThemes(configuration.themeKey).map((theme) => (
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
            // Leaving a retired theme is one-way: confirm first.
            onSelect={() =>
              isRetired ? setPendingTheme(theme) : select(theme)
            }
          />
        ))}
      </div>

      {/* Owners/administrators only (the card checks the academy role):
          a theme designed by the Atlas team, below the stock choices. */}
      <RequestServiceCard type="theme" />

      <AlertDialog
        open={pendingTheme !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTheme(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('website:theme.switchConfirmTitle', {
                theme: pendingTheme ? t(pendingTheme.nameKey) : '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('website:theme.switchConfirmDescription', {
                current: currentName,
                theme: pendingTheme ? t(pendingTheme.nameKey) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTheme) select(pendingTheme);
                setPendingTheme(null);
              }}
            >
              {t('website:theme.switchConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
