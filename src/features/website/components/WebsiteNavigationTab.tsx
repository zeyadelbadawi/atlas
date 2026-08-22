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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUpdateWebsiteConfiguration } from '../hooks';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import type {
  WebsiteConfiguration,
  WebsiteFooterLink,
  WebsiteNavigationItem,
  WebsitePage,
} from '@types';

export interface WebsiteNavigationTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
}

function reorder<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
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

  const navPageIds = new Set(configuration.navigation.map((item) => item.pageId));
  const sortedNav = [...configuration.navigation].sort((a, b) => a.order - b.order);
  const navigablePages = pages.filter((page) => page.coreType !== 'courseDetails');

  const persistNavigation = (navigation: readonly WebsiteNavigationItem[]) => {
    updateConfig.mutate(
      {
        academyId,
        payload: {
          navigation: navigation.map((item, index) => ({ ...item, order: index })),
        },
      },
      { onError: () => toast({ title: t('website:navigation.saveError'), variant: 'destructive' }) }
    );
  };

  const togglePageInNav = (page: WebsitePage, inNav: boolean) => {
    if (inNav) {
      persistNavigation([
        ...configuration.navigation,
        { id: crypto.randomUUID(), label: page.title, pageId: page.id, order: configuration.navigation.length },
      ]);
    } else {
      persistNavigation(configuration.navigation.filter((item) => item.pageId !== page.id));
    }
  };

  const renameItem = (id: string, label: string) => {
    persistNavigation(
      configuration.navigation.map((item) => (item.id === id ? { ...item, label } : item))
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    persistNavigation(reorder(sortedNav, index, direction));
  };

  const updateHeaderCta = (
    ctaLabel: string,
    target: { pageId?: string; url?: string }
  ) => {
    if (target.url !== undefined && !isSafeExternalUrl(target.url)) {
      toast({ title: t('validation:invalidUrl'), variant: 'destructive' });
      return;
    }
    updateConfig.mutate({
      academyId,
      payload: { header: ctaLabel ? { cta: { label: ctaLabel, ...target } } : {} },
    });
  };

  const updateFooterField = (field: 'copyrightText', value: string) => {
    updateConfig.mutate({
      academyId,
      payload: { footer: { ...configuration.footer, [field]: value } },
    });
  };

  const addSocialLink = () => {
    const links: WebsiteFooterLink[] = [
      ...configuration.footer.socialLinks,
      { id: crypto.randomUUID(), label: '', url: '' },
    ];
    updateConfig.mutate({ academyId, payload: { footer: { ...configuration.footer, socialLinks: links } } });
  };

  const updateSocialLink = (id: string, patch: Partial<WebsiteFooterLink>) => {
    if (patch.url !== undefined && !isSafeExternalUrl(patch.url)) {
      toast({ title: t('validation:invalidUrl'), variant: 'destructive' });
      return;
    }
    const links = configuration.footer.socialLinks.map((link) =>
      link.id === id ? { ...link, ...patch } : link
    );
    updateConfig.mutate({ academyId, payload: { footer: { ...configuration.footer, socialLinks: links } } });
  };

  const removeSocialLink = (id: string) => {
    const links = configuration.footer.socialLinks.filter((link) => link.id !== id);
    updateConfig.mutate({ academyId, payload: { footer: { ...configuration.footer, socialLinks: links } } });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:navigation.primaryNavTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {navigablePages.map((page) => (
              <label key={page.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={navPageIds.has(page.id)}
                  onCheckedChange={(checked) => togglePageInNav(page, checked === true)}
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
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    value={item.label}
                    onChange={(event) => renameItem(item.id, event.target.value)}
                    className="flex-1"
                  />
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
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:navigation.headerCtaTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="header-cta-label">{t('website:navigation.ctaLabel')}</Label>
            <Input
              id="header-cta-label"
              defaultValue={configuration.header.cta?.label ?? ''}
              onBlur={(event) =>
                updateHeaderCta(event.target.value, {
                  pageId: configuration.header.cta?.pageId,
                  url: configuration.header.cta?.url,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('website:fields.linkType')}</Label>
            <Select
              value={configuration.header.cta?.url ? 'external' : 'page'}
              onValueChange={(type) =>
                updateHeaderCta(
                  configuration.header.cta?.label ?? '',
                  type === 'external' ? { url: '' } : { pageId: undefined }
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page">{t('website:fields.linkTypePage')}</SelectItem>
                <SelectItem value="external">{t('website:fields.linkTypeExternal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {configuration.header.cta?.url !== undefined ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="header-cta-url">{t('website:navigation.ctaTarget')}</Label>
              <Input
                id="header-cta-url"
                dir="ltr"
                placeholder="https://example.com"
                defaultValue={configuration.header.cta?.url ?? ''}
                onBlur={(event) =>
                  updateHeaderCta(configuration.header.cta?.label ?? '', { url: event.target.value })
                }
              />
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('website:navigation.ctaTarget')}</Label>
              <Select
                value={configuration.header.cta?.pageId}
                onValueChange={(pageId) =>
                  updateHeaderCta(configuration.header.cta?.label ?? '', { pageId })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('website:navigation.ctaTargetPlaceholder')} />
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
          <CardTitle className="text-base">{t('website:navigation.footerTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="footer-copyright">{t('website:navigation.copyrightText')}</Label>
            <Input
              id="footer-copyright"
              defaultValue={configuration.footer.copyrightText ?? ''}
              onBlur={(event) => updateFooterField('copyrightText', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('website:navigation.socialLinks')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
                <Plus className="size-3.5" aria-hidden />
                {t('website:navigation.addSocialLink')}
              </Button>
            </div>
            {configuration.footer.socialLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-2">
                <Input
                  placeholder={t('website:navigation.socialLabelPlaceholder')}
                  defaultValue={link.label}
                  onBlur={(event) => updateSocialLink(link.id, { label: event.target.value })}
                  className="w-32"
                />
                <Input
                  placeholder="https://"
                  defaultValue={link.url ?? ''}
                  onBlur={(event) => updateSocialLink(link.id, { url: event.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSocialLink(link.id)}
                  aria-label={t('website:navigation.removeSocialLink')}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
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
