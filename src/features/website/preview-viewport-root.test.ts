/**
 * The preview iframe's root element, before the iframe has parsed anything.
 *
 * WHAT WAS WRONG. The effect that keeps the preview's `dir`/`lang` in step
 * with the selected locale guarded the DOCUMENT but not the document's
 * ROOT:
 *
 *   const doc = iframeRef.current?.contentDocument;
 *   if (!doc) return;
 *   doc.documentElement.setAttribute('dir', dir);   // ← null here
 *
 * A `srcDoc` iframe has a `contentDocument` from the moment it is created,
 * but no `documentElement` until that document is parsed. The effect runs
 * on its dependencies, which fire before the `load` handler populates the
 * frame, so the root was sometimes null and the call threw
 * `Cannot read properties of null (reading 'setAttribute')`. The error
 * boundary then replaced the whole preview panel with "this section could
 * not be displayed".
 *
 * It is a race, which is why it struck intermittently and survived: caught
 * in production with the page editor open in two browsers at once, four
 * times in one session in one of them and never in the other.
 *
 * This reproduces the shape of the bug against a real jsdom iframe rather
 * than a mock, because the whole point is what the DOM actually does
 * before load.
 */
import { describe, expect, it } from 'vitest';

/** The component's rule, as it now stands. */
function applyDirection(
  iframe: HTMLIFrameElement | null,
  dir: string,
  lang: string
): boolean {
  const root = iframe?.contentDocument?.documentElement;
  if (!root) return false;
  root.setAttribute('dir', dir);
  root.setAttribute('lang', lang);
  return true;
}

/** What it used to do — kept so the test can show the difference. */
function applyDirectionUnguarded(
  iframe: HTMLIFrameElement | null,
  dir: string,
  lang: string
): boolean {
  const doc = iframe?.contentDocument;
  if (!doc) return false;
  // @ts-expect-error deliberately reproducing the unguarded access
  doc.documentElement.setAttribute('dir', dir);
  // @ts-expect-error deliberately reproducing the unguarded access
  doc.documentElement.setAttribute('lang', lang);
  return true;
}

/** An iframe whose document exists but has no root yet. */
function iframeWithEmptyDocument(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  Object.defineProperty(iframe, 'contentDocument', {
    // `document.implementation.createDocument` gives a Document with a
    // null `documentElement` — exactly the pre-parse state.
    value: document.implementation.createDocument(null, null),
    configurable: true,
  });
  return iframe;
}

describe('setting the preview direction before the iframe has loaded', () => {
  it('does nothing instead of throwing', () => {
    const iframe = iframeWithEmptyDocument();
    expect(iframe.contentDocument?.documentElement).toBeNull();
    expect(() => applyDirection(iframe, 'rtl', 'ar')).not.toThrow();
    expect(applyDirection(iframe, 'rtl', 'ar')).toBe(false);
  });

  /*
   * The regression itself. If this ever stops throwing, the guard above is
   * no longer testing anything meaningful.
   */
  it('is the exact call that used to throw', () => {
    const iframe = iframeWithEmptyDocument();
    expect(() => applyDirectionUnguarded(iframe, 'rtl', 'ar')).toThrowError(
      /setAttribute/
    );
  });

  it('handles a missing iframe and a missing document too', () => {
    expect(applyDirection(null, 'rtl', 'ar')).toBe(false);
    const bare = document.createElement('iframe');
    Object.defineProperty(bare, 'contentDocument', {
      value: null,
      configurable: true,
    });
    expect(applyDirection(bare, 'rtl', 'ar')).toBe(false);
  });
});

describe('once the iframe has a root', () => {
  function iframeWithRoot(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    const doc = document.implementation.createHTMLDocument('preview');
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    });
    return iframe;
  }

  it('applies direction and language', () => {
    const iframe = iframeWithRoot();
    expect(applyDirection(iframe, 'rtl', 'ar')).toBe(true);
    const root = iframe.contentDocument!.documentElement;
    expect(root.getAttribute('dir')).toBe('rtl');
    expect(root.getAttribute('lang')).toBe('ar');
  });

  /*
   * The behaviour this effect exists for: switching the previewed locale
   * must change the DIRECTION, not only the copy.
   */
  it('updates when the previewed locale changes', () => {
    const iframe = iframeWithRoot();
    applyDirection(iframe, 'rtl', 'ar');
    applyDirection(iframe, 'ltr', 'en');
    const root = iframe.contentDocument!.documentElement;
    expect(root.getAttribute('dir')).toBe('ltr');
    expect(root.getAttribute('lang')).toBe('en');
  });
});
