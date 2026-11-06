/**
 * Website Navigation Tab.
 *
 * Manages primary navigation (which pages appear, their order and label),
 * the header CTA, and footer copyright/social links. Reordering uses
 * explicit move-up/move-down controls — the same keyboard-accessible
 * pattern Course Builder's curriculum reordering already established
 * (Prompt 3C) — never drag-and-drop as the only way to reorder.
 *
 * CMS phase 4 — while the header/footer lock is on (`chromeLocked`),
 * everything here is read-only (the tab is one `<fieldset>`) under the
 * notice saying why (`ChromeLockControl`, also where owners and
 * administrators toggle it — in the fieldset's `<legend>`, which a
 * disabled fieldset leaves enabled), and a save the API refuses for the
 * lock says so.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@utils';
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
import { fieldErrorText, useFailureReason } from '@forms';
import { validationMessage } from '@/shared/forms/validation-message';
import { isApiError } from '@api';
import type { ApiError } from '@api';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import { LocalizedTextField } from './LocalizedTextField';
import type { LocalizedFieldErrors } from './LocalizedTextField';
import { MAX_CTA_LABEL_LENGTH } from '../constants/website.constants';
import {
  ChromeLockControl,
  chromeLockErrorMessage,
  isChromeLockedError,
  useCanToggleChromeLock,
} from './ChromeLockControl';
import { SocialLinksEditor } from './SocialLinksEditor';
import { useWebsiteContentLocale } from './website-content-locale';
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

/**
 * B2 (UX audit) — a menu label longer than this breaks the site header; the
 * header button shares the section buttons' limit. Shown as a counter, and
 * an over-long label is not sent.
 */
const MAX_MENU_LABEL_LENGTH = MAX_CTA_LABEL_LENGTH;

type Builder = (
  current: WebsiteConfiguration
) => UpdateWebsiteConfigurationPayload | null;

/** Which field a server violation names: a menu item (by position) or the header button. */
function violationTarget(
  field: string,
  navigation: readonly WebsiteNavigationItem[]
): { readonly key: string; readonly language: keyof LocalizedText } | null {
  const nav = /^(?:navigation\.)?(\d+)\.label\.(en|ar)$/.exec(field);
  if (nav) {
    const item = navigation[Number(nav[1])];
    return item ? { key: item.id, language: nav[2] as 'en' | 'ar' } : null;
  }
  const cta = /^(?:header\.)?cta\.label\.(en|ar)$/.exec(field);
  if (cta) return { key: CTA_KEY, language: cta[1] as 'en' | 'ar' };
  return null;
}

const CTA_KEY = '__header-cta__';

