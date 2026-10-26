/**
 * B3 — add or edit one launch checklist item: section, title, description,
 * link and notes. Errors sit next to their field and are announced with
 * the field (`aria-describedby`); the dialog cannot close mid-save.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CHECKLIST_SECTIONS,
  type ChecklistItemWritePayload,
  type ChecklistSection,
  type LaunchChecklistItem,
} from '../types';
import { CHECKLIST_LIMITS, K, isSafeLink } from '../utils/launch.utils';
import { Field } from './fields';

interface Draft {
  section: ChecklistSection;
  title: string;
  description: string;
  linkUrl: string;
  notes: string;
}

function draftOf(
  item: LaunchChecklistItem | null,
  section: ChecklistSection
): Draft {
  return {
    section: item?.section ?? section,
    title: item?.title ?? '',
    description: item?.description ?? '',
    linkUrl: item?.linkUrl ?? '',
    notes: item?.notes ?? '',
  };
}

export function validateChecklistDraft(
  draft: Draft
): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  const title = draft.title.trim();
  if (!title || title.length > CHECKLIST_LIMITS.titleMax)
    errors.title = 'checklist.dialog.titleRequired';
  if (draft.description.length > CHECKLIST_LIMITS.descriptionMax)
    errors.description = 'checklist.dialog.descriptionLength';
  if (draft.notes.length > CHECKLIST_LIMITS.notesMax)
    errors.notes = 'checklist.dialog.notesLength';
  if (draft.linkUrl.trim() && !isSafeLink(draft.linkUrl))
    errors.linkUrl = 'checklist.dialog.linkInvalid';
  return errors;
}

export function ChecklistItemDialog({
  open,
  onOpenChange,
  item,
  defaultSection = 'product',
  pending,
  onSubmit,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** null = add. */
  readonly item: LaunchChecklistItem | null;
  readonly defaultSection?: ChecklistSection;
  readonly pending: boolean;
  readonly onSubmit: (payload: ChecklistItemWritePayload) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(() =>
    draftOf(item, defaultSection)
  );
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(draftOf(item, defaultSection));
      setSubmitted(false);
    }
  }, [open, item, defaultSection]);

  const errors = validateChecklistDraft(draft);
  const shown = submitted ? errors : {};
  const set = <F extends keyof Draft>(field: F, value: Draft[F]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onSubmit({
      section: draft.section,
      title: draft.title.trim(),
      description: draft.description.trim(),
      linkUrl: draft.linkUrl.trim() || null,
      notes: draft.notes.trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(`${K}checklist.dialog.${item ? 'editTitle' : 'addTitle'}`)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t(`${K}checklist.subtitle`)}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="checklist-section">
              {t(`${K}checklist.dialog.section`)}
            </Label>
            <Select
              value={draft.section}
              onValueChange={(value) =>
                set('section', value as ChecklistSection)
              }
            >
              <SelectTrigger
                id="checklist-section"
                aria-label={t(`${K}checklist.dialog.section`)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHECKLIST_SECTIONS.map((section) => (
                  <SelectItem key={section} value={section}>
                    {t(`${K}checklist.sections.${section}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field
            id="checklist-title"
            label={t(`${K}checklist.dialog.title`)}
            error={shown.title ? t(`${K}${shown.title}`) : undefined}
            counter={{
              count: draft.title.length,
              max: CHECKLIST_LIMITS.titleMax,
            }}
          >
            <Input
              value={draft.title}
              onChange={(event) => set('title', event.target.value)}
              dir="auto"
              autoComplete="off"
            />
          </Field>
          <Field
            id="checklist-description"
            label={t(`${K}checklist.dialog.description`)}
            optional
            error={
              shown.description ? t(`${K}${shown.description}`) : undefined
            }
          >
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(event) => set('description', event.target.value)}
              dir="auto"
            />
          </Field>
          <Field
            id="checklist-link"
            label={t(`${K}checklist.dialog.linkUrl`)}
            hint={t(`${K}checklist.dialog.linkUrlHint`)}
            error={shown.linkUrl ? t(`${K}${shown.linkUrl}`) : undefined}
          >
            <Input
              value={draft.linkUrl}
              onChange={(event) => set('linkUrl', event.target.value)}
              dir="ltr"
              inputMode="url"
              autoComplete="off"
            />
          </Field>
          <Field
            id="checklist-notes"
            label={t(`${K}checklist.dialog.notes`)}
            optional
            error={shown.notes ? t(`${K}${shown.notes}`) : undefined}
          >
            <Textarea
              rows={3}
              value={draft.notes}
              onChange={(event) => set('notes', event.target.value)}
              dir="auto"
            />
          </Field>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {t(`${K}common.cancel`)}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t(`${K}checklist.dialog.save`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
