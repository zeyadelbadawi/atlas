/**
 * Website FAQ Content Tab.
 *
 * Manages the Academy's reusable FAQ library (Prompt 10,
 * `WebsiteFaqEntry`) — independent from any one page's inline FAQ
 * section items (Prompt 9, unchanged). An entry referenced by
 * `libraryEntryIds` (see `SectionConfigForm`) only ever renders once
 * `status === 'published'` here.
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
import {
  useArchiveWebsiteFaqEntry,
  useCreateWebsiteFaqEntry,
  usePublishWebsiteFaqEntry,
  useUpdateWebsiteFaqEntry,
  useWebsiteFaqEntries,
} from '../hooks';
import { faqEntrySchema, type FaqEntryFormData } from '../schemas/website-content.schemas';
import { CONTENT_LIST_PAGE_SIZE } from '../constants/website.constants';
import type { WebsiteContentStatus, WebsiteFaqEntry } from '@types';

const STATUS_TONE: Record<WebsiteContentStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
};

function FaqEntryDialog({
  academyId,
  entry,
  open,
  onOpenChange,
}: {
  readonly academyId: string;
  readonly entry?: WebsiteFaqEntry;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const createEntry = useCreateWebsiteFaqEntry();
  const updateEntry = useUpdateWebsiteFaqEntry();
  const isPending = createEntry.isPending || updateEntry.isPending;

  const form = useForm<FaqEntryFormData>({
    resolver: zodResolver(faqEntrySchema),
    values: {
      question: entry?.question ?? { en: '', ar: '' },
      answer: entry?.answer ?? { en: '', ar: '' },
    },
  });
  useServerValidation(form, createEntry.error ?? updateEntry.error);

  const onSubmit = (data: FaqEntryFormData) => {
    const onSuccess = () => {
      onOpenChange(false);
      form.reset();
    };
    if (entry) {
      updateEntry.mutate({ academyId, entryId: entry.id, payload: data }, { onSuccess });
    } else {
      createEntry.mutate({ academyId, payload: data }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(entry ? 'website:content.faq.editTitle' : 'website:content.faq.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="question.en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.questionEn')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="question.ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.questionAr')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="answer.en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.answerEn')}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="answer.ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:content.answerAr')}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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

export function WebsiteFaqContentTab({ academyId }: { readonly academyId: string }): JSX.Element {
  const { t, i18n } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('academy.website.manage');
  const canPublish = hasPermission('academy.website.publish');
  const dialog = useDisclosure();
  const [editingEntry, setEditingEntry] = useState<WebsiteFaqEntry>();

  const { data, isLoading, error, refetch } = useWebsiteFaqEntries(academyId, {
    query: { pagination: { page: 1, pageSize: CONTENT_LIST_PAGE_SIZE } },
  });
  const updateEntry = useUpdateWebsiteFaqEntry();
  const publishEntry = usePublishWebsiteFaqEntry();
  const archiveEntry = useArchiveWebsiteFaqEntry();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) return <ErrorState onRetry={() => refetch()} />;

  const entries = [...data.items].sort((a, b) => a.order - b.order);
  const language = i18n.language as 'en' | 'ar';

  const openCreate = () => {
    setEditingEntry(undefined);
    dialog.open();
  };
  const openEdit = (entry: WebsiteFaqEntry) => {
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

  const toggleVisible = (entry: WebsiteFaqEntry) => {
    updateEntry.mutate({ academyId, entryId: entry.id, payload: { visible: !entry.visible } });
  };

  const handleArchive = async (entry: WebsiteFaqEntry) => {
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
            {t('website:content.faq.createAction')}
          </Button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <EmptyState titleKey="website:content.faq.empty" />
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
                  <p className="line-clamp-1 font-medium text-foreground">
                    {entry.question[language] || entry.question.en}
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
        <FaqEntryDialog
          academyId={academyId}
          entry={editingEntry}
          open={dialog.isOpen}
          onOpenChange={dialog.setOpen}
        />
      ) : null}
    </div>
  );
}
