/**
 * Instructor Course Announcements Page.
 *
 * Lets an authorized instructor author, publish and archive announcements
 * scoped to one course. Every write goes through the course-scoped
 * `AnnouncementService` methods — an instructor can never create a
 * platform- or academy-wide announcement from here.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
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
  useCourseAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  usePublishAnnouncement,
  useArchiveAnnouncement,
} from '../hooks';
import {
  announcementSchema,
  type AnnouncementFormData,
} from '../schemas/announcement.schemas';
import type { Announcement, AnnouncementStatus } from '@types';

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

export default function InstructorAnnouncementsPage(): JSX.Element {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { confirm } = useConfirmDialog();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const { data, isLoading, error, refetch } = useCourseAnnouncements(
    courseId ?? '',
    { enabled: !!courseId }
  );
  const announcements = data?.items ?? [];

  const {
    mutateAsync: createAnnouncement,
    isPending: isCreating,
    error: createError,
  } = useCreateAnnouncement(courseId ?? '');
  const {
    mutateAsync: updateAnnouncement,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateAnnouncement(courseId ?? '');
  const { mutateAsync: publishAnnouncement } = usePublishAnnouncement(
    courseId ?? ''
  );
  const { mutateAsync: archiveAnnouncement } = useArchiveAnnouncement(
    courseId ?? ''
  );

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', body: '', scheduledAt: '' },
  });

  useServerValidation(form, editing ? updateError : createError);

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

  const openCreateDialog = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditing(announcement);
    setDialogOpen(true);
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    const scheduledAt = data.scheduledAt
      ? new Date(data.scheduledAt).toISOString()
      : undefined;

    try {
      if (editing) {
        await updateAnnouncement({
          announcementId: editing.id,
          payload: { title: data.title, body: data.body, scheduledAt },
        });
      } else {
        await createAnnouncement({
          title: data.title,
          body: data.body,
          scheduledAt,
        });
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
      await publishAnnouncement(announcement.id);
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
      await archiveAnnouncement(announcement.id);
      toast({ title: t('announcements:manage.archiveSuccess') });
    } catch {
      toast({
        title: t('announcements:manage.archiveError'),
        variant: 'destructive',
      });
    }
  };

  if (error) {
    return (
      <PageContainer>
        <PageHeader titleKey="announcements:manage.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="announcements:manage.title"
        descriptionKey="announcements:manage.subtitle"
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('announcements:manage.createButton')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          titleKey="announcements:manage.empty"
          descriptionKey="announcements:manage.emptyDescription"
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
                  disabled={isCreating || isUpdating}
                >
                  {t('announcements:manage.cancelButton')}
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('announcements:manage.saveButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
