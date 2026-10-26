/**
 * B3 — the post's cover image: upload (PNG/JPEG/WebP ≤ 5 MB, checked here
 * and on the server), preview, replace and remove. The upload button is a
 * real button that opens a hidden file input; status is announced.
 */
import { useRef, useState } from 'react';
import { ImageUp, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { BlogCoverImage, UploadedImage } from '../types';
import { BLOG_LIMITS, IMAGE_TYPES, K } from '../utils/launch.utils';

/** A message key for a file the server would refuse, or null. */
export function imageFileProblem(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return 'editor.cover.wrongType';
  if (file.size > BLOG_LIMITS.imageMaxBytes) return 'editor.cover.tooLarge';
  return null;
}

export function CoverImageField({
  id,
  value,
  onChange,
  upload,
  alt,
}: {
  readonly id: string;
  readonly value: BlogCoverImage | null;
  readonly onChange: (value: BlogCoverImage | null) => void;
  readonly upload: (file: File) => Promise<UploadedImage>;
  /** The preview's alt text (the current language's description). */
  readonly alt: string;
}): JSX.Element {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = async (file: File) => {
    const issue = imageFileProblem(file);
    if (issue) {
      setProblem(issue);
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const image = await upload(file);
      onChange({ url: image.url, width: image.width, height: image.height });
    } catch {
      setProblem('editor.cover.failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {value ? (
        <img
          src={value.url}
          width={value.width}
          height={value.height}
          alt={alt || t(`${K}editor.cover.alt`)}
          className="aspect-video w-full rounded-md border border-border bg-muted object-cover"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
          aria-describedby={`${id}-hint`}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImageUp className="size-4" aria-hidden />
          )}
          {t(
            `${K}editor.cover.${busy ? 'uploading' : value ? 'replace' : 'upload'}`
          )}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onChange(null)}
          >
            <Trash2 className="size-4" aria-hidden />
            {t(`${K}editor.cover.remove`)}
          </Button>
        ) : null}
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void pick(file);
        }}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {t(`${K}editor.cover.hint`)}
      </p>
      <p
        role="status"
        className="text-xs font-medium text-destructive empty:hidden"
      >
        {problem ? t(`${K}${problem}`) : ''}
      </p>
    </div>
  );
}
