/**
 * Lesson Form Dialog.
 *
 * Shared create/edit dialog for a course lesson.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useDirtyGuard } from '@features/unsaved-changes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@features/messaging';
import { isYouTubeUrl } from '@utils';
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
import type { HostedVideoAsset, ProtectedLessonFile } from '@types';
import { isFeatureEnabled } from '@config';
import { ProtectedLessonFileField } from './ProtectedLessonFileField';
import { HostedVideoField } from './HostedVideoField';
import type { UploadedHostedVideo } from '../utils/hosted-video-upload';

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
   * B0-MED-05 — when provided, a File lesson's file is uploaded to the
   * protected tier (signed, short-lived links for enrolled learners only)
   * instead of the public media library it used to come from.
   */
  readonly onUploadProtectedFile?: (file: File) => Promise<ProtectedLessonFile>;
  /** B0-MED-05 — the lesson being edited already delivers a protected file. */
  readonly hasProtectedFile?: boolean;
  /**
   * B0-LRN-01 — true while an existing text lesson's body is being read
   * for editing. Saving is disabled until it arrives, so an edit can never
   * overwrite the stored body with an empty one.
   */
  readonly bodyLoading?: boolean;
  /**
   * B0-MED-11 — upload a Video lesson's video to Atlas (Normal tier). Used
   * only while `hostedVideoAuthoring` is on; otherwise a video lesson takes
   * a YouTube link only.
   */
  readonly onUploadHostedVideo?: (
    file: File,
    onProgress: (percent: number) => void
  ) => Promise<UploadedHostedVideo>;
  /** B0-MED-11 — the academy's hosted videos, for "choose an existing video". */
  readonly loadHostedVideos?: () => Promise<readonly HostedVideoAsset[]>;
}

const EMPTY_LESSON_VALUES: CourseLessonFormData = {
  title: '',
  description: '',
  contentType: 'text',
  contentUrl: '',
  status: 'draft',
  bodyHtml: '',
};

