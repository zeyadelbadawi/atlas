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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useUnsavedChanges } from '@hooks';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useServerValidation } from '@forms';
import { useConfirmDialog } from '@app/providers';
import {
  announcementSchema,
  type AnnouncementFormData,
} from '../schemas/announcement.schemas';
import type { ApiError } from '@api';
import type {
  Announcement,
  AnnouncementStatus,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from '@types';

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
  const { confirm } = useConfirmDialog();

  const [editing, setEditing] = useState<Announcement | null>(null);
  const dialogOpen = isCreateOpen || editing !== null;

  const setDialogOpen = (open: boolean) => {
    if (open) return;
    // One close path for both modes, so the form never reopens still
    // holding the previous announcement's values.
    setEditing(null);
    onCreateOpenChange(false);
  };

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', body: '', scheduledAt: '' },
  });

  // Warns before this editor is left with unsaved work — both on in-app
  // navigation and on tab close or refresh.
  useUnsavedChanges({ isDirty: form.formState.isDirty });

  useServerValidation(form, saveError);

  useEffect(() => {
    if (dialogOpen) {
      form.reset(
        editing
          ? {
              title: editing.title,
              body: editing.body,
              scheduledAt: editing.scheduledAt
                ? editing.scheduledAt.slice(0, 16)
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

    try {
      if (editing) {
        await onUpdate(editing.id, {
          title: data.title,
          body: data.body,
          scheduledAt,
        });
      } else {
        await onCreate({ title: data.title, body: data.body, scheduledAt });
      }
      toast({
        title: t('announcements:manage.saveSuccess'),
        description: t('common:states.success.description'),
      });
      setDialogOpen(false);
    } catch {
      toast({
        title: t('announcements:manage.saveError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
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
      toast({ title: t('announcements:manage.publishSuccess') });
    } catch {
      toast({
        title: t('announcements:manage.publishError'),
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (announcement: Announcement) => {
    const confirmed = await confirm({
      titleKey: 'announcements:manage.archiveDialog.title',
      descriptionKey: 'announcements:manage.archiveDialog.description',
      confirmLabelKey: 'announcements:manage.archiveDialog.confirmLabel',
      cancelLabelKey: 'announcements:manage.archiveDialog.cancelLabel',
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await onArchive(announcement.id);
      toast({ title: t('announcements:manage.archiveSuccess') });
    } catch {
      toast({
        title: t('announcements:manage.archiveError'),
        variant: 'destructive',
      });
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
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {announcement.title}
                    </h3>
                    <StatusBadge
                      labelKey={`announcements:status.${announcement.status}`}
                      tone={getStatusTone(announcement.status)}
                    />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {announcement.body}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-2">
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
                    {announcement.status === 'published' ? (
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('announcements:manage.titleLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea rows={5} {...field} />
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
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
