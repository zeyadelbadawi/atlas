/**
 * The video section's YouTube link (CMS phase 3d, field kind `youtube`).
 *
 * The Owner pastes a link in any common form; only the 11-character video
 * id is stored (the schema reduces a link to its id on save, the same way
 * the API does). A complete link goes live at once — the preview shows the
 * video's poster as soon as it is pasted — while a half-typed one waits
 * until the field is left, and only then says what is wrong and how to fix
 * it. A recognised link shows its thumbnail, so the Owner can see it is the
 * right video before publishing.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  isYouTubeVideoId,
  toYouTubeVideoId,
  youTubePosterUrl,
} from '../utils/section-media-values.utils';

/** What the field shows for a stored value: a link for an id, else the text as stored. */
function displayText(value: string | undefined): string {
  if (!value) return '';
  return isYouTubeVideoId(value) ? `https://youtu.be/${value}` : value;
}

export function YouTubeVideoField({
  id,
  labelKey,
  value,
  onChange,
  schemaError,
}: {
  readonly id: string;
  readonly labelKey: string;
  readonly value: string | undefined;
  readonly onChange: (next: string) => void;
  /** The form's message for this field (after a refused Apply, or in the panel). */
  readonly schemaError?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const [text, setText] = useState(() => displayText(value));
  const [touched, setTouched] = useState(false);
  const committedRef = useRef(value);

  // Undo/redo or a reload replaces the value underneath: show it.
  useEffect(() => {
    if (value === committedRef.current) return;
    committedRef.current = value;
    setText(displayText(value));
  }, [value]);

  const commit = (next: string) => {
    if (next === committedRef.current) return;
    committedRef.current = next;
    onChange(next);
  };

  const videoId = toYouTubeVideoId(text);
  const localIssue =
    touched && text.trim() !== '' && !videoId
      ? t('validation:invalidYouTubeVideo')
      : undefined;
  const error = schemaError ?? localIssue;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <Input
        id={id}
        type="url"
        inputMode="url"
        dir="ltr"
        data-ltr-content
        autoComplete="off"
        spellCheck={false}
        placeholder="https://youtu.be/…"
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${errorId} ${hintId}` : hintId}
        data-field-error={error ? true : undefined}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          // A complete link goes live at once; a half-typed one waits for blur.
          const parsed = toYouTubeVideoId(next);
          if (parsed) commit(parsed);
          else if (!next.trim()) commit('');
        }}
        onBlur={() => {
          setTouched(true);
          commit(toYouTubeVideoId(text) ?? text.trim());
        }}
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {videoId ? (
        <div className="flex items-center gap-3 rounded-md border border-border p-2">
          <img
            src={youTubePosterUrl(videoId)}
            alt={t('website:sectionEditors.video.thumbnailAlt')}
            width={96}
            height={54}
            loading="lazy"
            decoding="async"
            className="aspect-[16/9] w-24 shrink-0 rounded object-cover"
          />
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-foreground">
            <CheckCircle2
              className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <span>{t('website:sectionEditors.video.found')}</span>
            <span
              className="truncate font-mono text-muted-foreground"
              dir="ltr"
            >
              {videoId}
            </span>
          </p>
        </div>
      ) : null}
      <p id={hintId} className="text-xs text-muted-foreground">
        {t('website:sectionEditors.video.hint')}
        {!text.trim() ? ` ${t('website:sectionEditors.video.empty')}` : ''}
      </p>
    </div>
  );
}
