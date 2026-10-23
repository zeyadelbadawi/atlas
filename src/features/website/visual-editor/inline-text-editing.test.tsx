/**
 * Inline text editing on the canvas (`useInlineTextEditing`), against the
 * editor's real undo history: double-click to edit, typing writes the
 * draft (never the DOM directly), Enter commits as ONE undo step, Escape
 * restores and leaves no step, the field's limit stops input, and text the
 * canvas cannot edit in place sends the author to the panel's field.
 *
 * jsdom stands in for the canvas frame: the hook is given this document.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { SectionInstance } from '@types';
import { createI18nInstance } from '@/localization/i18n';
import { replaceSectionConfig } from '../utils/section-list.utils';
import { useEditHistory } from './useEditHistory';
import {
  INLINE_EDITING_ATTRIBUTE,
  INLINE_TEXT_ATTRIBUTE,
  useInlineTextEditing,
} from './useInlineTextEditing';
import { MAX_HERO_EYEBROW_LENGTH } from '../constants/website.constants';

const START: SectionInstance[] = [
  {
    id: 's1',
    type: 'hero',
    enabled: true,
    visibility: { desktop: true, tablet: true, mobile: true },
    config: {
      eyebrow: { en: 'New cohort', ar: 'دفعة جديدة' },
      title: { en: 'Same text', ar: '' },
      subtitle: { en: 'Same text', ar: '' },
    },
  } as unknown as SectionInstance,
];

type Hero = {
  eyebrow: { en: string; ar: string };
  title: { en: string; ar: string };
  subtitle: { en: string; ar: string };
};

function Harness({
  onReveal,
}: {
  readonly onReveal: (fieldId: string, focus: boolean) => void;
}): JSX.Element {
  const [sections, setSections] = useState<SectionInstance[]>(START);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const history = useEditHistory(sections, setSections);
  const [doc, setDoc] = useState<Document | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => setDoc(document), []);
  const section = sections[0]!;
  const config = section.config as unknown as Hero;

  useInlineTextEditing({
    doc,
    enabled: true,
    section,
    themeKey: 'modern-education',
    locale: 'en',
    contentKey: JSON.stringify(sections),
    onChange: (id, next, group) =>
      history.record(
        replaceSectionConfig(sectionsRef.current, id, next),
        group,
        {
          sticky: true,
        }
      ),
    onRevealField: (candidate, focus) => onReveal(candidate.fieldId, focus),
    onAnnounce: setMessage,
    onUndo: history.undo,
    onRedo: history.redo,
  });

  return (
    <div>
      <div data-preview-section="s1">
        <section>
          <p data-testid="eyebrow">{config.eyebrow.en}</p>
          <h1 data-testid="title">{config.title.en}</h1>
          <h2>{config.subtitle.en}</h2>
        </section>
      </div>
      <button type="button" onClick={history.undo} disabled={!history.canUndo}>
        undo
      </button>
      <output data-testid="announcement">{message}</output>
    </div>
  );
}

function caretAtEnd(element: Element): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

function type(element: Element, data: string): void {
  for (const character of data) {
    caretAtEnd(element);
    act(() => {
      element.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: character,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }
}

function setup() {
  const onReveal = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <Harness onReveal={onReveal} />
    </I18nextProvider>
  );
  return { onReveal, eyebrow: screen.getByTestId('eyebrow') };
}

afterEach(cleanup);

const i18n = createI18nInstance('en');

describe('inline text editing on the canvas', () => {
  it('marks the text it can edit, and only that', () => {
    setup();
    expect(
      screen.getByTestId('eyebrow').hasAttribute(INLINE_TEXT_ATTRIBUTE)
    ).toBe(true);
    // "Same text" is both the title and the subtitle: not editable in place.
    expect(
      screen.getByTestId('title').hasAttribute(INLINE_TEXT_ATTRIBUTE)
    ).toBe(false);
  });

  it('types into the draft, commits on Enter, and undoes in one step', () => {
    const { eyebrow } = setup();
    fireEvent.doubleClick(eyebrow);
    expect(eyebrow.getAttribute('contenteditable')).toMatch(
      /plaintext-only|true/
    );
    expect(eyebrow.hasAttribute(INLINE_EDITING_ATTRIBUTE)).toBe(true);
    expect(screen.getByTestId('announcement').textContent).toContain('Enter');

    type(eyebrow, ' 2027');
    expect(eyebrow.textContent).toBe('New cohort 2027');

    fireEvent.keyDown(eyebrow, { key: 'Enter' });
    expect(eyebrow.hasAttribute('contenteditable')).toBe(false);
    expect(eyebrow.textContent).toBe('New cohort 2027');

    // Five keystrokes, one step.
    fireEvent.click(screen.getByRole('button', { name: 'undo' }));
    expect(eyebrow.textContent).toBe('New cohort');
    expect(
      (screen.getByRole('button', { name: 'undo' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('cancels on Escape: the text is back and no undo step is left', () => {
    const { eyebrow } = setup();
    fireEvent.doubleClick(eyebrow);
    type(eyebrow, 'xyz');
    expect(eyebrow.textContent).toBe('New cohortxyz');
    fireEvent.keyDown(eyebrow, { key: 'Escape' });
    expect(eyebrow.textContent).toBe('New cohort');
    expect(eyebrow.hasAttribute('contenteditable')).toBe(false);
    expect(
      (screen.getByRole('button', { name: 'undo' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('never stores markup: pasted HTML arrives as its plain text', () => {
    const { eyebrow } = setup();
    fireEvent.doubleClick(eyebrow);
    caretAtEnd(eyebrow);
    const clipboardData = {
      getData: (kind: string) =>
        kind === 'text/plain' ? ' <b>bold</b>\nnext' : '<b>bold</b>',
    };
    act(() => {
      fireEvent.paste(eyebrow, { clipboardData });
    });
    expect(eyebrow.textContent).toBe('New cohort <b>bold</b> next');
    expect(eyebrow.querySelector('b')).toBeNull();
  });

  it('stops at the field limit', () => {
    const { eyebrow } = setup();
    fireEvent.doubleClick(eyebrow);
    type(eyebrow, 'x'.repeat(MAX_HERO_EYEBROW_LENGTH));
    expect(eyebrow.textContent?.length).toBe(MAX_HERO_EYEBROW_LENGTH);
    expect(screen.getByTestId('announcement').textContent).toContain(
      String(MAX_HERO_EYEBROW_LENGTH)
    );
  });

  it('waits for IME composition to end before writing', () => {
    const { eyebrow } = setup();
    fireEvent.doubleClick(eyebrow);
    fireEvent.compositionStart(eyebrow);
    // The browser writes the composition into the element itself.
    eyebrow.firstChild!.textContent = 'New cohortか';
    act(() => {
      eyebrow.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertCompositionText',
          data: 'か',
          bubbles: true,
          cancelable: true,
        })
      );
    });
    fireEvent.keyDown(eyebrow, { key: 'Enter', keyCode: 229 });
    expect(eyebrow.hasAttribute('contenteditable')).toBe(true);
    eyebrow.firstChild!.textContent = 'New cohort漢';
    caretAtEnd(eyebrow);
    act(() => {
      fireEvent.compositionEnd(eyebrow);
    });
    fireEvent.keyDown(eyebrow, { key: 'Enter' });
    expect(eyebrow.textContent).toBe('New cohort漢');
    fireEvent.click(screen.getByRole('button', { name: 'undo' }));
    expect(eyebrow.textContent).toBe('New cohort');
  });

  it('sends text it cannot edit in place to the panel field', () => {
    const { onReveal } = setup();
    fireEvent.doubleClick(screen.getByTestId('title'));
    expect(onReveal).toHaveBeenCalledWith('section-field-title-en', true);
    expect(screen.getByTestId('title').hasAttribute('contenteditable')).toBe(
      false
    );
  });

  it('enters edit mode from the keyboard with Enter', () => {
    const { eyebrow } = setup();
    expect(eyebrow.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(eyebrow, { key: 'Enter' });
    expect(eyebrow.hasAttribute(INLINE_EDITING_ATTRIBUTE)).toBe(true);
  });
});
