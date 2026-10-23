/**
 * Inline text editing on the visual editor's canvas (CMS phase 4).
 *
 * In the SELECTED section, text the editor can map to one content field
 * (`inline-text.ts`) shows a dashed outline and a text cursor under the
 * pointer, and is in the Tab order inside the frame. Double-click it, or
 * press Enter on it, to type in place:
 *
 * - The element becomes `contenteditable="plaintext-only"` (plain `true`
 *   where that is not supported). Every edit is still made by the editor,
 *   never by the browser: `beforeinput` is cancelled and the new text is
 *   computed and written to the draft, exactly as the panel's field would
 *   write it — so the page redraws from the draft, the panel field shows
 *   the same text (and its character count), autosave saves it, and no
 *   markup can get in. Paste and drop are plain text only.
 * - The whole edit is ONE undo step (`record(…, group, { sticky: true })`).
 * - Enter commits (Shift+Enter adds a line in a multi-line field), Escape
 *   cancels and restores the text, leaving the text commits. Ctrl+Z while
 *   typing goes back to the text the edit started with.
 * - The field's maximum length stops input (and is announced); the panel
 *   field scrolls into view so its count is visible.
 * - IME composition is left to the browser and committed on
 *   `compositionend`, never mid-composition.
 * - The language edited is the one previewed; the frame already carries
 *   that language's `dir`.
 *
 * Text that cannot be edited in place (it matches no field, several, an
 * Arabic side that is still empty and shows the English text, or an
 * element with markup inside) selects the section and focuses the field
 * in the panel instead, which is always the accessible route.
 *
 * Nothing here reaches the public site: it runs only in the editor, on the
 * frame's document.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { SectionInstance, WebsiteThemeKey } from '@types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import { PREVIEW_SECTION_ATTRIBUTE } from '../renderer/WebsitePreviewContext';
import {
  applyInlineInput,
  canEditInPlace,
  deletionRange,
  findInlineTextTarget,
  inlineTextCandidates,
  matchInlineText,
  setInlineText,
  type InlineTextCandidate,
} from './inline-text';

/** Marks text in the selected section that can be edited in place. */
export const INLINE_TEXT_ATTRIBUTE = 'data-inline-text';
/** Marks the text being edited. */
export const INLINE_EDITING_ATTRIBUTE = 'data-inline-editing';

/** The affordances, drawn in the frame by the editor only. */
export const INLINE_TEXT_CSS = `
[${INLINE_TEXT_ATTRIBUTE}] { cursor: text; border-radius: 2px; }
[${INLINE_TEXT_ATTRIBUTE}]:hover {
  outline: 1px dashed rgb(37 99 235 / 0.9);
  outline-offset: 3px;
}
[${INLINE_TEXT_ATTRIBUTE}]:focus-visible {
  outline: 2px solid rgb(37 99 235);
  outline-offset: 3px;
}
[${INLINE_EDITING_ATTRIBUTE}],
[${INLINE_EDITING_ATTRIBUTE}]:hover,
[${INLINE_EDITING_ATTRIBUTE}]:focus-visible {
  outline: 2px solid rgb(37 99 235);
  outline-offset: 3px;
  box-shadow: 0 0 0 5px rgb(255 255 255 / 0.85);
  cursor: text;
  min-inline-size: 1ch;
}
@media (prefers-reduced-motion: no-preference) {
  [${INLINE_TEXT_ATTRIBUTE}] { transition: outline-color 120ms ease; }
}
`;

