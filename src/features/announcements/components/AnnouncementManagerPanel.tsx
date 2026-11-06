/**
 * The announcement authoring surface — list, create/edit dialog, publish
 * and archive — shared by both scopes that have one.
 *
 * WHY THIS IS ONE COMPONENT. Course announcements and academy-wide
 * announcements are genuinely different things: different endpoints,
 * different authorisation, and a course announcement must never be
 * reachable from an academy id or the reverse. What is NOT different is the
 * editor — same fields, same validation, same scheduling, same publish and
 * archive confirmations. Writing that twice would mean every future fix to
 * the form (a validation rule, an unsaved-changes guard, a loading state)
 * had to be remembered in two files, and the second one is exactly where it
 * would be forgotten.
 *
 * So the SCOPE is injected: the caller supplies the already-bound mutation
 * functions for whichever tree it owns, and this component never sees an
 * academy id or a course id at all. It cannot send a write to the wrong
 * tree, because it has no way to name a tree.
 *
 * `canManage` only decides whether the controls are rendered. The backend
 * checks the caller's real membership row on every one of these routes and
 * is the only thing actually deciding — a hidden button is a courtesy, not
 * a permission.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useDateFormatter, useUnsavedChanges } from '@hooks';
import { useDirtyGuard } from '@features/unsaved-changes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  SaveFailedAlert,
  hasViolationOn,
  isFieldViolationError,
  useFocusFirstViolation,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import { useConfirmDialog, useToast } from '@app/providers';
import { normalizeUnknownError } from '@api';
import { useActionFailureToast } from '../hooks/useActionFailureToast';
import {
  announcementSchemaFor,
  type AnnouncementFormData,
} from '../schemas/announcement.schemas';
import type { ApiError } from '@api';
import type {
  Announcement,
  AnnouncementStatus,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from '@types';

/**
 * A stored UTC instant as the local wall-clock value a `datetime-local`
 * input shows (`YYYY-MM-DDTHH:mm`). `iso.slice(0, 16)` would show the UTC
 * digits as local time, so every save of an edited announcement would move
 * its schedule by the viewer's UTC offset. Same conversion as
 * `AssignmentFormDialog`'s `toDateTimeLocalValue`.
 */
function toDateTimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  const localOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

function getStatusTone(status: AnnouncementStatus) {
  switch (status) {
    case 'published':
      return 'success' as const;
    case 'scheduled':
      return 'info' as const;
    case 'archived':
      return 'destructive' as const;
    case 'draft':
    default:
      return 'neutral' as const;
  }
}

/** API field → label key: server violations land on these fields. */
const ANNOUNCEMENT_FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'announcements:manage.titleLabel',
  body: 'announcements:manage.bodyLabel',
  scheduledAt: 'announcements:manage.scheduledAtLabel',
};

export interface AnnouncementManagerPanelProps {
  readonly announcements: readonly Announcement[];
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  /** False hides every authoring control. Never the security boundary — see this file's own doc comment. */
  readonly canManage: boolean;
  readonly emptyTitleKey: string;
  readonly emptyDescriptionKey: string;
  readonly onCreate: (payload: CreateAnnouncementPayload) => Promise<unknown>;
  readonly onUpdate: (
    announcementId: string,
    payload: UpdateAnnouncementPayload
  ) => Promise<unknown>;
  readonly onPublish: (announcementId: string) => Promise<unknown>;
  readonly onArchive: (announcementId: string) => Promise<unknown>;
  readonly isSaving: boolean;
  /** Typed, not `unknown`: `useServerValidation` maps real field violations from it onto the form. */
  readonly saveError: ApiError | null;
  /**
   * The CREATE dialog is controlled by the page, because its trigger lives
   * in the page header's action slot (where every other Atlas page puts its
   * primary action) and therefore outside this component. EDIT state stays
   * internal — its triggers are the per-row buttons this component renders
   * itself, so nothing outside needs to know about it.
   */
  readonly isCreateOpen: boolean;
  readonly onCreateOpenChange: (open: boolean) => void;
}

