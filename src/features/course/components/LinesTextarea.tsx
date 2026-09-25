/**
 * A one-item-per-line textarea that you can actually press Enter in.
 *
 * THE BUG. Outcomes and requirements are arrays, and the form edited them
 * with a textarea wired straight to the field:
 *
 *     value={(field.value ?? []).join('\n')}
 *     onChange={(e) => field.onChange(
 *       e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)
 *     )}
 *
 * Type "Learn the basics", press Enter, and the text is
 * `"Learn the basics\n"` → split gives `['Learn the basics', '']` →
 * `filter(Boolean)` drops the empty second line → the array is back to one
 * item → the value re-renders as `"Learn the basics"` with no newline. The
 * keystroke is erased as fast as it is typed and the author can never
 * start item two. The same `trim()` also ate a space the moment you typed
 * one between words at the end of a line.
 *
 * THE FIX. The textarea owns its own raw text while it is being edited,
 * which is what makes it behave like a textarea. The array is still kept
 * in sync on every keystroke — so nothing is lost if the form is submitted
 * without blurring — but it is only NORMALISED (trimmed, blank lines
 * dropped) on blur, once the author has stopped typing. Between those two
 * moments a blank line is a line the author is in the middle of writing,
 * not a value to delete.
 *
 * The parent stays the source of truth: when the field changes from
 * outside (loading a course into the form, a reset), the raw text is
 * re-derived from it, and the guard compares against the normalised array
 * rather than the raw string so the author's half-typed line does not get
 * yanked out from under them on an unrelated re-render.
 */
import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

export interface LinesTextareaProps {
  readonly value: readonly string[] | undefined;
  readonly onChange: (next: string[]) => void;
  readonly rows?: number;
  readonly placeholder?: string;
  readonly id?: string;
  readonly disabled?: boolean;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: boolean;
}

/** Trimmed, with blank lines dropped — what actually gets stored. */
export function normalizeLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function LinesTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  id,
  disabled,
  ...aria
}: LinesTextareaProps): JSX.Element {
  // Joined once, and depended on as a STRING: `value ?? []` is a new array
  // on every render, so an array dependency would re-run the effect
  // constantly and the guard below would be doing all the work.
  const incoming = (value ?? []).join('\n');
  const [text, setText] = useState(incoming);
  /*
    What the parent last held, as far as this component is concerned. An
    incoming array that matches it is our own echo and must not clobber
    the raw text; anything else is a genuine external change.
  */
  const mirrored = useRef(incoming);

  useEffect(() => {
    if (incoming === mirrored.current) return;
    mirrored.current = incoming;
    setText(incoming);
  }, [incoming]);

  const handleChange = (next: string) => {
    setText(next);
    // Every keystroke still reaches the form — but unnormalised, so the
    // empty line Enter just created survives long enough to be typed into.
    const lines = next.split('\n');
    mirrored.current = lines.join('\n');
    onChange(lines);
  };

  const handleBlur = () => {
    const normalized = normalizeLines(text);
    const asText = normalized.join('\n');
    mirrored.current = asText;
    setText(asText);
    onChange(normalized);
  };

  return (
    <Textarea
      id={id}
      rows={rows}
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
      {...aria}
    />
  );
}
