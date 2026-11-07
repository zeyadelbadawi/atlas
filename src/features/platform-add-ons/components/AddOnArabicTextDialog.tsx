/**
 * B5 (UX audit) V21 — an add-on's Arabic name and description.
 *
 * Add-ons are registered in English. Customers using Atlas in Arabic saw
 * "Extra Academy" in an Arabic store unless the client happened to carry a
 * translation for that exact seeded text. The Platform Owner now types the
 * Arabic name and description here (`PATCH platform-add-ons/:key/arabic-text`);
 * the store, the checkout and the console show them on Arabic pages and the
 * English text everywhere else, or whenever a field is left empty.
 *
 * Same lengths as the server (80 / 300), counted as typed and never cut.
 * The save is version-guarded like the status change: a stale version says
 * so instead of overwriting someone else's edit. A refusal shows once, in
 * the dialog, which stays open with what was typed; leaving with changes
 * asks first.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
import { SaveFailedAlert, hasViolationOn, useFailureReason } from '@forms';
import { useDirtyGuard } from '@features/unsaved-changes';
import { useBidiIsolation } from '@hooks';
import { useUpdateAddOnArabicText } from '../hooks/usePlatformAddOns';
import type { PlatformAddOnRow } from '../types';

/** Server `ADD_ON_NAME_AR_MAX_LENGTH` / `ADD_ON_DESCRIPTION_AR_MAX_LENGTH`. */
export const ADD_ON_NAME_AR_MAX = 80;
export const ADD_ON_DESCRIPTION_AR_MAX = 300;

const FIELDS = { nameAr: 'nameAr', descriptionAr: 'descriptionAr' } as const;

export interface AddOnArabicTextDialogProps {
  /** The add-on being edited; `null` closes the dialog. */
  readonly addOn: PlatformAddOnRow | null;
  readonly onClose: () => void;
}

export function AddOnArabicTextDialog({
  addOn,
  onClose,
}: AddOnArabicTextDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { isolate } = useBidiIsolation();
  const failureReason = useFailureReason();
  const update = useUpdateAddOnArabicText();
  const [nameAr, setNameAr] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');

  // Opening an add-on starts from its saved texts and a clean slate.
  const resetUpdate = update.reset;
  useEffect(() => {
    if (!addOn) return;
    setNameAr(addOn.nameAr ?? '');
    setDescriptionAr(addOn.descriptionAr ?? '');
    resetUpdate();
    // Only when a different add-on is opened, never on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOn]);

  const isDirty =
    addOn !== null &&
    (nameAr !== (addOn.nameAr ?? '') ||
      descriptionAr !== (addOn.descriptionAr ?? ''));
  const guard = useDirtyGuard(isDirty);
  const requestClose = () => {
    if (update.isPending) return;
    void guard.requestClose(onClose);
  };

  const nameTooLong = nameAr.trim().length > ADD_ON_NAME_AR_MAX;
  const descriptionTooLong =
    descriptionAr.trim().length > ADD_ON_DESCRIPTION_AR_MAX;

  const serverError = update.error ?? null;
  const fieldError = (field: keyof typeof FIELDS): string | null =>
    serverError && hasViolationOn(serverError, { [field]: FIELDS[field] })
      ? failureReason(serverError)
      : null;
  const nameError = nameTooLong
    ? t('validation:maxLength', {
        field: t('platformAddOns:arabicText.nameLabel'),
        count: ADD_ON_NAME_AR_MAX,
      })
    : fieldError('nameAr');
  const descriptionError = descriptionTooLong
    ? t('validation:maxLength', {
        field: t('platformAddOns:arabicText.descriptionLabel'),
        count: ADD_ON_DESCRIPTION_AR_MAX,
      })
    : fieldError('descriptionAr');
  const isStale = serverError?.kind === 'conflict';
  const showFailure =
    serverError !== null &&
    !isStale &&
    serverError.kind !== 'cancelled' &&
    !hasViolationOn(serverError, FIELDS);

  const handleSave = async () => {
    if (!addOn || update.isPending || nameTooLong || descriptionTooLong) return;
    try {
      await update.mutateAsync({
        key: addOn.key,
        input: {
          nameAr: nameAr.trim(),
          descriptionAr: descriptionAr.trim(),
          expectedVersion: addOn.version,
        },
      });
    } catch {
      // Shown in the dialog, once; what was typed stays.
      return;
    }
    onClose();
  };

  const counter = (value: string, max: number, testId: string) => (
    <p
      data-testid={testId}
      className={
        value.trim().length > max
          ? 'text-xs font-medium tabular-nums text-destructive'
          : 'text-xs tabular-nums text-muted-foreground'
      }
    >
      {t('common:form.characterCount', {
        count: value.trim().length,
        max,
      })}
    </p>
  );

  return (
    <Dialog
      open={addOn !== null}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent className="max-w-lg" data-testid="addon-arabic-dialog">
        <DialogHeader>
          <DialogTitle>
            {t('platformAddOns:arabicText.title', {
              name: isolate(addOn?.name ?? ''),
            })}
          </DialogTitle>
          <DialogDescription>
            {t('platformAddOns:arabicText.description')}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="addon-name-ar">
              {t('platformAddOns:arabicText.nameLabel')}
            </Label>
            <Input
              id="addon-name-ar"
              data-testid="addon-name-ar"
              dir="rtl"
              lang="ar"
              autoComplete="off"
              value={nameAr}
              aria-invalid={nameError ? true : undefined}
              aria-describedby="addon-name-ar-english addon-name-ar-error"
              onChange={(event) => {
                setNameAr(event.target.value);
                if (update.error) update.reset();
              }}
            />
            <p
              id="addon-name-ar-english"
              className="text-xs text-muted-foreground"
            >
              {t('platformAddOns:arabicText.englishName', {
                name: isolate(addOn?.name ?? ''),
              })}
            </p>
            {counter(nameAr, ADD_ON_NAME_AR_MAX, 'addon-name-ar-count')}
            {nameError ? (
              <p
                id="addon-name-ar-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {nameError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="addon-description-ar">
              {t('platformAddOns:arabicText.descriptionLabel')}
            </Label>
            <Textarea
              id="addon-description-ar"
              data-testid="addon-description-ar"
              dir="rtl"
              lang="ar"
              rows={3}
              value={descriptionAr}
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby="addon-description-ar-error"
              onChange={(event) => {
                setDescriptionAr(event.target.value);
                if (update.error) update.reset();
              }}
            />
            {counter(
              descriptionAr,
              ADD_ON_DESCRIPTION_AR_MAX,
              'addon-description-ar-count'
            )}
            {descriptionError ? (
              <p
                id="addon-description-ar-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {descriptionError}
              </p>
            ) : null}
          </div>

          {isStale ? (
            <p
              role="alert"
              data-testid="addon-arabic-stale"
              className="text-sm text-destructive"
            >
              {t('platformAddOns:arabicText.stale')}
            </p>
          ) : null}
          {showFailure && serverError ? (
            <SaveFailedAlert
              error={serverError}
              titleKey="platformAddOns:arabicText.failed"
            />
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={requestClose}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="addon-arabic-save"
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {update.isPending
                ? t('platformAddOns:arabicText.saving')
                : t('platformAddOns:arabicText.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