export function AnnouncementManagerPanel({
  announcements,
  isLoading,
  error,
  onRetry,
  canManage,
  emptyTitleKey,
  emptyDescriptionKey,
  onCreate,
  onUpdate,
  onPublish,
  onArchive,
  isSaving,
  saveError,
  isCreateOpen,
  onCreateOpenChange,
}: AnnouncementManagerPanelProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { confirm } = useConfirmDialog();
  const { notifySuccess } = useToast();
  const actionFailed = useActionFailureToast();

  const [editing, setEditing] = useState<Announcement | null>(null);
  // B4 (UX audit) — a failed save no field can show: one alert in the dialog.
  const [saveFailure, setSaveFailure] = useState<ApiError | null>(null);
  const dialogOpen = isCreateOpen || editing !== null;

  const closeDialog = () => {
    // One close path for both modes, so the form never reopens still
    // holding the previous announcement's values.
    setEditing(null);
    onCreateOpenChange(false);
    // The form stays mounted while the dialog is closed; resetting it here
    // keeps a closed dialog from blocking the next navigation.
    form.reset({ title: '', body: '', scheduledAt: '' });
    setSaveFailure(null);
  };

  // The stored time of the announcement being edited: keeping it is not a
  // new schedule, so it is not refused for being past.
  const storedSchedule = useRef('');
  const form = useForm<AnnouncementFormData>({
    resolver: (values, context, options) =>
      zodResolver(announcementSchemaFor(storedSchedule.current))(
        values,
        context,
        options
      ),
    defaultValues: { title: '', body: '', scheduledAt: '' },
  });

  // Warns before this editor is left with unsaved work — both on in-app
  // navigation and on tab close or refresh.
  // Only an OPEN dialog holds work: the form stays mounted after closing,
  // and counting it then made the next sidebar click ask about nothing.
  useUnsavedChanges({ isDirty: dialogOpen && form.formState.isDirty });

  // V15 — Escape, an outside click or Cancel with typed work asks first.
  const dirtyGuard = useDirtyGuard(dialogOpen && form.formState.isDirty);
  const setDialogOpen = (open: boolean) => {
    if (open) return;
    void dirtyGuard.requestClose(closeDialog);
  };

  // V05 — `scheduledAt` refused by the server (in the past) lands on the
  // schedule field under its own label, as title/body violations do.
  const labelledError = useLabelledViolations(
    saveError,
    ANNOUNCEMENT_FIELD_LABELS
  );
  useServerValidation(form, labelledError);
  useFocusFirstViolation(form, labelledError, ANNOUNCEMENT_FIELD_LABELS);

  useEffect(() => {
    if (dialogOpen) {
      storedSchedule.current = editing?.scheduledAt
        ? toDateTimeLocalValue(editing.scheduledAt)
        : '';
      form.reset(
        editing
          ? {
              title: editing.title,
              body: editing.body,
              scheduledAt: editing.scheduledAt
                ? toDateTimeLocalValue(editing.scheduledAt)
                : '',
            }
          : { title: '', body: '', scheduledAt: '' }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing]);

  const openEditDialog = (announcement: Announcement) => {
    setEditing(announcement);
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    const scheduledAt = data.scheduledAt
      ? new Date(data.scheduledAt).toISOString()
      : undefined;
    setSaveFailure(null);

    try {
      if (editing) {
        // An emptied date is sent as `null`: the server then clears the
        // schedule and a scheduled announcement goes back to draft. A date
        // on a draft schedules it. (Omitting it would leave it unchanged.)
        await onUpdate(editing.id, {
          title: data.title,
          body: data.body,
          scheduledAt: scheduledAt ?? null,
        });
      } else {
        await onCreate({ title: data.title, body: data.body, scheduledAt });
      }
      notifySuccess('announcements:manage.saveSuccess');
      // Saved: nothing is unsaved, so close without asking.
      closeDialog();
    } catch (error) {
      const failure = normalizeUnknownError(error);
      // A field violation is already on its field; anything else is ONE
      // alert inside the dialog with the real reason.
      if (
        isFieldViolationError(failure) &&
        hasViolationOn(failure, ANNOUNCEMENT_FIELD_LABELS)
      ) {
        return;
      }
      setSaveFailure(failure);
    }
  };

  const handlePublish = async (announcement: Announcement) => {
    const confirmed = await confirm({
      titleKey: 'announcements:manage.publishDialog.title',
      descriptionKey: 'announcements:manage.publishDialog.description',
      confirmLabelKey: 'announcements:manage.publishDialog.confirmLabel',
      cancelLabelKey: 'announcements:manage.publishDialog.cancelLabel',
      intent: 'default',
    });
    if (!confirmed) return;

    try {
      await onPublish(announcement.id);
      notifySuccess('announcements:manage.publishSuccess');
    } catch (error) {
      actionFailed(
        normalizeUnknownError(error),
        'announcements:manage.publishFailedTitle'
      );
    }
  };

  const handleArchive = async (announcement: Announcement) => {
    // V16 — a draft or scheduled announcement can be taken off the list's
    // way too (the backend has archive, no delete): it is never published.
    const unpublished = announcement.status !== 'published';
    const confirmed = await confirm({
      titleKey: unpublished
        ? 'announcements:manage.archiveDraftDialog.title'
        : 'announcements:manage.archiveDialog.title',
      descriptionKey: unpublished
        ? 'announcements:manage.archiveDraftDialog.description'
        : 'announcements:manage.archiveDialog.description',
      confirmLabelKey: 'announcements:manage.archiveDialog.confirmLabel',
      cancelLabelKey: 'announcements:manage.archiveDialog.cancelLabel',
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await onArchive(announcement.id);
      notifySuccess('announcements:manage.archiveSuccess');
    } catch (error) {
      actionFailed(
        normalizeUnknownError(error),
        'announcements:manage.archiveFailedTitle'
      );
    }
  };

  if (error) {
    return <ErrorState onRetry={onRetry} />;
  }

  return (
    <>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          titleKey={emptyTitleKey}
          descriptionKey={emptyDescriptionKey}
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                <div className="min-w-0 flex-1 basis-60 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className="font-display text-base font-semibold text-foreground"
                      dir="auto"
                    >
                      {announcement.title}
                    </h3>
                    <StatusBadge
                      labelKey={`announcements:status.${announcement.status}`}
                      tone={getStatusTone(announcement.status)}
                    />
                  </div>
                  {/* V16 — "Scheduled" says when. */}
                  {announcement.status === 'scheduled' &&
                  announcement.scheduledAt ? (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid="announcement-scheduled-for"
                    >
                      {t('announcements:manage.scheduledFor', {
                        date: fmt.dateTime(announcement.scheduledAt),
                      })}
                    </p>
                  ) : announcement.status === 'published' &&
                    announcement.publishedAt ? (
                    <p className="text-xs text-muted-foreground">
                      {t('announcements:manage.publishedOn', {
                        date: fmt.dateTime(announcement.publishedAt),
                      })}
                    </p>
                  ) : null}
                  <p
                    className="line-clamp-2 text-sm text-muted-foreground"
                    dir="auto"
                  >
                    {announcement.body}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.status === 'draft' ||
                    announcement.status === 'scheduled' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(announcement)}
                        >
                          {t('announcements:manage.editAction')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePublish(announcement)}
                        >
                          {t('announcements:manage.publishAction')}
                        </Button>
                      </>
                    ) : null}
                    {announcement.status !== 'archived' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchive(announcement)}
                      >
                        {t('announcements:manage.archiveAction')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('announcements:manage.editTitle')
                : t('announcements:manage.createTitle')}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('announcements:manage.titleLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input dir="auto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('announcements:manage.bodyLabel')}</FormLabel>
                    <FormControl>
                      <Textarea rows={5} dir="auto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('announcements:manage.scheduledAtLabel')}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({t('announcements:manage.optional')})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        min={
                          field.value && field.value === storedSchedule.current
                            ? undefined
                            : toDateTimeLocalValue(new Date().toISOString())
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('announcements:manage.scheduledAtHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {saveFailure ? (
                <SaveFailedAlert
                  error={saveFailure}
                  titleKey="announcements:manage.notSavedTitle"
                />
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSaving}
                >
                  {t('announcements:manage.cancelButton')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('announcements:manage.saveButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The page-header action, so both pages render an identical control. */
export function AnnouncementCreateButton({
  onClick,
}: {
  readonly onClick: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <Button onClick={onClick}>
      <Plus className="size-4" strokeWidth={2} aria-hidden />
      {t('announcements:manage.createButton')}
    </Button>
  );
}
