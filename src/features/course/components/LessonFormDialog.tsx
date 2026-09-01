/**
 * Lesson Form Dialog.
 *
 * Shared create/edit dialog for a course lesson.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaLibraryDialog } from '@features/media';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServerValidation } from '@forms';
import {
  courseLessonSchema,
  type CourseLessonFormData,
} from '../schemas/course.schemas';
import type { ApiError } from '@api';

export interface LessonFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly defaultValues?: CourseLessonFormData;
  readonly isPending: boolean;
  readonly onSubmit: (data: CourseLessonFormData) => void | Promise<void>;
  /** The create/update mutation's current error, so a validation (400) failure maps onto the field that caused it instead of only a page-level toast. */
  readonly error?: ApiError | null;
  /**
   * When provided, video/file lessons offer "Choose from library" — the
   * same real, working `MediaLibraryDialog` upload the Website Builder
   * already uses (Phase 0 fix: this dialog previously only ever offered a
   * plain URL field, even though the upload pipeline behind it was
   * already real and production-shaped).
   */
  readonly academyId?: string;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  isPending,
  onSubmit,
  academyId,
  error,
}: LessonFormDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const form = useForm<CourseLessonFormData>({
    resolver: zodResolver(courseLessonSchema),
    values: defaultValues ?? {
      title: '',
      description: '',
      contentType: 'text',
      contentUrl: '',
      status: 'draft',
    },
  });

  useServerValidation(form, error ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(
              mode === 'create'
                ? 'course:builder.lessonDialog.createTitle'
                : 'course:builder.lessonDialog.editTitle'
            )}
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
                    {t('course:builder.lessonDialog.titleLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'course:builder.lessonDialog.titlePlaceholder'
                      )}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('course:builder.lessonDialog.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder={t(
                        'course:builder.lessonDialog.descriptionPlaceholder'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('course:builder.lessonDialog.contentTypeLabel')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">
                          {t('course:contentType.text')}
                        </SelectItem>
                        <SelectItem value="video">
                          {t('course:contentType.video')}
                        </SelectItem>
                        <SelectItem value="file">
                          {t('course:contentType.file')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('course:builder.lessonDialog.statusLabel')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">
                          {t('course:lessonStatus.draft')}
                        </SelectItem>
                        <SelectItem value="published">
                          {t('course:lessonStatus.published')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contentUrl"
              render={({ field }) => {
                const contentType = form.watch('contentType');
                const canUpload = academyId && contentType !== 'text';

                return (
                  <FormItem>
                    <FormLabel>
                      {t('course:builder.lessonDialog.contentUrlLabel')}
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="url"
                          placeholder={t(
                            'course:builder.lessonDialog.contentUrlPlaceholder'
                          )}
                          {...field}
                        />
                      </FormControl>
                      {canUpload ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsLibraryOpen(true)}
                        >
                          <FolderOpen className="size-4" aria-hidden />
                          {t('course:builder.lessonDialog.chooseFromLibrary')}
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                    {canUpload ? (
                      <MediaLibraryDialog
                        academyId={academyId}
                        open={isLibraryOpen}
                        onOpenChange={setIsLibraryOpen}
                        onSelect={(asset) => field.onChange(asset.url)}
                        accept={contentType === 'video' ? 'video/*' : '*/*'}
                      />
                    ) : null}
                  </FormItem>
                );
              }}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t('course:builder.lessonDialog.cancelButton')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('course:builder.lessonDialog.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
