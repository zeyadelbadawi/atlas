/**
 * The visual editor's settings for the whole website, beside the page
 * they change.
 *
 * - Theme: a switch saves to the website's draft (`themeKey`), and the
 *   canvas redraws in it at once. Leaving a retired theme is one-way, so it
 *   is confirmed first — as on the Website settings page.
 * - Logo and colours: shown here; they are edited in Brand Studio (Visual
 *   identity), and — unlike everything else in this editor — they apply to
 *   the live site as soon as they are saved there, which is said.
 * - Menu, header button and footer: the Website settings page's own fields
 *   (`WebsiteNavigationTab`, stacked for the panel), saved to the draft
 *   as they are changed; the canvas follows.
 * - This page's search-engine text (`WebsitePageSeoDialog`).
 * - Publishing the website: the theme, menu, header and footer reach
 *   visitors when the WEBSITE is published (`WebsitePublishBar`), not with
 *   this page's Publish — so the bar is here, where those are changed.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, Search, X } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { cn } from '@utils';
import { RETIRED_WEBSITE_THEME_KEYS } from '@types';
import type {
  WebsiteConfiguration,
  WebsitePage,
  WebsiteThemeDefinition,
} from '@types';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { UPDATE_WEBSITE_CONFIGURATION_MUTATION_KEY } from '../hooks/useUpdateWebsiteConfiguration';

/** How long publishing waits for settings still being saved. */
const SETTINGS_SAVE_WAIT_MS = 15_000;
import {
  getWebsiteTheme,
  listWebsiteThemes,
} from '../themes/website-theme.registry';
import { WebsiteNavigationTab } from '../components/WebsiteNavigationTab';
import { WebsitePageSeoDialog } from '../components/WebsitePageSeoDialog';
import { WebsitePublishBar } from '../components/WebsitePublishBar';

export interface SiteSettingsPanelProps {
  readonly academyId: string;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
  /** The page open in the editor (its search-engine text). */
  readonly page: WebsitePage;
  readonly canManage: boolean;
  /** This page has edits not saved yet; publishing the website saves them first. */
  readonly pendingLocalEdits: boolean;
  readonly onBeforePublish: () => Promise<boolean>;
  readonly onClose: () => void;
}

