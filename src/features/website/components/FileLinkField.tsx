/**
 * A download's link (CMS phase 3d batch D, field kind `fileLink`).
 *
 * The media pipeline already accepts PDFs (sniffed by their bytes and
 * served from the academy's public media route), so the Owner can either
 * paste a web address (Google Drive, a ministry page) or pick a file from —
 * or upload one to — the media library. A picked file is stored as its
 * relative media address and shown by name, not as a raw path.
 *
 * - A visible label tied to the input and helper text under it, both in
 *   `aria-describedby`; the URL keyboard on phones; every control ≥ 44px.
 * - A problem is said only once the author leaves the field (or after a
 *   refused Apply), and says how to fix it. The control is marked invalid
 *   from the start so a refused Apply can focus it.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FolderOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaLibraryDialog } from '@features/media';
import { DOWNLOAD_FILE_ACCEPT } from '../constants/website.constants';
import {
  isDownloadLinkOrEmpty,
  isMediaLibraryLink,
} from '../utils/section-media-values.utils';

export interface FileLinkFieldProps {
  readonly id: string;
  readonly labelKey: string;
  readonly value: unknown;
  readonly onChange: (value: string) => void;
  readonly academyId: string;
  /** The form's message for this value, already translated. */
  readonly error?: string;
  /** Show `error` before the field was left (after a refused Apply). */
  readonly revealError?: boolean;
}

export function FileLinkField({
  id,
  labelKey,
  value,
  onChange,
  academyId,
  error,
  revealError = false,
}: FileLinkFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [left, setLeft] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  /** The picked file's name, for this editing session (only its address is stored). */
  const [pickedName, setPickedName] = useState<string>();
  const text = typeof value === 'string' ? value : '';
  const fromLibrary = isMediaLibraryLink(text);
  const localIssue =
    text.trim() !== '' && !isDownloadLinkOrEmpty(text.trim())
      ? t('validation:invalidDownloadLink')
      : undefined;
  const problem = error ?? localIssue;
  const shownError = problem && (left || revealError) ? problem : undefined;
  const hintId = `${id}-hint`;
  const errorId = `${id}-message`;
  const describedBy = [hintId, shownError ? errorId : undefined]
    .filter(Boolean)
    .join(' ');
  // Library files are stored under a generated name: say what it is instead.
  const extension = /\.([a-z0-9]+)$/i.exec(text)?.[1]?.toUpperCase() ?? '';
  const fileName =
    pickedName ??
    t('website:sectionEditors.fileLink.libraryFile', { type: extension });

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      {fromLibrary ? (
        // A library file: its name, not its address; replace or remove it.
        <div
          className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
          data-testid={`${id}-library-file`}
        >
          <FileText
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-foreground" dir="ltr">
              {fileName}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('website:sectionEditors.fileLink.fromLibrary')}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              setPickedName(undefined);
              onChange('');
            }}
            aria-label={t('website:sectionEditors.fileLink.remove', {
              name: fileName,
            })}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <Input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="url"
          dir="ltr"
          spellCheck={false}
          placeholder="https://"
          className="min-h-11"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            setLeft(true);
            if (text !== text.trim()) onChange(text.trim());
          }}
          aria-invalid={problem ? true : undefined}
          aria-describedby={describedBy}
          data-field-error={problem ? true : undefined}
        />
      )}
      <Button
        // A library file has no text input: the button carries the label.
        id={fromLibrary ? id : undefined}
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => setLibraryOpen(true)}
        aria-describedby={fromLibrary ? hintId : undefined}
      >
        <FolderOpen className="size-4" aria-hidden />
        {fromLibrary
          ? t('website:sectionEditors.fileLink.replace')
          : t('website:sectionEditors.fileLink.choose')}
      </Button>
      <p id={hintId} className="text-xs text-muted-foreground">
        {t('website:sectionEditors.fileLink.hint')}
        {!text.trim() ? ` ${t('website:sectionEditors.fileLink.empty')}` : ''}
      </p>
      {shownError ? (
        <p id={errorId} className="text-xs text-destructive" role="status">
          {shownError}
        </p>
      ) : null}
      <MediaLibraryDialog
        academyId={academyId}
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        accept={DOWNLOAD_FILE_ACCEPT}
        selectedUrl={fromLibrary ? text : undefined}
        onSelect={(asset) => {
          setPickedName(asset.fileName);
          setLeft(true);
          onChange(asset.url);
        }}
      />
    </div>
  );
}
