/**
 * W3-compose — a small, accessible rich-text editor for message bodies.
 *
 * No editor component existed in the app to reuse (the blog and lesson
 * forms use plain textareas), and the body needs only a handful of marks,
 * so this is a `contenteditable` region with a real toolbar rather than a
 * new dependency:
 *
 *   - the region is a labelled `role="textbox"` with `aria-multiline`;
 *   - the toolbar is a `role="toolbar"` of real buttons with `aria-pressed`
 *     state and 44px targets; Ctrl/⌘+B / I / U work natively;
 *   - a link is added through a labelled inline field (never `prompt()`),
 *     https: and mailto: only;
 *   - every paste is reduced to the message allowlist before insertion,
 *     and the value handed to the form is always sanitised.
 *
 * The parent owns the value (sanitised HTML). The DOM is only rewritten
 * when the value changes from OUTSIDE (a reset after sending), so typing
 * never moves the caret.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, Link2, List, ListOrdered, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { safeMessageHref, sanitizeMessageHtml } from '../utils/message-html';

export interface RichTextEditorProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (html: string) => void;
  readonly labelledBy: string;
  readonly describedBy?: string;
  readonly dir?: 'ltr' | 'rtl';
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
}

type Mark = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList';

const MARKS: readonly { command: Mark; icon: typeof Bold; labelKey: string }[] = [
  { command: 'bold', icon: Bold, labelKey: 'messaging:editor.bold' },
  { command: 'italic', icon: Italic, labelKey: 'messaging:editor.italic' },
  { command: 'underline', icon: Underline, labelKey: 'messaging:editor.underline' },
  { command: 'insertUnorderedList', icon: List, labelKey: 'messaging:editor.bulletList' },
  {
    command: 'insertOrderedList',
    icon: ListOrdered,
    labelKey: 'messaging:editor.numberedList',
  },
];

function canExec(): boolean {
  return typeof document !== 'undefined' && typeof document.execCommand === 'function';
}

export function RichTextEditor({
  id,
  value,
  onChange,
  labelledBy,
  describedBy,
  dir,
  invalid,
  disabled,
  placeholder,
}: RichTextEditorProps): JSX.Element {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>(value);
  const savedRange = useRef<Range | null>(null);
  const [active, setActive] = useState<Record<Mark, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState(false);
  const linkInputId = useId();
  const linkErrorId = useId();

  // Only an EXTERNAL value change rewrites the DOM.
  useEffect(() => {
    const element = editorRef.current;
    if (!element) return;
    if (value !== lastEmitted.current) {
      element.innerHTML = value;
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const element = editorRef.current;
    if (!element) return;
    const clean = sanitizeMessageHtml(element.innerHTML);
    lastEmitted.current = clean;
    onChange(clean);
  }, [onChange]);

  const refreshState = useCallback(() => {
    if (!canExec() || typeof document.queryCommandState !== 'function') return;
    const element = editorRef.current;
    const selection = document.getSelection();
    if (!element || !selection || !element.contains(selection.anchorNode)) return;
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshState);
    return () => document.removeEventListener('selectionchange', refreshState);
  }, [refreshState]);

  const apply = (command: Mark) => {
    if (disabled) return;
    editorRef.current?.focus();
    if (canExec()) document.execCommand(command, false);
    emit();
    refreshState();
  };

  const rememberSelection = () => {
    const selection = document.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    }
  };

  const openLink = () => {
    rememberSelection();
    setLinkUrl('');
    setLinkError(false);
    setLinkOpen(true);
  };

  const insertLink = () => {
    const href = safeMessageHref(linkUrl.trim());
    if (!href) {
      setLinkError(true);
      return;
    }
    const element = editorRef.current;
    if (!element) return;
    element.focus();
    const selection = document.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    const collapsed = !selection || selection.isCollapsed;
    if (canExec()) {
      if (collapsed) {
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.textContent = href;
        document.execCommand('insertHTML', false, anchor.outerHTML);
      } else {
        document.execCommand('createLink', false, href);
      }
    }
    emit();
    setLinkOpen(false);
  };

  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const clean = html
      ? sanitizeMessageHtml(html)
      : text
          .split(/\n{2,}/)
          .map((paragraph) => {
            const p = document.createElement('p');
            p.textContent = paragraph;
            return p.outerHTML.replace(/\n/g, '<br>');
          })
          .join('');
    if (canExec() && clean) document.execCommand('insertHTML', false, clean);
    emit();
  };

  const isEmpty = value === '';

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        invalid && 'border-destructive',
        disabled && 'opacity-60'
      )}
    >
      <div
        role="toolbar"
        aria-label={t('messaging:editor.toolbar')}
        aria-controls={id}
        className="flex flex-wrap items-center gap-1 border-b border-border p-1"
      >
        {MARKS.map(({ command, icon: Icon, labelKey }) => (
          <Button
            key={command}
            type="button"
            variant={active[command] ? 'secondary' : 'ghost'}
            size="icon"
            className="h-11 w-11"
            aria-label={t(labelKey)}
            aria-pressed={active[command]}
            disabled={disabled}
            // Keep the selection in the editor while clicking.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply(command)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        ))}
        <Button
          type="button"
          variant={linkOpen ? 'secondary' : 'ghost'}
          size="icon"
          className="h-11 w-11"
          aria-label={t('messaging:editor.link')}
          aria-expanded={linkOpen}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (linkOpen ? setLinkOpen(false) : openLink())}
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {linkOpen ? (
        <div className="flex flex-col gap-2 border-b border-border p-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor={linkInputId} className="text-xs font-medium">
              {t('messaging:editor.linkUrl')}
            </label>
            <Input
              id={linkInputId}
              dir="ltr"
              type="url"
              inputMode="url"
              autoFocus
              value={linkUrl}
              placeholder="https://"
              aria-invalid={linkError}
              aria-describedby={linkError ? linkErrorId : undefined}
              onChange={(event) => {
                setLinkUrl(event.target.value);
                setLinkError(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  insertLink();
                }
                if (event.key === 'Escape') setLinkOpen(false);
              }}
            />
            {linkError ? (
              <p id={linkErrorId} className="text-xs text-destructive">
                {t('messaging:editor.linkInvalid')}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" className="min-h-11" onClick={insertLink}>
              {t('messaging:editor.linkAdd')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setLinkOpen(false)}
            >
              {t('common:actions.cancel')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        {isEmpty && placeholder ? (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-3 text-sm text-muted-foreground"
          >
            {placeholder}
          </p>
        ) : null}
        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-disabled={disabled || undefined}
          contentEditable={!disabled}
          suppressContentEditableWarning
          dir={dir}
          data-testid="message-body-editor"
          tabIndex={0}
          className="prose prose-sm min-h-40 max-w-none px-3 py-3 text-sm leading-6 outline-none [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6"
          onInput={emit}
          onBlur={emit}
          onPaste={onPaste}
          onKeyUp={refreshState}
          onMouseUp={refreshState}
        />
      </div>
    </div>
  );
}