export function LessonFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  isPending,
  onSubmit,
  onUploadProtectedFile,
  hasProtectedFile = false,
  error,
  bodyLoading = false,
  onUploadHostedVideo,
  loadHostedVideos,
}: LessonFormDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const hostedVideo =
    isFeatureEnabled('hostedVideoAuthoring') && onUploadHostedVideo && loadHostedVideos
      ? { onUpload: onUploadHostedVideo, loadLibrary: loadHostedVideos }
      : null;
  const hostedVideoEnabled = hostedVideo !== null;

  const form = useForm<CourseLessonFormData>({
    resolver: zodResolver(courseLessonSchema),
    defaultValues: EMPTY_LESSON_VALUES,
  });

  // Unsaved-changes protection for a MODAL. The route blocker cannot see
  // this: closing a dialog is not a navigation, so the X button, an
  // outside click and Escape all need to be intercepted here instead.
  const dirtyGuard = useDirtyGuard(form.formState.isDirty);

  // This dialog is kept mounted across opens (`CourseBuilderPage` never
  // unmounts it, just toggles `open`), so `useForm`'s own `values:` option
  // (previously used here) silently skipped resetting whenever the new
  // `defaultValues` was deep-equal to the previous open's — which is
  // ALWAYS true for two consecutive "Add Lesson" (create-mode) opens,
  // since both fall back to the exact same literal empty-values object by
  // value. Net effect, reproduced live: opening "Add Lesson" a second
  // time inherited the first lesson's still-dirty `title`/`contentUrl`
  // field state, and typing into a field the user assumed was empty
  // inserted at the caret instead of replacing anything — producing a
  // garbled concatenation of both lessons' text in one saved field.
  // Force-resetting on every `open` transition (matching
  // `AssignmentFormDialog.tsx`'s identical, already-correct convention)
  // fixes this regardless of `deepEqual`.
  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues ?? EMPTY_LESSON_VALUES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues]);

  useServerValidation(form, error ?? null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Opening is never guarded; only closing can lose work.
        if (next) return onOpenChange(true);
        void dirtyGuard.requestClose(() => onOpenChange(false));
      }}
    >
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

            {/* B0-LRN-01 — a text lesson's body. It is what the learner
                reads; the description above stays a short summary. */}
            {form.watch('contentType') === 'text' ? (
              <FormField
                control={form.control}
                name="bodyHtml"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel id="lesson-body-label">
                      {t('course:builder.lessonDialog.bodyLabel')}
                    </FormLabel>
                    {bodyLoading ? (
                      <p
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                        role="status"
                      >
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        {t('course:builder.lessonDialog.bodyLoading')}
                      </p>
                    ) : (
                      <RichTextEditor
                        id="lesson-body"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        labelledBy="lesson-body-label"
                        describedBy="lesson-body-help"
                        dir={i18n.dir()}
                        invalid={!!fieldState.error}
                        placeholder={t(
                          'course:builder.lessonDialog.bodyPlaceholder'
                        )}
                      />
                    )}
                    <p
                      id="lesson-body-help"
                      className="text-xs text-muted-foreground"
                    >
                      {t('course:builder.lessonDialog.bodyHelp')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {form.watch('contentType') === 'file' && onUploadProtectedFile ? (
              <FormField
                control={form.control}
                name="protectedFile"
                render={({ field }) => (
                  <FormItem>
                    <ProtectedLessonFileField
                      value={field.value}
                      onChange={field.onChange}
                      onUpload={onUploadProtectedFile}
                      hasProtectedFile={hasProtectedFile}
                      hasPublicLink={!!form.watch('contentUrl')}
                      onUploadingChange={setIsUploadingFile}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {form.watch('contentType') === 'video' && hostedVideo ? (
              <FormField
                control={form.control}
                name="hostedVideo"
                render={({ field }) => (
                  <FormItem>
                    <HostedVideoField
                      value={field.value}
                      onChange={field.onChange}
                      onUpload={hostedVideo.onUpload}
                      loadLibrary={hostedVideo.loadLibrary}
                      onUploadingChange={setIsUploadingFile}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {form.watch('contentType') !== 'text' &&
            // B0-MED-05 — once a protected file is attached, the public link
            // field goes: saving clears that link.
            !(
              form.watch('contentType') === 'file' &&
              (hasProtectedFile || !!form.watch('protectedFile'))
            ) &&
            // B0-MED-11 — likewise for a hosted video: it is what plays.
            !(form.watch('contentType') === 'video' && !!form.watch('hostedVideo')) ? (
              <FormField
                control={form.control}
                name="contentUrl"
                render={({ field }) => {
                  const contentType = form.watch('contentType');
                  // Inferred from the URL string itself, never a separate
                  // stored field — see `youtube.utils.ts`'s own doc comment
                  // for why the content model stays a single opaque
                  // `contentUrl` regardless of source.
                  const isYoutube =
                    contentType === 'video' &&
                    !!field.value &&
                    isYouTubeUrl(field.value);

                  return (
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
                      {contentType === 'video' || contentType === 'file' ? (
                        <p className="text-xs text-muted-foreground">
                          {t(
                            contentType === 'video'
                              ? hostedVideoEnabled
                                ? 'course:builder.lessonDialog.contentUrlHelpVideoOr'
                                : 'course:builder.lessonDialog.contentUrlHelpVideo'
                              : 'course:builder.lessonDialog.contentUrlHelpFile'
                          )}
                        </p>
                      ) : null}
                      {isYoutube ? (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--brand-500))]">
                          <Youtube className="size-3.5" aria-hidden />
                          {t('course:builder.lessonDialog.youtubeDetected')}
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void dirtyGuard.requestClose(() => onOpenChange(false))
                }
                disabled={isPending}
              >
                {t('course:builder.lessonDialog.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={isPending || bodyLoading || isUploadingFile}
              >
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
