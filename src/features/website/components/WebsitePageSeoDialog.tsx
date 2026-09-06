/**
 * Website Page SEO Dialog (Prompt 10).
 *
 * Closes a real gap: `WebsitePageSeo` (Prompt 9) was a typed contract
 * with no editing surface anywhere in the app. Independently editable
 * from the website's global SEO defaults (`WebsiteSeoTab`) — see
 * `resolvePageSeo`'s resolution hierarchy.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useServerValidation } from '@forms';
import { useUpdateWebsitePage } from '../hooks';
import { WebsiteImageField } from './WebsiteImageField';
import { LocalizedTextField } from './LocalizedTextField';
import { pageSeoSchema, type PageSeoFormData } from '../schemas/website.schemas';
import { resolvePageSeo } from '../utils/seo-resolution.utils';
import { DEFAULT_PUBLIC_WEBSITE_LOCALE } from '../constants/locale.constants';
import type { LocalizedText, WebsiteConfiguration, WebsitePage } from '@types';

const EMPTY_LOCALIZED: LocalizedText = { en: '', ar: '' };

export interface WebsitePageSeoDialogProps {
  readonly academyId: string;
  readonly academyName: string;
  readonly configuration: WebsiteConfiguration;
  readonly page: WebsitePage;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function WebsitePageSeoDialog({
  academyId,
  academyName,
  configuration,
  page,
  open,
  onOpenChange,
}: WebsitePageSeoDialogProps): JSX.Element {
  const { t } = useTranslation();
  const updatePage = useUpdateWebsitePage();
  const [ogImage, setOgImage] = useState(page.seo.ogImage);

  const form = useForm<PageSeoFormData>({
    resolver: zodResolver(pageSeoSchema),
    values: {
      metaTitle: page.seo.metaTitle ?? EMPTY_LOCALIZED,
      metaDescription: page.seo.metaDescription ?? EMPTY_LOCALIZED,
      ogTitle: page.seo.ogTitle ?? EMPTY_LOCALIZED,
      ogDescription: page.seo.ogDescription ?? EMPTY_LOCALIZED,
      canonicalPath: page.seo.canonicalPath ?? '',
      indexable: page.seo.indexable ?? true,
    },
  });
  useServerValidation(form, updatePage.error);

  // What this page would resolve to right now if the fields below were
  // left blank — makes the Page Override → Website Global → Atlas System
  // Fallback hierarchy visible rather than only documented. English is
  // shown here as the reference language; Arabic follows the exact same
  // resolution hierarchy at render time.
  const resolved = resolvePageSeo(
    { ...page, seo: {} },
    configuration,
    { title: academyName, description: academyName },
    DEFAULT_PUBLIC_WEBSITE_LOCALE
  );

  const onSubmit = (data: PageSeoFormData) => {
    updatePage.mutate(
      { academyId, pageId: page.id, payload: { seo: { ...data, ogImage } } },
      {
        onSuccess: () => {
          toast({ title: t('website:seo.saved') });
          onOpenChange(false);
        },
        onError: () => toast({ title: t('website:seo.saveError'), variant: 'destructive' }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('website:editor.seoTitle')}</DialogTitle>
        </DialogHeader>
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {t('website:seo.resolvedFallbackHint', {
            title: resolved.title,
            description: resolved.description,
          })}
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LocalizedTextField
                      id="page-seo-meta-title"
                      labelKey="website:seo.metaTitle"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LocalizedTextField
                      id="page-seo-meta-description"
                      labelKey="website:seo.metaDescription"
                      value={field.value}
                      onChange={field.onChange}
                      multiline
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ogTitle"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LocalizedTextField
                      id="page-seo-og-title"
                      labelKey="website:seo.ogTitle"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ogDescription"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LocalizedTextField
                      id="page-seo-og-description"
                      labelKey="website:seo.ogDescription"
                      value={field.value}
                      onChange={field.onChange}
                      multiline
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <WebsiteImageField
              id="page-og-image"
              labelKey="website:seo.ogImage"
              value={ogImage}
              onChange={setOgImage}
              academyId={academyId}
            />
            <FormField
              control={form.control}
              name="canonicalPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('website:seo.canonicalPath')}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" placeholder={`/${page.slug}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="indexable"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  {t('website:seo.indexable')}
                </label>
              )}
            />
            {updatePage.error ? (
              <p className="text-sm text-destructive">{t('website:seo.saveError')}</p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={updatePage.isPending}>
                {updatePage.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {t('website:common.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
