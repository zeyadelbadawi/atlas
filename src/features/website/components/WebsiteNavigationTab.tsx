/**
 * Website Navigation Tab.
 *
 * Manages primary navigation (which pages appear, their order and label),
 * the header CTA, and footer copyright/social links. Reordering uses
 * explicit move-up/move-down controls — the same keyboard-accessible
 * pattern Course Builder's curriculum reordering already established
 * (Prompt 3C) — never drag-and-drop as the only way to reorder.
 */
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import { LocalizedTextField } from './LocalizedTextField';
import { SocialLinksEditor } from './SocialLinksEditor';
import {} from '../utils/auth-page-copy.utils';
import type {
  LocalizedText,
  UpdateWebsiteConfigurationPayload,
  WebsiteConfiguration,
  WebsiteFooterLink,
  WebsiteNavigationItem,
  WebsitePage,
} from '@types';

const EMPTY_LOCALIZED: LocalizedText = { en: '', ar: '' };

export interface WebsiteNavigationTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
}

function reorder<T>(
  items: readonly T[],
  index: number,
  direction: -1 | 1
): T[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return [...items];
  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function WebsiteNavigationTab({
  academyId,
  configuration,
  pages,
}: WebsiteNavigationTabProps): JSX.Element {
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration();
  const { invalidate } = useInvalidate();

  /**
   * Every change on this tab is a full replace of navigation, header or
   * footer, built from the copy on screen. It carries that copy's
   * `updatedAt`, so a save based on a copy a colleague has since changed is
   * refused rather than silently replacing their work; the latest copy is
   * then loaded and the change can be made again on top of it.
   */
  const save = (payload: UpdateWebsiteConfigurationPayload) => {
    updateConfig.mutate(
      {
        academyId,
        payload: { ...payload, expectedUpdatedAt: configuration.updatedAt },
      },
      {
        onError: (error) => {
          if (error.kind === 'conflict') {
            toast({
              title: t('website:navigation.staleConflict'),
              variant: 'destructive',
            });
            void invalidate(websiteKeys.configuration(academyId));
            return;
          }
          toast({
            title: t('website:navigation.saveError'),
            variant: 'destructive',
          });
        },
      }
    );
  };

  const navPageIds = new Set(
    configuration.navigation.map((item) => item.pageId)
  );
  const sortedNav = [...configuration.navigation].sort(
    (a, b) => a.order - b.order
  );
  const navigablePages = pages.filter(
    (page) => page.coreType !== 'courseDetails'
  );

  const persistNavigation = (navigation: readonly WebsiteNavigationItem[]) => {
    save({
      navigation: navigation.map((item, index) => ({
        ...item,
        order: index,
      })),
    });
  };

  const togglePageInNav = (page: WebsitePage, inNav: boolean) => {
    if (inNav) {
      persistNavigation([
        ...configuration.navigation,
        {
          id: crypto.randomUUID(),
          // `page.title` (a plain, admin-internal label — see
          // `WebsitePage.title`'s own doc comment) seeds English only; an
          // Owner fills in Arabic afterward via the reorder list below,
          // same "start from something real, never a blank field" default
          // this tab already used before Phase 6.
          label: { en: page.title, ar: '' },
          pageId: page.id,
          order: configuration.navigation.length,
        },
      ]);
    } else {
      persistNavigation(
        configuration.navigation.filter((item) => item.pageId !== page.id)
      );
    }
  };

  const renameItem = (id: string, label: LocalizedText) => {
    persistNavigation(
      configuration.navigation.map((item) =>
        item.id === id ? { ...item, label } : item
      )
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    persistNavigation(reorder(sortedNav, index, direction));
  };

  const currentCta = configuration.header.cta;
  /**
   * Read but never edited here any more.
   *
   * Editing Sign In/Sign Up copy used to live in this tab AND on the Pages
   * list, both opening the same `AuthPageCopyDialog` through the same
   * `buildAuthPageCopyHeaderPatch` helper — the same capability in two
   * places. The Pages list is the right home for it: that is where an
   * admin already goes to browse and customise the pages of their site,
   * and Sign In/Sign Up are listed there alongside the core pages. The
   * duplicate block in this tab is gone; nothing was lost with it.
   *
   * The VALUE still has to be read, because `header` is a full replace
   * server-side (see below) — dropping it here would delete whatever the
   * admin set on the Pages list the next time they touched navigation.
   */
  const currentAuthPages = configuration.header.authPages;

  /**
   * Clearing the label is the one deliberate way to remove the header CTA
   * entirely. `header` is a full replace server-side, so every mutation
   * here must carry forward `authPages` explicitly — otherwise saving a
   * CTA change would silently wipe any Sign In/Sign Up copy an admin
   * already set, and vice versa.
   */
  const updateHeaderCtaLabel = (label: LocalizedText) => {
    save({
      header: label.en.trim()
        ? {
            cta: {
              label,
              pageId: currentCta?.pageId,
              url: currentCta?.url,
              authAction: currentCta?.authAction,
            },
            authPages: currentAuthPages,
          }
        : { authPages: currentAuthPages },
    });
  };

  /**
   * Changes the CTA's type/target while preserving whatever label already
   * exists — even an empty one. This used to reuse `updateHeaderCtaLabel`'s
   * "empty label clears everything" rule, so picking a Link Type or a
   * Sign In/Sign Up target before ever typing a label silently sent
   * `header: {}` and dropped the choice instead of saving it.
   *
   * The backend still requires a non-empty `label` for any CTA — a button
   * with no text isn't a valid button — so an admin who picks "Sign In /
   * Sign Up" before typing one would otherwise hit that rejection on the
   * very first try. Since "Sign In"/"Sign Up" is exactly the label such a
   * button needs anyway, default to it when the field is still blank
   * instead of surfacing an error for something we can fill in ourselves;
   * an existing label (auto-filled or typed) is never overwritten. Every
   * other failure — including a genuinely empty label on a page/external
   * link, which has no sensible default — now shows an error instead of
   * silently doing nothing.
   */
  const updateHeaderCtaTarget = (target: {
    pageId?: string;
    url?: string;
    authAction?: 'signIn' | 'signUp';
  }) => {
    if (target.url !== undefined && !isSafeExternalUrl(target.url)) {
      toast({ title: t('validation:invalidUrl'), variant: 'destructive' });
      return;
    }

    const label: LocalizedText = currentCta?.label?.en
      ? currentCta.label
      : {
          en:
            target.authAction === 'signUp'
              ? t('website:navigation.ctaTargetSignUp')
              : target.authAction === 'signIn'
                ? t('website:navigation.ctaTargetSignIn')
                : '',
          ar: currentCta?.label?.ar ?? '',
        };

    save({
      header: { cta: { label, ...target }, authPages: currentAuthPages },
    });
  };

  const updateFooterCopyright = (value: LocalizedText) => {
    save({ footer: { ...configuration.footer, copyrightText: value } });
  };

  const persistSocialLinks = (links: readonly WebsiteFooterLink[]) => {
    save({ footer: { ...configuration.footer, socialLinks: links } });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('website:navigation.primaryNavTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {navigablePages.map((page) => (
              <label key={page.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={navPageIds.has(page.id)}
                  onCheckedChange={(checked) =>
                    togglePageInNav(page, checked === true)
                  }
                />
                {page.title}
              </label>
            ))}
          </div>

          {sortedNav.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">
                {t('website:navigation.orderTitle')}
              </p>
              {sortedNav.map((item, index) => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <LocalizedTextField
                      id={`nav-item-${item.id}`}
                      labelKey="website:navigation.itemLabel"
                      value={item.label}
                      onBlur={(label) => renameItem(item.id, label)}
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 pt-8">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                      aria-label={t('website:navigation.moveUp')}
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={index === sortedNav.length - 1}
                      onClick={() => moveItem(index, 1)}
                      aria-label={t('website:navigation.moveDown')}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('website:navigation.headerCtaTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <LocalizedTextField
              id="header-cta-label"
              labelKey="website:navigation.ctaLabel"
              value={configuration.header.cta?.label ?? EMPTY_LOCALIZED}
              onBlur={updateHeaderCtaLabel}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('website:fields.linkType')}</Label>
            <Select
              value={
                configuration.header.cta?.url !== undefined
                  ? 'external'
                  : configuration.header.cta?.authAction
                    ? 'auth'
                    : 'page'
              }
              onValueChange={(type) =>
                updateHeaderCtaTarget(
                  type === 'external'
                    ? { url: '' }
                    : type === 'auth'
                      ? { authAction: 'signIn' }
                      : { pageId: undefined }
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page">
                  {t('website:fields.linkTypePage')}
                </SelectItem>
                <SelectItem value="external">
                  {t('website:fields.linkTypeExternal')}
                </SelectItem>
                {/* Phase 1 (Extended Scope, Decision 11, dependency C) */}
                <SelectItem value="auth">
                  {t('website:fields.linkTypeAuth')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {configuration.header.cta?.url !== undefined ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="header-cta-url">
                {t('website:navigation.ctaTarget')}
              </Label>
              <Input
                id="header-cta-url"
                dir="ltr"
                data-ltr-content
                placeholder="https://example.com"
                defaultValue={configuration.header.cta?.url ?? ''}
                onBlur={(event) =>
                  updateHeaderCtaTarget({ url: event.target.value })
                }
              />
            </div>
          ) : configuration.header.cta?.authAction ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('website:navigation.ctaTarget')}</Label>
              <Select
                value={configuration.header.cta.authAction}
                onValueChange={(authAction: 'signIn' | 'signUp') =>
                  updateHeaderCtaTarget({ authAction })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signIn">
                    {t('website:navigation.ctaTargetSignIn')}
                  </SelectItem>
                  <SelectItem value="signUp">
                    {t('website:navigation.ctaTargetSignUp')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('website:navigation.ctaTarget')}</Label>
              <Select
                value={configuration.header.cta?.pageId}
                onValueChange={(pageId) => updateHeaderCtaTarget({ pageId })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('website:navigation.ctaTargetPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {navigablePages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('website:navigation.footerTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LocalizedTextField
            id="footer-copyright"
            labelKey="website:navigation.copyrightText"
            value={configuration.footer.copyrightText ?? EMPTY_LOCALIZED}
            onBlur={updateFooterCopyright}
          />

          <SocialLinksEditor
            links={configuration.footer.socialLinks}
            onChange={persistSocialLinks}
          />
        </CardContent>
      </Card>

      {updateConfig.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('website:common.saving')}
        </p>
      ) : null}
    </div>
  );
}
