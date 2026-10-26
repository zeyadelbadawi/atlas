/**
 * B3 — the post body editor: a formatting toolbar (headings, bold, italic,
 * link, lists, quote, image upload) over a Markdown textarea, with a live
 * preview rendered by the SAME renderer the public blog uses
 * (`marketing/blog/markdown`). Wide screens show both side by side; narrow
 * screens switch between Write and Preview.
 *
 * The toolbar is a `role="toolbar"` with a roving tabindex (arrow keys move,
 * Tab leaves); Ctrl/⌘+B and Ctrl/⌘+I work in the textarea.
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  type LucideIcon,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@utils';
import { renderBlogMarkdown, readingMinutes } from '@/marketing/blog/markdown';
import { BLOG_LIMITS, IMAGE_TYPES, K } from '../utils/launch.utils';
import { CharCounter } from './fields';

type Action =
  | 'heading'
  | 'subheading'
  | 'bold'
  | 'italic'
  | 'link'
  | 'bulletList'
  | 'numberedList'
  | 'quote'
  | 'image';

const ACTIONS: readonly { id: Action; icon: LucideIcon }[] = [
  { id: 'heading', icon: Heading2 },
  { id: 'subheading', icon: Heading3 },
  { id: 'bold', icon: Bold },
  { id: 'italic', icon: Italic },
  { id: 'link', icon: Link2 },
  { id: 'bulletList', icon: List },
  { id: 'numberedList', icon: ListOrdered },
  { id: 'quote', icon: Quote },
  { id: 'image', icon: ImagePlus },
];

export interface Edit {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

/** Wraps the selection (or a placeholder) with `before`/`after`. */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string
): Edit {
  const selected = value.slice(start, end) || placeholder;
  const next =
    value.slice(0, start) + before + selected + after + value.slice(end);
  return {
    value: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

/** Prefixes every selected line (or the current line) with `prefix`. */
export function prefixLines(
  value: string,
  start: number,
  end: number,
  prefix: (index: number) => string
): Edit {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIndex = value.indexOf('\n', end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const lines = value.slice(lineStart, lineEnd).split('\n');
  const replaced = lines
    .map(
      (line, index) =>
        `${prefix(index)}${line.replace(/^(#{1,6} |> |- |\d+\. )/, '')}`
    )
    .join('\n');
  const next = value.slice(0, lineStart) + replaced + value.slice(lineEnd);
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + replaced.length,
  };
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  lang,
  label,
  hint,
  error,
  onUploadImage,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly lang: 'en' | 'ar';
  readonly label: string;
  readonly hint: string;
  readonly error?: string;
  /** Uploads an image and resolves its public URL (rejects on failure). */
  readonly onUploadImage: (file: File) => Promise<string>;
}): JSX.Element {
  const { t } = useTranslation();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const toolbarButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const apply = (edit: Edit) => {
    onChange(edit.value);
    requestAnimationFrame(() => {
      const node = textarea.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  const run = (action: Action) => {
    const node = textarea.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    switch (action) {
      case 'heading':
        return apply(prefixLines(value, start, end, () => '## '));
      case 'subheading':
        return apply(prefixLines(value, start, end, () => '### '));
      case 'bold':
        return apply(
          wrapSelection(
            value,
            start,
            end,
            '**',
            '**',
            t(`${K}editor.toolbar.bold`)
          )
        );
      case 'italic':
        return apply(
          wrapSelection(
            value,
            start,
            end,
            '_',
            '_',
            t(`${K}editor.toolbar.italic`)
          )
        );
      case 'link':
        return apply(
          wrapSelection(
            value,
            start,
            end,
            '[',
            '](https://)',
            t(`${K}editor.toolbar.linkPlaceholder`)
          )
        );
      case 'bulletList':
        return apply(prefixLines(value, start, end, () => '- '));
      case 'numberedList':
        return apply(
          prefixLines(value, start, end, (index) => `${index + 1}. `)
        );
      case 'quote':
        return apply(prefixLines(value, start, end, () => '> '));
      case 'image':
        fileInput.current?.click();
        return undefined;
    }
  };

  const insertImage = async (file: File) => {
    if (
      !(IMAGE_TYPES as readonly string[]).includes(file.type) ||
      file.size > BLOG_LIMITS.imageMaxBytes
    )
      return;
    const node = textarea.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      const alt =
        value.slice(start, end) || t(`${K}editor.toolbar.imagePlaceholder`);
      const block = `\n\n![${alt}](${url})\n\n`;
      const next = value.slice(0, start) + block + value.slice(end);
      apply({
        value: next,
        selectionStart: start + 4,
        selectionEnd: start + 4 + alt.length,
      });
    } catch {
      // The caller reports the failure; the text is unchanged.
    } finally {
      setUploading(false);
    }
  };

  const onToolbarKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys =
      dir === 'rtl'
        ? { next: 'ArrowLeft', prev: 'ArrowRight' }
        : { next: 'ArrowRight', prev: 'ArrowLeft' };
    let index = focusIndex;
    if (event.key === keys.next) index = (focusIndex + 1) % ACTIONS.length;
    else if (event.key === keys.prev)
      index = (focusIndex - 1 + ACTIONS.length) % ACTIONS.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = ACTIONS.length - 1;
    else return;
    event.preventDefault();
    setFocusIndex(index);
    toolbarButtons.current[index]?.focus();
  };

  const onTextareaKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'b' || key === 'i') {
      event.preventDefault();
      run(key === 'b' ? 'bold' : 'italic');
    }
  };

  const hintId = `${id}-hint`;
  const errorId = error ? `${id}-error` : undefined;
  const countId = `${id}-count`;
  const minutes = readingMinutes(value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none text-foreground"
        >
          {label}
        </label>
        <div
          role="group"
          aria-label={t(`${K}editor.body.viewLabel`)}
          className="inline-flex rounded-md border border-border p-0.5 xl:hidden"
        >
          {(['write', 'preview'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className="min-h-9 rounded px-3 text-sm font-medium text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t(`${K}editor.body.${option}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div
          className={cn(
            'min-w-0 space-y-0',
            view === 'preview' && 'hidden xl:block'
          )}
        >
          <div
            role="toolbar"
            aria-label={t(`${K}editor.toolbar.label`)}
            aria-controls={id}
            onKeyDown={onToolbarKey}
            className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-input bg-muted/40 p-1"
          >
            {ACTIONS.map(({ id: action, icon: Icon }, index) => (
              <button
                key={action}
                ref={(node) => {
                  toolbarButtons.current[index] = node;
                }}
                type="button"
                tabIndex={index === focusIndex ? 0 : -1}
                onFocus={() => setFocusIndex(index)}
                onClick={() => run(action)}
                disabled={action === 'image' && uploading}
                aria-label={t(`${K}editor.toolbar.${action}`)}
                title={t(`${K}editor.toolbar.${action}`)}
                className="inline-flex size-10 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {action === 'image' && uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Icon className="size-4" aria-hidden />
                )}
              </button>
            ))}
            {uploading ? (
              <span
                role="status"
                className="ms-2 text-xs text-muted-foreground"
              >
                {t(`${K}editor.toolbar.uploadingImage`)}
              </span>
            ) : null}
          </div>
          <Textarea
            ref={textarea}
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onTextareaKey}
            dir={dir}
            lang={lang}
            rows={20}
            spellCheck
            aria-describedby={[hintId, errorId, countId]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={error ? true : undefined}
            className="min-h-[24rem] rounded-t-none font-mono text-sm leading-6"
          />
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void insertImage(file);
            }}
          />
        </div>
        <section
          aria-label={t(`${K}editor.body.previewLabel`)}
          className={cn(
            'min-w-0 rounded-md border border-border bg-background p-4 sm:p-6',
            view === 'write' && 'hidden xl:block'
          )}
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground rtl:tracking-normal">
            {t(`${K}editor.body.previewLabel`)}
          </p>
          <div lang={lang} dir={dir} className="max-h-[36rem] overflow-y-auto">
            {value.trim() ? (
              renderBlogMarkdown(value)
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(`${K}editor.body.previewEmpty`)}
              </p>
            )}
          </div>
        </section>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint} {t(`${K}editor.body.readingTime`, { count: minutes })}
        </p>
        <CharCounter
          id={countId}
          count={value.length}
          max={BLOG_LIMITS.bodyMax}
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