export interface UseInlineTextEditingOptions {
  /** The canvas frame's document (`PreviewViewport.onCanvasDocument`). */
  readonly doc: Document | null;
  /** Whether the viewer may edit (manage permission). */
  readonly enabled: boolean;
  /** The selected section: only its text is editable. */
  readonly section: SectionInstance | undefined;
  readonly themeKey: WebsiteThemeKey;
  readonly locale: PublicWebsiteLocale;
  /** Changes whenever the page's content changes (the draft's key). */
  readonly contentKey: string;
  /** A new config for the section; `group` is the same for one whole edit. */
  readonly onChange: (
    sectionId: string,
    config: SectionInstance['config'],
    group: string
  ) => void;
  /** Bring the panel's field into view, and focus it when `focus`. */
  readonly onRevealField: (
    candidate: InlineTextCandidate,
    focus: boolean
  ) => void;
  readonly onAnnounce: (message: string) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

export interface InlineTextEditing {
  /** A text is being edited on the canvas. */
  readonly editing: boolean;
  /** The same, read at the moment (for event handlers). */
  readonly isEditing: () => boolean;
}

interface Session {
  readonly el: HTMLElement;
  readonly sectionId: string;
  readonly candidate: InlineTextCandidate;
  readonly original: string;
  readonly group: string;
  /** The text as the editor last wrote it: the model typing works on. */
  expected: string;
  caret: number;
  composing: boolean;
  limitAnnounced: boolean;
  cleanup: () => void;
}

function supportsPlaintextOnly(doc: Document): boolean {
  try {
    const probe = doc.createElement('div');
    probe.contentEditable = 'plaintext-only';
    return probe.contentEditable === 'plaintext-only';
  } catch {
    return false;
  }
}

/** The selection in `el` as offsets into its text. */
function selectionOffsets(el: HTMLElement): [number, number] {
  const doc = el.ownerDocument;
  const length = el.textContent?.length ?? 0;
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0) return [length, length];
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) {
    return [length, length];
  }
  const measure = (node: Node, offset: number): number => {
    const before = doc.createRange();
    before.selectNodeContents(el);
    before.setEnd(node, offset);
    return before.toString().length;
  };
  const a = measure(range.startContainer, range.startOffset);
  const b = measure(range.endContainer, range.endOffset);
  return [Math.min(a, b), Math.max(a, b)];
}

function placeCaret(el: HTMLElement, offset: number): void {
  const selection = el.ownerDocument.getSelection();
  if (!selection) return;
  let remaining = offset;
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== 3) continue;
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      selection.collapse(node, remaining);
      return;
    }
    remaining -= length;
  }
  selection.collapse(el, el.childNodes.length);
}

function isTextInputTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element?.tagName) return false;
  return (
    element.isContentEditable ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'INPUT' ||
    element.tagName === 'SELECT'
  );
}

/** Line breaks as the field stores them: none in a one-line field. */
function plainTextFor(data: string, multiline: boolean): string {
  return multiline
    ? data.replace(/\r\n?/g, '\n')
    : data.replace(/\s*[\r\n]+\s*/g, ' ');
}

