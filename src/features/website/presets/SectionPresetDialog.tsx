/**
 * The page editor's step after "Add section" for a type with presets: the
 * same looks as the visual editor's library (`SectionPresetPicker`), in a
 * dialog of their own. Closing it adds nothing.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SectionType } from '@types';
import { SectionPresetPicker } from './SectionPresetPicker';
import type { SectionStart } from './section-presets.types';
import type { PresetPreviewSource } from './preset-preview-source';

export interface SectionPresetDialogProps {
  /** The section whose looks are offered; `null` keeps the dialog closed. */
  readonly type: SectionType | null;
  readonly source: PresetPreviewSource;
  readonly onClose: () => void;
  readonly onAdd: (type: SectionType, start: SectionStart | undefined) => void;
}

export function SectionPresetDialog({
  type,
  source,
  onClose,
  onAdd,
}: SectionPresetDialogProps): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <Dialog
      open={type !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[92dvh] max-w-4xl flex-col gap-0 p-0 sm:max-h-[88vh]"
        data-testid="section-preset-dialog"
      >
        <DialogTitle className="sr-only">
          {t('website:editor.addSection')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('website:presetPicker.subtitle')}
        </DialogDescription>
        {type ? (
          <SectionPresetPicker
            key={type}
            type={type}
            source={source}
            headingId={headingId}
            onAdd={(start) => onAdd(type, start)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