export interface WebsiteNavigationTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
  /** A narrow column (the visual editor's panel): fields stack, whatever the window's width. */
  readonly compact?: boolean;
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
  compact = false,
}: WebsiteNavigationTabProps): JSX.Element {
  // Two columns from `sm` on a page; one in a narrow panel.
  const wide = compact ? '' : 'sm:col-span-2';
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration({ inlineErrors: true });
  const queryClient = useQueryClient();
  const failureReason = useFailureReason();
  const { invalidate } = useInvalidate();
  // B0-WEB-02 — the site's main language is the one a label must have.
  const primaryLocale = useWebsiteContentLocale();
  const locked = configuration.chromeLocked === true;
  const showLock = useCanToggleChromeLock(academyId) || locked;

  /**
   * Field messages, by menu item id (or the header button): a label left
   * empty, too long, or refused by the server shows under ITS language.
   * B2 (UX audit): an empty label used to fail with only "Failed to save
   * navigation" and nothing marked.
   */
  const [labelErrors, setLabelErrors] = useState<
    Readonly<Record<string, LocalizedFieldErrors>>
  >({});
  const setLabelError = (key: string, errors: LocalizedFieldErrors | null) =>
    setLabelErrors((previous) => {
      const next = { ...previous };
      if (errors) next[key] = errors;
      else delete next[key];
      return next;
    });

  /**
   * Every change on this tab is a full replace of navigation, header or
   * footer. It carries the copy's `updatedAt`, so a save based on a copy a
   * colleague has since changed is refused rather than silently replacing
   * their work; the latest copy is then loaded and the change can be made
   * again on top of it.
   *
   * B2 (UX audit) — saves run ONE AT A TIME, each built from the latest
   * saved copy when its turn comes. Two quick edits (the copyright, then a
   * menu label) used to race: the second carried the first's stale
   * `updatedAt`, was refused as "changed by someone else" — by the same
   * person in the same tab — and the edit was lost.
   */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latestConfiguration = (): WebsiteConfiguration =>
    queryClient.getQueryData<WebsiteConfiguration>(
      websiteKeys.configuration(academyId)
    ) ?? configuration;

  const reportFailure = (error: ApiError, sent: WebsiteConfiguration) => {
    // Locked meanwhile (by an owner or administrator elsewhere): say so,
    // and load the saved state so the fields turn read-only.
    if (isChromeLockedError(error)) {
      toast({
        title: chromeLockErrorMessage(error, t) ?? '',
        variant: 'destructive',
      });
      void invalidate(websiteKeys.configuration(academyId));
      return;
    }
    if (error.kind === 'conflict') {
      toast({
        title: t('website:navigation.staleConflict'),
        variant: 'destructive',
      });
      void invalidate(websiteKeys.configuration(academyId));
      return;
    }
    // A refused label shows under its field; anything else is one toast
    // with the real reason (this tab saves as you go — there is no Save
    // button to put an inline message next to).
    const sortedSent = [...sent.navigation].sort((x, y) => x.order - y.order);
    const placed = (error.violations ?? []).flatMap((violation) => {
      const target = violationTarget(violation.field, sortedSent);
      if (!target) return [];
      const label =
        target.key === CTA_KEY
          ? t('website:navigation.ctaLabel')
          : t('website:navigation.itemLabel');
      setLabelError(target.key, {
        [target.language]: fieldErrorText(
          t,
          validationMessage(
            violation.messageKey.replace(/^errors\./, 'errors:'),
            {
              ...(violation.values ?? {}),
            }
          ),
          label
        ),
      });
      return [target];
    });
    if (placed.length > 0) return;
    toast({
      title: t('website:navigation.saveError'),
      description: failureReason(error),
      variant: 'destructive',
    });
  };

  const save = (build: Builder) => {
    // Locked: the fields are read-only, and the API would refuse it anyway.
    if (configuration.chromeLocked === true) return;
    queue.current = queue.current.then(async () => {
      const current = latestConfiguration();
      if (current.chromeLocked === true) return;
      const payload = build(current);
      if (!payload) return;
      try {
        await updateConfig.mutateAsync({
          academyId,
          payload: { ...payload, expectedUpdatedAt: current.updatedAt },
        });
      } catch (error) {
        if (isApiError(error)) reportFailure(error, current);
      }
    });
  };

  /** Empty in the site's main language, or too long: the field says so and nothing is sent. */
  const checkLabel = (
    key: string,
    label: LocalizedText,
    labelKey: string,
    { allowEmpty = false }: { readonly allowEmpty?: boolean } = {}
  ): boolean => {
    const errors: Partial<Record<keyof LocalizedText, string>> = {};
    if (!allowEmpty && !label[primaryLocale].trim()) {
      errors[primaryLocale] = fieldErrorText(
        t,
        'validation:required',
        t(labelKey)
      );
    }
    const tooLong = (['en', 'ar'] as const).some(
      (language) => label[language].length > MAX_MENU_LABEL_LENGTH
    );
    if (Object.keys(errors).length > 0 || tooLong) {
      // An over-long language is already marked by the field's counter.
      setLabelError(key, errors);
      return false;
    }
    setLabelError(key, null);
    return true;
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

  const persistNavigation = (
    change: (
      sorted: readonly WebsiteNavigationItem[]
    ) => readonly WebsiteNavigationItem[]
  ) => {
    save((current) => ({
      navigation: change(
        [...current.navigation].sort((a, b) => a.order - b.order)
      ).map((item, index) => ({
        ...item,
        order: index,
      })),
    }));
  };

  const togglePageInNav = (page: WebsitePage, inNav: boolean) => {
    if (inNav) {
      persistNavigation((navigation) => [
        ...navigation,
        {
          id: crypto.randomUUID(),
          // `page.title` (a plain, admin-internal label — see
          // `WebsitePage.title`'s own doc comment) seeds English only; an
          // Owner fills in Arabic afterward via the reorder list below,
          // same "start from something real, never a blank field" default
          // this tab already used before Phase 6.
          label: { en: page.title, ar: '' },
          pageId: page.id,
          order: navigation.length,
        },
      ]);
    } else {
      persistNavigation((navigation) =>
        navigation.filter((item) => item.pageId !== page.id)
      );
    }
  };

  const renameItem = (id: string, label: LocalizedText) => {
    if (!checkLabel(id, label, 'website:navigation.itemLabel')) return;
    persistNavigation((navigation) =>
      navigation.map((item) => (item.id === id ? { ...item, label } : item))
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const id = sortedNav[index]?.id;
    persistNavigation((navigation) => {
      const from = navigation.findIndex((item) => item.id === id);
      return from < 0 ? navigation : reorder(navigation, from, direction);
    });
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
    // Clearing the label removes the button (see above), so empty is fine.
    if (
      !checkLabel(CTA_KEY, label, 'website:navigation.ctaLabel', {
        allowEmpty: true,
      })
    ) {
      return;
    }
    save(() => ({
      header: label[primaryLocale].trim()
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
    }));
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

    save(() => ({
      header: { cta: { label, ...target }, authPages: currentAuthPages },
    }));
  };

  const updateFooterCopyright = (value: LocalizedText) => {
    save((current) => ({
      footer: { ...current.footer, copyrightText: value },
    }));
  };

  const persistSocialLinks = (links: readonly WebsiteFooterLink[]) => {
    save((current) => ({
      footer: { ...current.footer, socialLinks: links },
    }));
  };

  return (
    <fieldset
      disabled={locked}
      className="min-w-0 space-y-6"
      data-testid="chrome-fields"
    >
      {showLock ? (
        <legend className="w-full">
          <ChromeLockControl
            academyId={academyId}
            configuration={configuration}
          />
        </legend>
      ) : null}
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
                      maxLength={MAX_MENU_LABEL_LENGTH}
                      errors={labelErrors[item.id]}
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
        <CardContent
          className={compact ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}
        >
          <div className={wide}>
            <LocalizedTextField
              id="header-cta-label"
              labelKey="website:navigation.ctaLabel"
              value={configuration.header.cta?.label ?? EMPTY_LOCALIZED}
              onBlur={updateHeaderCtaLabel}
              maxLength={MAX_MENU_LABEL_LENGTH}
              errors={labelErrors[CTA_KEY]}
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
            <div className={cn('space-y-1.5', wide)}>
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
            <div className={cn('space-y-1.5', wide)}>
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
            <div className={cn('space-y-1.5', wide)}>
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
            compact={compact}
          />
        </CardContent>
      </Card>

      {updateConfig.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('website:common.saving')}
        </p>
      ) : null}
    </fieldset>
  );
}
