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
  DialogDescription,
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
import { useDisclosure, usePermissions, useUnsavedChanges } from '@hooks';
import {
  RequiredMark,
  SaveFailedAlert,
  hasViolationOn,
  useFocusFirstViolation,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import { useDirtyGuard } from '@features/unsaved-changes';
import { useEditWebsiteFaqEntry } from '../hooks/useEditWebsiteFaqEntry';
import { useViolationLimits } from './server-violations';
import {
  useArchiveWebsiteFaqEntry,
  useCreateWebsiteFaqEntry,
  usePublishWebsiteFaqEntry,
  useSwapWebsiteFaqEntryOrder,
  useUpdateWebsiteFaqEntry,
  useWebsiteFaqEntries,
} from '../hooks';
import {
  faqEntrySchema,
  type FaqEntryFormData,
} from '../schemas/website-content.schemas';
import {
  CONTENT_LIST_PAGE_SIZE,
  MAX_FAQ_ANSWER_LENGTH,
  MAX_FAQ_QUESTION_LENGTH,
} from '../constants/website.constants';
import type { WebsiteContentStatus, WebsiteFaqEntry } from '@types';

const STATUS_TONE: Record<WebsiteContentStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
};

/**
 * The fields a server refusal names (`question.en`…), their labels and
 * limits (B2, V10): the API sends `validation:maxLength` without the
 * number, so the form supplies it.
 */
