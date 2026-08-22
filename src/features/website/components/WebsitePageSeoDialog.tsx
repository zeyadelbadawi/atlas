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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useServerValidation } from '@forms';
import { useUpdateWebsitePage } from '../hooks';
import { WebsiteImageField } from './WebsiteImageField';
import { pageSeoSchema, type PageSeoFormData } from '../schemas/website.schemas';
import { resolvePageSeo } from '../utils/seo-resolution.utils';
import type { WebsiteConfiguration, WebsitePage } from '@types';

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
      metaTitle: page.seo.metaTitle ?? '',
      metaDescription: page.seo.metaDescription ?? '',
      ogTitle: page.seo.ogTitle ?? '',
      ogDescription: page.seo.ogDescription ?? '',
      canonicalPath: page.seo.canonicalPath ?? '',
      indexable: page.seo.indexable ?? true,
    },
  });
  useServerValidation(form, updatePage.error);

  // What this page would resolve to right now if the fields below were
  // left blank — makes the Page Override → Website Global → Atlas System
  // Fallback hierarchy visible rather than only documented.
  const resolved = resolvePageSeo(
    { ...page, seo: {} },
    configuration,
    { title: academyName, description: academyName }
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
                  <FormLabel>{t('website:seo.metaTitle')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>{t('website:seo.metaDescription')}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
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
                  <FormLabel>{t('website:seo.ogTitle')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>{t('website:seo.ogDescription')}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
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
