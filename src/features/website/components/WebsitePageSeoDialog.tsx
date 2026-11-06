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
import type { Path } from 'react-hook-form';
import { useDirtyGuard } from '@features/unsaved-changes';
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
import { SaveFailedAlert, hasViolationOn, useServerValidation } from '@forms';
import { useUpdateWebsitePage } from '../hooks';
import { WebsiteImageField } from './WebsiteImageField';
import { LocalizedTextField } from './LocalizedTextField';
import { useLocalizedFormErrors } from './localized-form-errors';
import {
  MAX_OG_DESCRIPTION_LENGTH,
  MAX_OG_TITLE_LENGTH,
  MAX_SEO_DESCRIPTION_LENGTH,
  MAX_SEO_TITLE_LENGTH,
} from '../constants/website.constants';
import {
  pageSeoSchema,
  type PageSeoFormData,
} from '../schemas/website.schemas';
import { resolvePageSeo } from '../utils/seo-resolution.utils';
import { DEFAULT_PUBLIC_WEBSITE_LOCALE } from '../constants/locale.constants';
import type { LocalizedText, WebsiteConfiguration, WebsitePage } from '@types';
import { useBidiIsolation } from '@hooks';

const EMPTY_LOCALIZED: LocalizedText = { en: '', ar: '' };

const LOCALIZED_SEO_FIELDS = [
  'metaTitle',
  'metaDescription',
  'ogTitle',
  'ogDescription',
] as const;

/** Server paths (`seo.metaTitle.en` or `metaTitle.en`) onto this form's fields. */
const SEO_ALIASES: Record<string, keyof PageSeoFormData> = Object.fromEntries(
  [...LOCALIZED_SEO_FIELDS, 'canonicalPath', 'indexable'].flatMap((name) => [
    [`seo.${name}`, name],
    ...(['en', 'ar'] as const).map((lang) => [
      `seo.${name}.${lang}`,
      `${name}.${lang}`,
    ]),
  ])
) as Record<string, keyof PageSeoFormData>;

const SEO_FIELDS: Record<string, string> = Object.fromEntries(
  [
    ...Object.keys(SEO_ALIASES),
    ...Object.values(SEO_ALIASES),
    ...LOCALIZED_SEO_FIELDS,
  ].map((name) => [name, ''])
);

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
  const { isolate } = useBidiIsolation();
  const updatePage = useUpdateWebsitePage({ inlineErrors: true });
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

  // Unsaved-changes protection for a MODAL. The route blocker cannot see
  // this: closing a dialog is not a navigation, so the X button, an
  // outside click and Escape all need to be intercepted here instead.
  const dirtyGuard = useDirtyGuard(form.formState.isDirty);
  useServerValidation(
    form,
    updatePage.error,
    SEO_ALIASES as Record<string, Path<PageSeoFormData>>
  );
  const { errors } = form.formState;
  const localizedErrors = {
    metaTitle: useLocalizedFormErrors(
      errors,
      'metaTitle',
      'website:seo.metaTitle'
    ),
    metaDescription: useLocalizedFormErrors(
      errors,
      'metaDescription',
      'website:seo.metaDescription'
    ),
    ogTitle: useLocalizedFormErrors(errors, 'ogTitle', 'website:seo.ogTitle'),
    ogDescription: useLocalizedFormErrors(
      errors,
      'ogDescription',
      'website:seo.ogDescription'
    ),
  };
  // One message per failure: a violation shows on its field, anything else
  // is one inline alert with the real reason (no toast on top).
  const saveError =
    updatePage.error && !hasViolationOn(updatePage.error, SEO_FIELDS)
      ? updatePage.error
      : null;

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
      {
        academyId,
        pageId: page.id,
        payload: {
          seo: { ...data, ogImage },
          /*
            `seo` is replaced WHOLE, so without this a second admin saving
            a stale dialog silently discarded the first one's title and
            description — no error, nothing to show it happened. The
            version travels with the page this dialog was opened from, so
            a save that lost the race is refused with a conflict instead.
          */
          expectedVersion: page.version,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t('website:seo.saved') });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Opening is never guarded; only closing can lose work.
        if (next) return onOpenChange(true);
        void dirtyGuard.requestClose(() => {
          // A failed save's alert and field errors don't outlive the dialog.
          updatePage.reset();
          form.clearErrors();
          onOpenChange(false);
        });
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('website:editor.seoTitle')}</DialogTitle>
        </DialogHeader>
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {t('website:seo.resolvedFallbackHint', {
            title: isolate(resolved.title),
            description: isolate(resolved.description),
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
                      maxLength={MAX_SEO_TITLE_LENGTH}
                      errors={localizedErrors.metaTitle}
                    />
                  </FormControl>
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
                      maxLength={MAX_SEO_DESCRIPTION_LENGTH}
                      errors={localizedErrors.metaDescription}
                      multiline
                    />
                  </FormControl>
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
                      maxLength={MAX_OG_TITLE_LENGTH}
                      errors={localizedErrors.ogTitle}
                    />
                  </FormControl>
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
                      maxLength={MAX_OG_DESCRIPTION_LENGTH}
                      errors={localizedErrors.ogDescription}
                      multiline
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <WebsiteImageField
              id="page-og-image"
              labelKey="website:seo.ogImage"
              purpose="ogImage"
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
                    <Input
                      {...field}
                      dir="ltr"
                      data-ltr-content
                      placeholder={`/${page.slug}`}
                    />
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
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  {t('website:seo.indexable')}
                </label>
              )}
            />
            {saveError ? (
              <SaveFailedAlert
                error={saveError}
                titleKey="common:form.notSaved"
              />
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={updatePage.isPending}>
                {updatePage.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('website:common.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