const FAQ_FIELD_LABELS = {
  'question.en': 'website:content.questionEn',
  'question.ar': 'website:content.questionAr',
  'answer.en': 'website:content.answerEn',
  'answer.ar': 'website:content.answerAr',
} as const;
const FAQ_FIELD_LIMITS = {
  'question.en': MAX_FAQ_QUESTION_LENGTH,
  'question.ar': MAX_FAQ_QUESTION_LENGTH,
  'answer.en': MAX_FAQ_ANSWER_LENGTH,
  'answer.ar': MAX_FAQ_ANSWER_LENGTH,
} as const;

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
  // B2 (V09) — the dialog's own save shows its failures here, not as a
  // toast under the overlay.
  const updateEntry = useEditWebsiteFaqEntry();
  const isPending = createEntry.isPending || updateEntry.isPending;

  const form = useForm<FaqEntryFormData>({
    resolver: zodResolver(faqEntrySchema),
    values: {
      question: entry?.question ?? { en: '', ar: '' },
      answer: entry?.answer ?? { en: '', ar: '' },
    },
  });

  // Warns before this editor is left with unsaved work — both on
  // in-app navigation (via the shared registry the route blocker
  // reads) and on tab close or refresh.
  // Only an OPEN dialog holds work. The dialog stays mounted after it
  // closes, and its form used to keep reporting dirty — so the next
  // navigation asked about edits that were already dismissed.
  useUnsavedChanges({ isDirty: open && form.formState.isDirty });
  // B2 (V11) — closing the dialog (Escape, ×, outside) with typed edits
  // asks first, as the page SEO dialog does.
  const dirtyGuard = useDirtyGuard(open && form.formState.isDirty);
  // B2 (V09/V10) — a refused field lands on that field, with its label and
  // its limit; any other failure is one alert with the real reason.
  const saveError = createEntry.error ?? updateEntry.error;
  const violations = useLabelledViolations(
    useViolationLimits(saveError, FAQ_FIELD_LIMITS),
    FAQ_FIELD_LABELS
  );
  useServerValidation(form, violations);
  useFocusFirstViolation(form, violations, FAQ_FIELD_LABELS);
  const saveFailure =
    saveError && !hasViolationOn(saveError, FAQ_FIELD_LABELS)
      ? saveError
      : null;

  const onSubmit = (data: FaqEntryFormData) => {
    const onSuccess = () => {
      onOpenChange(false);
      form.reset();
    };
    if (entry) {
      updateEntry.mutate(
        { academyId, entryId: entry.id, payload: data },
        { onSuccess }
      );
    } else {
      createEntry.mutate({ academyId, payload: data }, { onSuccess });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return onOpenChange(true);
        // Closing discards the dialog's edits — after asking, when there
        // are any.
        void dirtyGuard.requestClose(() => {
          form.reset();
          createEntry.reset();
          updateEntry.reset();
          onOpenChange(false);
        });
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              entry
                ? 'website:content.faq.editTitle'
                : 'website:content.faq.createTitle'
            )}
          </DialogTitle>
          {/* V19 — the library keeps every entry in both languages (an
              entry in one language would vanish for visitors in the
              other), so both are marked required and the reason is said. */}
          <DialogDescription>
            {t('website:content.faq.bothLanguagesHint')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="question.en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('website:content.questionEn')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" lang="en" />
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
                    <FormLabel>
                      {t('website:content.questionAr')}
                      <RequiredMark />
                    </FormLabel>
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
                    <FormLabel>
                      {t('website:content.answerEn')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} dir="ltr" lang="en" />
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
                    <FormLabel>
                      {t('website:content.answerAr')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {saveFailure ? (
              <SaveFailedAlert
                error={saveFailure}
                titleKey={
                  entry
                    ? 'website:content.faq.saveFailedTitle'
                    : 'website:content.faq.createFailedTitle'
                }
                onRetry={
                  saveFailure.kind === 'validation'
                    ? undefined
                    : form.handleSubmit(onSubmit)
                }
              />
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
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

export function WebsiteFaqContentTab({
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
  const [editingEntry, setEditingEntry] = useState<WebsiteFaqEntry>();

  const { data, isLoading, error, refetch } = useWebsiteFaqEntries(academyId, {
    query: { pagination: { page: 1, pageSize: CONTENT_LIST_PAGE_SIZE } },
  });
  const updateEntry = useUpdateWebsiteFaqEntry();
  const publishEntry = usePublishWebsiteFaqEntry();
  const archiveEntry = useArchiveWebsiteFaqEntry();
  const swapOrder = useSwapWebsiteFaqEntryOrder();

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

  // One move = two sequential order writes in ONE mutation (see
  // `useSwapWebsiteFaqEntryOrder`); every move control is disabled until
  // it settles, so a second click can never race the first.
  const isReordering = swapOrder.isPending;
  const movingEntryId = isReordering
    ? swapOrder.variables?.entry.id
    : undefined;
  const movingTargetId = isReordering
    ? swapOrder.variables?.target.id
    : undefined;

  const moveItem = (index: number, direction: -1 | 1) => {
    if (isReordering) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= entries.length) return;
    const current = entries[index];
    const target = entries[targetIndex];
    swapOrder.mutate({
      academyId,
      entry: { id: current.id, order: current.order },
      target: { id: target.id, order: target.order },
    });
  };

  const toggleVisible = (entry: WebsiteFaqEntry) => {
    updateEntry.mutate({
      academyId,
      entryId: entry.id,
      payload: { visible: !entry.visible },
    });
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

      <span className="sr-only" role="status" aria-live="polite">
        {isReordering ? t('website:content.reordering') : ''}
      </span>

      {entries.length === 0 ? (
        <EmptyState titleKey="website:content.faq.empty" />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-4"
                aria-busy={movingEntryId === entry.id || undefined}
              >
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
                    disabled={!canManage || index === 0 || isReordering}
                    onClick={() => moveItem(index, -1)}
                    aria-label={t('website:editor.moveUp')}
                  >
                    {movingEntryId === entry.id &&
                    movingTargetId === entries[index - 1]?.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ArrowUp className="size-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={
                      !canManage || index === entries.length - 1 || isReordering
                    }
                    onClick={() => moveItem(index, 1)}
                    aria-label={t('website:editor.moveDown')}
                  >
                    {movingEntryId === entry.id &&
                    movingTargetId === entries[index + 1]?.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ArrowDown className="size-4" aria-hidden />
                    )}
                  </Button>
                </div>
                <Switch
                  checked={entry.visible}
                  disabled={!canManage}
                  onCheckedChange={() => toggleVisible(entry)}
                  aria-label={t('website:pages.visibilityToggle')}
                />
                {canPublish &&
                entry.status !== 'published' &&
                entry.status !== 'archived' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      publishEntry.mutate({ academyId, entryId: entry.id })
                    }
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
