/**
 * Lesson Form Dialog.
 *
 * Shared create/edit dialog for a course lesson.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  courseLessonSchema,
  type CourseLessonFormData,
} from '../schemas/course.schemas';

export interface LessonFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly defaultValues?: CourseLessonFormData;
  readonly isPending: boolean;
  readonly onSubmit: (data: CourseLessonFormData) => void | Promise<void>;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  isPending,
  onSubmit,
}: LessonFormDialogProps): JSX.Element {
  const { t } = useTranslation();

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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('course:builder.lessonDialog.contentUrlLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={t(
                        'course:builder.lessonDialog.contentUrlPlaceholder'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
