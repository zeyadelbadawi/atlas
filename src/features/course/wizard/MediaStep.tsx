/**
 * Wizard step 3 — Media (W6): the course image.
 *
 * Picked from (or uploaded into) the academy media library, so the course
 * stores the asset's URL — not a base64 data URL inlined into every course
 * list payload, which is what the classic create form does — and media
 * usage tracking sees the course thumbnail. "Remove" clears it.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { ImageIcon, ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaLibraryDialog } from '@features/media';
import { useStepSave } from './useStepSave';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

interface MediaValues {
  thumbnail: string;
}

export function MediaStep({
  academyId,
  course,
  onBack,
  onNext,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const form = useForm<MediaValues>({
    defaultValues: { thumbnail: course.thumbnail ?? '' },
  });
  const thumbnail = form.watch('thumbnail');

  const { save, markSaved, isSaving } = useStepSave({
    academyId,
    courseId: course.id,
    form,
    toPayload: (values, dirty) =>
      dirty.thumbnail ? { thumbnail: values.thumbnail } : null,
  });

  const onSubmit = async (values: MediaValues) => {
    if (!(await save(values))) return;
    markSaved();
    onNext();
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      <div className="space-y-3">
        <div
          className="flex aspect-video w-full max-w-md items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40"
          data-testid="wizard-thumbnail-preview"
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={t('course:wizard.media.previewAlt')}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="size-8" strokeWidth={1.5} aria-hidden />
              {t('course:wizard.media.none')}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t('course:wizard.media.help')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLibraryOpen(true)}
          >
            <ImagePlus className="size-4" strokeWidth={2} aria-hidden />
            {thumbnail
              ? t('course:wizard.media.change')
              : t('course:wizard.media.choose')}
          </Button>
          {thumbnail ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                form.setValue('thumbnail', '', { shouldDirty: true })
              }
            >
              <Trash2 className="size-4" strokeWidth={2} aria-hidden />
              {t('course:wizard.media.remove')}
            </Button>
          ) : null}
        </div>
      </div>

      <MediaLibraryDialog
        academyId={academyId}
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        accept="image/png,image/jpeg,image/webp"
        selectedUrl={thumbnail || undefined}
        onSelect={(asset) => {
          form.setValue('thumbnail', asset.url, { shouldDirty: true });
          setLibraryOpen(false);
        }}
      />

      <WizardStepFooter onBack={onBack} nextType="submit" pending={isSaving} />
    </form>
  );
}