export function useInlineTextEditing(
  options: UseInlineTextEditingOptions
): InlineTextEditing {
  const { t } = useTranslation();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const sessionRef = useRef<Session | null>(null);
  const tabbedRef = useRef(new Set<HTMLElement>());
  const [editing, setEditing] = useState(false);

  const announce = useCallback(
    (message: string) => optionsRef.current.onAnnounce(message),
    []
  );

  /** Writes `text` to the draft, redraws now, and puts the caret back. */
  const write = useCallback((session: Session, text: string, caret: number) => {
    session.expected = text;
    session.caret = caret;
    const { section, onChange } = optionsRef.current;
    if (section && section.id === session.sectionId) {
      const config = setInlineText(
        section.config,
        session.candidate.path,
        session.candidate.locale,
        text
      );
      flushSync(() => onChange(session.sectionId, config, session.group));
    }
    if (session.el.textContent === text) placeCaret(session.el, caret);
  }, []);

  const stop = useCallback(
    (how: 'commit' | 'cancel', options: { refocus?: boolean } = {}) => {
      const session = sessionRef.current;
      if (!session) return;
      sessionRef.current = null;
      const { el, candidate } = session;
      if (how === 'cancel') {
        write(session, session.original, session.original.length);
      } else if (session.composing) {
        const text = plainTextFor(el.textContent ?? '', candidate.multiline);
        write(session, text, text.length);
      }
      session.cleanup();
      setEditing(false);
      if (options.refocus && el.isConnected) {
        if (!el.hasAttribute('tabindex')) {
          el.setAttribute('tabindex', '0');
          tabbedRef.current.add(el);
        }
        el.focus({ preventScroll: true });
      }
      const field = t(candidate.labelKey);
      if (how === 'cancel') {
        announce(t('website:visualEditor.inline.cancelled', { field }));
      } else if (session.expected !== session.original) {
        announce(t('website:visualEditor.inline.saved', { field }));
      }
    },
    [announce, t, write]
  );

  const start = useCallback(
    (
      el: HTMLElement,
      candidate: InlineTextCandidate,
      sectionId: string,
      fromKeyboard: boolean
    ) => {
      stop('commit');
      const doc = el.ownerDocument;
      const anchor = el.closest(`[${PREVIEW_SECTION_ATTRIBUTE}]`) ?? doc.body;
      const before = {
        whiteSpace: el.style.whiteSpace,
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label'),
      };
      el.setAttribute(
        'contenteditable',
        supportsPlaintextOnly(doc) ? 'plaintext-only' : 'true'
      );
      el.setAttribute(INLINE_EDITING_ATTRIBUTE, '');
      el.setAttribute('role', 'textbox');
      el.setAttribute('aria-multiline', String(candidate.multiline));
      el.setAttribute('aria-label', t(candidate.labelKey));
      el.spellcheck = true;
      // Spaces typed at the end show, and a multi-line field's lines too.
      el.style.whiteSpace = 'pre-wrap';

      const session: Session = {
        el,
        sectionId,
        candidate,
        original: candidate.shown,
        group: `inline:${sectionId}:${candidate.path.join('.')}:${Date.now()}`,
        expected: candidate.shown,
        caret: candidate.shown.length,
        composing: false,
        limitAnnounced: false,
        cleanup: () => undefined,
      };

      const insert = (data: string) => {
        const [from, to] = selectionOffsets(el);
        const result = applyInlineInput(
          session.expected,
          Math.min(from, session.expected.length),
          Math.min(to, session.expected.length),
          plainTextFor(data, candidate.multiline),
          candidate.maxLength
        );
        if (result.limited && !session.limitAnnounced) {
          announce(
            t('website:visualEditor.inline.limit', {
              field: t(candidate.labelKey),
              count: candidate.maxLength,
            })
          );
        }
        session.limitAnnounced = result.limited;
        if (result.text === session.expected) {
          placeCaret(el, Math.min(to, session.expected.length));
          return;
        }
        write(session, result.text, result.caret);
      };

      const onBeforeInput = (event: InputEvent) => {
        if (
          session.composing ||
          event.isComposing ||
          event.inputType === 'insertCompositionText'
        ) {
          return;
        }
        event.preventDefault();
        const type = event.inputType;
        if (type.startsWith('delete')) {
          const [from, to] = selectionOffsets(el);
          const text = session.expected;
          const [a, b] = deletionRange(
            type,
            text,
            Math.min(from, text.length),
            Math.min(to, text.length)
          );
          if (a === b) return;
          session.limitAnnounced = false;
          write(session, text.slice(0, a) + text.slice(b), a);
          return;
        }
        if (type === 'insertLineBreak' || type === 'insertParagraph') {
          if (candidate.multiline) insert('\n');
          return;
        }
        if (
          type === 'insertText' ||
          type === 'insertReplacementText' ||
          type === 'insertFromPaste' ||
          type === 'insertFromDrop' ||
          type === 'insertFromYank'
        ) {
          insert(event.data ?? event.dataTransfer?.getData('text/plain') ?? '');
        }
        // Formatting and the browser's own undo never apply.
      };
      const onPaste = (event: ClipboardEvent) => {
        event.preventDefault();
        insert(event.clipboardData?.getData('text/plain') ?? '');
      };
      const onDrop = (event: DragEvent) => event.preventDefault();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.isComposing || event.keyCode === 229) return;
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          stop('cancel', { refocus: true });
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (event.shiftKey) {
            if (candidate.multiline) insert('\n');
          } else {
            stop('commit', { refocus: true });
          }
        } else if (event.key === 'Tab') {
          stop('commit');
        } else if (
          (event.ctrlKey || event.metaKey) &&
          ['z', 'y'].includes(event.key.toLowerCase())
        ) {
          event.preventDefault();
          if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
            write(session, session.original, session.original.length);
          }
        }
      };
      const onCompositionStart = () => {
        session.composing = true;
      };
      const onCompositionEnd = () => {
        session.composing = false;
        const composed = plainTextFor(
          el.textContent ?? '',
          candidate.multiline
        );
        const [, caret] = selectionOffsets(el);
        const max = candidate.maxLength;
        const over =
          max !== undefined &&
          composed.length > max &&
          composed.length > session.expected.length;
        const text = over ? composed.slice(0, max) : composed;
        if (over) {
          announce(
            t('website:visualEditor.inline.limit', {
              field: t(candidate.labelKey),
              count: max,
            })
          );
        }
        write(session, text, Math.min(caret, text.length));
      };
      const onBlur = () => {
        if (sessionRef.current === session) stop('commit');
      };
      // A later redraw (a save adopting the server's copy) puts the text
      // back: the caret goes back with it. The text leaving the page ends
      // the edit (what was typed is already in the draft).
      const view = doc.defaultView as (Window & typeof globalThis) | null;
      const observer = view?.MutationObserver
        ? new view.MutationObserver(() => {
            if (sessionRef.current !== session) return;
            if (!el.isConnected) {
              stop('commit');
              return;
            }
            if (
              !session.composing &&
              doc.activeElement === el &&
              el.textContent === session.expected
            ) {
              placeCaret(el, session.caret);
            }
          })
        : null;
      observer?.observe(anchor, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      el.addEventListener('beforeinput', onBeforeInput);
      el.addEventListener('paste', onPaste);
      el.addEventListener('drop', onDrop);
      el.addEventListener('keydown', onKeyDown);
      el.addEventListener('compositionstart', onCompositionStart);
      el.addEventListener('compositionend', onCompositionEnd);
      el.addEventListener('blur', onBlur);

      session.cleanup = () => {
        observer?.disconnect();
        el.removeEventListener('beforeinput', onBeforeInput);
        el.removeEventListener('paste', onPaste);
        el.removeEventListener('drop', onDrop);
        el.removeEventListener('keydown', onKeyDown);
        el.removeEventListener('compositionstart', onCompositionStart);
        el.removeEventListener('compositionend', onCompositionEnd);
        el.removeEventListener('blur', onBlur);
        el.removeAttribute('contenteditable');
        el.removeAttribute(INLINE_EDITING_ATTRIBUTE);
        el.removeAttribute('aria-multiline');
        if (before.role === null) el.removeAttribute('role');
        else el.setAttribute('role', before.role);
        if (before.label === null) el.removeAttribute('aria-label');
        else el.setAttribute('aria-label', before.label);
        el.style.whiteSpace = before.whiteSpace;
      };

      sessionRef.current = session;
      setEditing(true);
      el.focus({ preventScroll: true });
      const [from] = selectionOffsets(el);
      const selection = doc.getSelection();
      const inside =
        selection &&
        selection.rangeCount > 0 &&
        el.contains(selection.getRangeAt(0).startContainer);
      if (fromKeyboard || !inside) placeCaret(el, session.expected.length);
      else session.caret = from;

      optionsRef.current.onRevealField(candidate, false);
      const field = t(candidate.labelKey);
      announce(
        candidate.multiline
          ? t('website:visualEditor.inline.editingMultiline', { field })
          : t('website:visualEditor.inline.editing', { field })
      );
    },
    [announce, stop, t, write]
  );

  /** What a double-click (or Enter) on `target` in the selected section does. */
  const begin = useCallback(
    (target: Element, anchor: Element, fromKeyboard: boolean) => {
      const { section, themeKey, locale, onRevealField } = optionsRef.current;
      if (!section) return;
      const candidates = inlineTextCandidates(section, themeKey, locale);
      const found = findInlineTextTarget(target, anchor, candidates);
      if (!found) {
        announce(t('website:visualEditor.inline.notText'));
        return;
      }
      const { element, match } = found;
      if (match.kind === 'none') return;
      if (match.kind === 'ambiguous') {
        const [first] = match.candidates;
        if (first) onRevealField(first, true);
        announce(t('website:visualEditor.inline.ambiguous'));
        return;
      }
      if (
        match.kind === 'editable' &&
        canEditInPlace(element, match.candidate) &&
        'focus' in element
      ) {
        start(
          element as HTMLElement,
          match.candidate,
          section.id,
          fromKeyboard
        );
        return;
      }
      onRevealField(match.candidate, true);
      announce(
        t('website:visualEditor.inline.inPanel', {
          field: t(match.candidate.labelKey),
        })
      );
    },
    [announce, start, t]
  );

  // The listeners below live as long as the frame does; they reach the
  // latest handlers through refs.
  const beginRef = useRef(begin);
  beginRef.current = begin;
  const stopRef = useRef(stop);
  stopRef.current = stop;

  // Double-click and keys on the canvas.
  const { doc, enabled } = options;
  useEffect(() => {
    if (!doc || !enabled) return undefined;
    const sectionAnchor = (target: Element) => {
      const anchor = target.closest(`[${PREVIEW_SECTION_ATTRIBUTE}]`);
      const id = anchor?.getAttribute(PREVIEW_SECTION_ATTRIBUTE);
      const { section } = optionsRef.current;
      return anchor && section && id === section.id ? anchor : null;
    };
    const onDoubleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest) return;
      if (sessionRef.current?.el.contains(target)) return;
      const anchor = sectionAnchor(target);
      if (anchor) beginRef.current(target, anchor, false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (sessionRef.current) return;
      const target = event.target as HTMLElement | null;
      // The frame has the keyboard after a click on the page: undo and
      // redo still work there.
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        if (isTextInputTarget(target)) return;
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault();
          optionsRef.current.onUndo();
        } else if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault();
          optionsRef.current.onRedo();
        }
        return;
      }
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        target?.hasAttribute?.(INLINE_TEXT_ATTRIBUTE)
      ) {
        const anchor = sectionAnchor(target);
        if (!anchor) return;
        event.preventDefault();
        beginRef.current(target, anchor, true);
      }
    };
    doc.addEventListener('dblclick', onDoubleClick);
    doc.addEventListener('keydown', onKeyDown);
    return () => {
      doc.removeEventListener('dblclick', onDoubleClick);
      doc.removeEventListener('keydown', onKeyDown);
      stopRef.current('commit');
    };
  }, [doc, enabled]);

  // Another section, another language, or no permission: the edit ends.
  const sectionId = options.section?.id;
  const { locale } = options;
  useEffect(() => {
    const session = sessionRef.current;
    if (
      session &&
      (!enabled ||
        session.sectionId !== sectionId ||
        session.candidate.locale !== locale)
    ) {
      stopRef.current('commit');
    }
  }, [enabled, sectionId, locale]);

  // Mark what can be edited in the selected section (redone as it redraws).
  const { section, themeKey, contentKey } = options;
  useEffect(() => {
    if (!doc || !enabled || !section || editing) return undefined;
    const anchor = Array.from(
      doc.querySelectorAll(`[${PREVIEW_SECTION_ATTRIBUTE}]`)
    ).find(
      (candidate) =>
        candidate.getAttribute(PREVIEW_SECTION_ATTRIBUTE) === section.id
    );
    if (!anchor) return undefined;
    const candidates = inlineTextCandidates(section, themeKey, locale);
    const tabbed = tabbedRef.current;
    const marked: HTMLElement[] = [];
    for (const element of Array.from(
      anchor.querySelectorAll<HTMLElement>('*')
    )) {
      const match = matchInlineText(element.textContent ?? '', candidates);
      if (match.kind !== 'editable') continue;
      if (!canEditInPlace(element, match.candidate)) continue;
      element.setAttribute(INLINE_TEXT_ATTRIBUTE, '');
      if (!element.hasAttribute('tabindex') && element.tabIndex < 0) {
        element.setAttribute('tabindex', '0');
        tabbed.add(element);
      }
      marked.push(element);
    }
    return () => {
      for (const element of marked) {
        element.removeAttribute(INLINE_TEXT_ATTRIBUTE);
      }
      for (const element of tabbed) {
        // The text being edited keeps its place in the Tab order.
        if (element.hasAttribute(INLINE_EDITING_ATTRIBUTE)) continue;
        element.removeAttribute('tabindex');
        tabbed.delete(element);
      }
    };
  }, [doc, enabled, section, themeKey, locale, contentKey, editing]);

  // Leaving the editor commits.
  useEffect(() => () => stopRef.current('commit'), []);

  return {
    editing,
    isEditing: useCallback(() => sessionRef.current !== null, []),
  };
}