export function SiteSettingsPanel({
  academyId,
  academyName,
  academyLogo,
  configuration,
  pages,
  page,
  canManage,
  pendingLocalEdits,
  onBeforePublish,
  onClose,
}: SiteSettingsPanelProps): JSX.Element {
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration();
  const [pendingTheme, setPendingTheme] =
    useState<WebsiteThemeDefinition | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const isRetired = (RETIRED_WEBSITE_THEME_KEYS as readonly string[]).includes(
    configuration.themeKey
  );
  const currentName = t(getWebsiteTheme(configuration.themeKey).nameKey);
  const brand = configuration.brand;
  const swatches = [
    brand.primaryColor,
    brand.secondaryColor,
    brand.accentColor,
  ].filter(Boolean);

  const selectTheme = (theme: WebsiteThemeDefinition) =>
    updateConfig.mutate(
      { academyId, payload: { themeKey: theme.key } },
      {
        onError: () =>
          toast({
            title: t('website:visualEditor.site.themeSaveError'),
            variant: 'destructive',
          }),
      }
    );

  /*
    PUBLISH WHAT IS ON SCREEN. Publishing promotes the saved draft, and a
    theme or menu change is saved as it is made — so a publish clicked
    while one is still on its way would publish the copy before it (a
    field's change is saved when it loses focus, which is the publish
    click itself). Wait for every settings save in flight, then save this
    page's edits, then publish.
  */
  const queryClient = useQueryClient();
  const publishWhenSaved = async (): Promise<boolean> => {
    const started = Date.now();
    while (
      queryClient.isMutating({
        mutationKey: UPDATE_WEBSITE_CONFIGURATION_MUTATION_KEY,
      }) > 0
    ) {
      if (Date.now() - started > SETTINGS_SAVE_WAIT_MS) return false;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return onBeforePublish();
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="site-settings">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {t('website:visualEditor.site.title')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          onClick={onClose}
          aria-label={t('website:visualEditor.settings.close')}
          title={t('website:visualEditor.settings.close')}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {t('website:visualEditor.site.hint')}
        </p>
        <Accordion
          type="multiple"
          defaultValue={['theme']}
          className="space-y-2"
        >
          <AccordionItem value="theme" className="rounded-lg border px-3">
            <AccordionTrigger className="text-sm">
              {t('website:visualEditor.site.theme')}
            </AccordionTrigger>
            <AccordionContent>
              <fieldset
                className="space-y-2"
                disabled={!canManage || updateConfig.isPending}
              >
                <legend className="sr-only">
                  {t('website:visualEditor.site.theme')}
                </legend>
                {listWebsiteThemes(configuration.themeKey).map((theme) => {
                  const active = configuration.themeKey === theme.key;
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      aria-pressed={active}
                      data-theme-option={theme.key}
                      onClick={() => {
                        if (active) return;
                        if (isRetired) setPendingTheme(theme);
                        else selectTheme(theme);
                      }}
                      className={cn(
                        'flex min-h-11 w-full items-start gap-3 rounded-md border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent/40'
                      )}
                    >
                      <span
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border"
                        style={{
                          background: `hsl(${theme.tokens.defaultPrimary})`,
                        }}
                        aria-hidden
                      >
                        {active ? (
                          <Check className="size-3 text-white" />
                        ) : null}
                      </span>
                      <span className="min-w-0 space-y-0.5">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {t(theme.nameKey)}
                          {active ? (
                            <Badge variant="secondary" className="px-1.5 py-0">
                              {t('website:visualEditor.site.current')}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block text-xs leading-relaxed text-muted-foreground">
                          {t(theme.descriptionKey)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </fieldset>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="brand" className="rounded-lg border px-3">
            <AccordionTrigger className="text-sm">
              {t('website:visualEditor.site.brand')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center gap-3">
                {academyLogo ? (
                  <img
                    src={academyLogo}
                    alt=""
                    className="size-10 rounded-md border border-border object-contain"
                  />
                ) : null}
                <div className="flex gap-1.5" aria-hidden>
                  {swatches.map((color, index) => (
                    <span
                      key={index}
                      className="size-7 rounded-full border border-border"
                      style={{ background: `hsl(${color})` }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('website:visualEditor.site.brandHint')}
              </p>
              {canManage ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    to={buildPath(DASHBOARD_ROUTES.academyBranding, {
                      academyId,
                    })}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    {t('website:visualEditor.site.editBrand')}
                  </Link>
                </Button>
              ) : null}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="navigation" className="rounded-lg border px-3">
            <AccordionTrigger className="text-sm">
              {t('website:visualEditor.site.navigation')}
            </AccordionTrigger>
            <AccordionContent>
              <fieldset disabled={!canManage} className="min-w-0">
                <WebsiteNavigationTab
                  academyId={academyId}
                  configuration={configuration}
                  pages={pages}
                  compact
                />
              </fieldset>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="seo" className="rounded-lg border px-3">
            <AccordionTrigger className="text-sm">
              {t('website:visualEditor.site.seo')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('website:visualEditor.site.seoHint', { page: page.title })}
              </p>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSeoOpen(true)}
                >
                  <Search className="size-4" aria-hidden />
                  {t('website:editor.seoAction')}
                </Button>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-4 space-y-2">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('website:visualEditor.site.publishHint')}
          </p>
          <WebsitePublishBar
            academyId={academyId}
            status={configuration.status}
            lastPublishedAt={configuration.publishedAt}
            unpublishedChanges={configuration.unpublishedChanges}
            pendingLocalEdits={pendingLocalEdits}
            onBeforePublish={publishWhenSaved}
          />
        </div>
      </div>

      {canManage ? (
        <WebsitePageSeoDialog
          academyId={academyId}
          academyName={academyName}
          configuration={configuration}
          page={page}
          open={seoOpen}
          onOpenChange={setSeoOpen}
        />
      ) : null}

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
                if (pendingTheme) selectTheme(pendingTheme);
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
