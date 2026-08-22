/**
 * Website SEO Tab (global). Page-level SEO is edited per-page in the Page
 * Editor.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useUpdateWebsiteConfiguration } from '../hooks';
import { WebsiteImageField } from './WebsiteImageField';
import { globalSeoSchema, type GlobalSeoFormData } from '../schemas/website.schemas';
import type { WebsiteConfiguration } from '@types';

export interface WebsiteSeoTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
}

export function WebsiteSeoTab({ academyId, configuration }: WebsiteSeoTabProps): JSX.Element {
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration();
  const [ogImage, setOgImage] = useState(configuration.seo.ogImage);

  const form = useForm<GlobalSeoFormData>({
    resolver: zodResolver(globalSeoSchema),
    values: {
      metaTitle: configuration.seo.metaTitle ?? '',
      metaDescription: configuration.seo.metaDescription ?? '',
    },
  });

  useServerValidation(form, updateConfig.error);

  const onSubmit = (data: GlobalSeoFormData) => {
    updateConfig.mutate(
      {
        academyId,
        payload: { seo: { ...data, ogImage } },
      },
      {
        onSuccess: () => toast({ title: t('website:seo.saved') }),
        onError: () => toast({ title: t('website:seo.saveError'), variant: 'destructive' }),
      }
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
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
            <WebsiteImageField
              id="website-og-image"
              labelKey="website:seo.ogImage"
              value={ogImage}
              onChange={setOgImage}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={updateConfig.isPending}>
                {updateConfig.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" strokeWidth={2} aria-hidden />
                )}
                {t('website:common.saveChanges')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
