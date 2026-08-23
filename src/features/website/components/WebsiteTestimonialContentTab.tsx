/**
 * Website Testimonial Content Tab.
 *
 * Same shape and lifecycle as `WebsiteFaqContentTab` — see its doc
 * comment for the shared reasoning (Prompt 10).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Loader2, Plus, Send, Archive } from 'lucide-react';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge, type StatusTone } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import { useConfirmDialog } from '@app/providers';
import { useDisclosure, usePermissions } from '@hooks';
import { useServerValidation } from '@forms';
import { WebsiteImageField } from './WebsiteImageField';
import {
  useArchiveWebsiteTestimonialEntry,
  useCreateWebsiteTestimonialEntry,
  usePublishWebsiteTestimonialEntry,
  useUpdateWebsiteTestimonialEntry,
  useWebsiteTestimonialEntries,
} from '../hooks';
import {
  testimonialEntrySchema,
  type TestimonialEntryFormData,
} from '../schemas/website-content.schemas';
import { CONTENT_LIST_PAGE_SIZE } from '../constants/website.constants';
import type { WebsiteContentStatus, WebsiteTestimonialEntry } from '@types';

const STATUS_TONE: Record<WebsiteContentStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
};

function TestimonialEntryDialog({
  academyId,
  entry,
  open,
  onOpenChange,
}: {
  readonly academyId: string;
  readonly entry?: WebsiteTestimonialEntry;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const createEntry = useCreateWebsiteTestimonialEntry();
  const updateEntry = useUpdateWebsiteTestimonialEntry();
  const isPending = createEntry.isPending || updateEntry.isPending;
  const [avatar, setAvatar] = useState(entry?.avatar);

  const form = useForm<TestimonialEntryFormData>({
    resolver: zodResolver(testimonialEntrySchema),
    values: {
      quote: entry?.quote ?? { en: '', ar: '' },
      authorName: entry?.authorName ?? '',
      authorRole: entry?.authorRole ?? { en: '', ar: '' },
    },
  });
  useServerValidation(form, createEntry.error ?? updateEntry.error);

  const onSubmit = (data: TestimonialEntryFormData) => {
    const payload = { ...data, avatar };
    const onSuccess = () => {
      onOpenChange(false);
      form.reset();
    };
    if (entry) {
      updateEntry.mutate({ academyId, entryId: entry.id, payload }, { onSuccess });
    } else {
      createEntry.mutate({ academyId, payload }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(entry ? 'website:content.testimonial.editTitle' : 'website:content.testimonial.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quote.en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.quoteEn')}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quote.ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.quoteAr')}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="authorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('website:fields.authorName')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="authorRole.en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.authorRoleEn')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="authorRole.ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.authorRoleAr')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <WebsiteImageField
              id="testimonial-avatar"
              labelKey="website:fields.avatar"
              value={avatar}
              onChange={setAvatar}
              academyId={academyId}
            />
            {(createEntry.error ?? updateEntry.error) ? (
              <ErrorState onRetry={form.handleSubmit(onSubmit)} />
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {t('website:common.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function WebsiteTestimonialContentTab({
  academyId,
}: {
  readonly academyId: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('academy.website.manage');
  const canPublish = hasPermission('academy.website.publish');
  const dialog = useDisclosure();
  const [editingEntry, setEditingEntry] = useState<WebsiteTestimonialEntry>();

  const { data, isLoading, error, refetch } = useWebsiteTestimonialEntries(academyId, {
    query: { pagination: { page: 1, pageSize: CONTENT_LIST_PAGE_SIZE } },
  });
  const updateEntry = useUpdateWebsiteTestimonialEntry();
  const publishEntry = usePublishWebsiteTestimonialEntry();
  const archiveEntry = useArchiveWebsiteTestimonialEntry();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) return <ErrorState onRetry={() => refetch()} />;

  const entries = [...data.items].sort((a, b) => a.order - b.order);
  const language = i18n.language as 'en' | 'ar';

  const openCreate = () => {
    setEditingEntry(undefined);
    dialog.open();
  };
  const openEdit = (entry: WebsiteTestimonialEntry) => {
    setEditingEntry(entry);
    dialog.open();
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= entries.length) return;
    const current = entries[index];
    const target = entries[targetIndex];
    updateEntry.mutate({ academyId, entryId: current.id, payload: { order: target.order } });
    updateEntry.mutate({ academyId, entryId: target.id, payload: { order: current.order } });
  };

  const toggleVisible = (entry: WebsiteTestimonialEntry) => {
    updateEntry.mutate({ academyId, entryId: entry.id, payload: { visible: !entry.visible } });
  };

  const handleArchive = async (entry: WebsiteTestimonialEntry) => {
    const confirmed = await confirm({
      titleKey: 'website:content.archiveConfirmTitle',
      descriptionKey: 'website:content.archiveConfirmDescription',
      confirmLabelKey: 'website:content.archiveAction',
      intent: 'destructive',
    });
    if (!confirmed) return;
    archiveEntry.mutate({ academyId, entryId: entry.id });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" aria-hidden />
            {t('website:content.testimonial.createAction')}
          </Button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <EmptyState titleKey="website:content.testimonial.empty" />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {entries.map((entry, index) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 p-4">
                <button
                  type="button"
                  className="flex-1 text-start disabled:cursor-default"
                  disabled={!canManage}
                  onClick={() => canManage && openEdit(entry)}
                >
                  <p className="line-clamp-1 font-medium text-foreground">{entry.authorName}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {entry.quote[language] || entry.quote.en}
                  </p>
                </button>
                <StatusBadge
                  labelKey={`website:content.status.${entry.status}`}
                  tone={STATUS_TONE[entry.status]}
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canManage || index === 0}
                    onClick={() => moveItem(index, -1)}
                    aria-label={t('website:editor.moveUp')}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canManage || index === entries.length - 1}
                    onClick={() => moveItem(index, 1)}
                    aria-label={t('website:editor.moveDown')}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                </div>
                <Switch
                  checked={entry.visible}
                  disabled={!canManage}
                  onCheckedChange={() => toggleVisible(entry)}
                  aria-label={t('website:pages.visibilityToggle')}
                />
                {canPublish && entry.status !== 'published' && entry.status !== 'archived' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => publishEntry.mutate({ academyId, entryId: entry.id })}
                  >
                    <Send className="size-3.5" aria-hidden />
                    {t('website:content.publishAction')}
                  </Button>
                ) : null}
                {canPublish && entry.status !== 'archived' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleArchive(entry)}
                    aria-label={t('website:content.archiveAction')}
                  >
                    <Archive className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage ? (
        <TestimonialEntryDialog
          academyId={academyId}
          entry={editingEntry}
          open={dialog.isOpen}
          onOpenChange={dialog.setOpen}
        />
      ) : null}
    </div>
  );
}
