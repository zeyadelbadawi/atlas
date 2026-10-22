/**
 * Preview Viewport.
 *
 * Wraps the real `WebsiteRenderer` in a device frame so the editor and
 * the standalone Preview surface can both demonstrate desktop/tablet/
 * mobile behavior — the same renderer, just shown on a different device,
 * never a separate "preview-only" rendering path.
 *
 * Renders each breakpoint inside a real `<iframe>` (a genuine, independent
 * browser viewport), not a same-document `<div>` with an inline `width`
 * style. Tailwind's `sm:`/`md:`/`lg:`/`xl:` utilities compile to
 * `@media (min-width: …)` rules, which the browser evaluates against the
 * ACTUAL viewport — an ancestor `<div>`'s CSS width has no effect on that
 * evaluation at all. An `<iframe>`'s content establishes its own
 * independent viewport equal to its own box, so giving that box a real
 * device size makes every `@media` query inside it evaluate correctly.
 *
 * THE DEVICE IS SCALED, NEVER SQUEEZED. The iframe used to be `width:
 * 1440px; max-width: 100%`, so wherever the column was narrower than the
 * device — which, beside the editor's section list, was everywhere short of
 * a ~1830px-wide window, and on a phone always — the iframe's own viewport
 * shrank with it, and "Desktop" rendered the tablet or phone layout (a
 * hamburger menu, stacked columns) instead of the desktop one. Now the
 * iframe always keeps the device's real width and height, and the whole
 * frame is shrunk with `transform: scale()` to fit the column — the
 * technique Shopify's theme editor, Webflow, Framer and Puck use. A
 * transform does not change layout inside the frame, so the site lays out
 * exactly as it would on that device and is only drawn smaller. "100%"
 * shows it unscaled, scrolling sideways when the device is wider than the
 * column.
 *
 * A DEVICE-HEIGHT SCREEN THAT SCROLLS INSIDE. The frame used to grow to
 * the page's full height. Inside it, `100dvh` then meant "the whole page"
 * (the site's full-height column could only grow, never shrink back when a
 * section was removed — a blank gap above the footer), full-screen menus
 * covered the whole page instead of the screen, and sticky headers never
 * stuck because the frame itself never scrolled. Like a real device, the
 * frame is now a fixed screen height and the site scrolls within it, so
 * viewport units, `position: fixed`, `position: sticky` and scroll-driven
 * styling (a header turning solid once scrolled) all behave as they do for
 * a visitor.
 *
 * The iframe's document is populated via `createPortal`, not a full page
 * navigation — `WebsiteRenderer`'s existing React tree, context providers,
 * and TanStack Query cache are reused exactly as they are in the editor;
 * only the DOM node they portal into lives inside the iframe. Every
 * `<style>`/`<link rel="stylesheet">` in the host document is mirrored into
 * the iframe's head and KEPT mirrored (`mirrorStylesheets`): a theme pack's
 * stylesheet is added to the host head only once that theme first renders,
 * which is after the frame has loaded, so a copy taken once at load missed
 * it — the preview showed the site without its theme's styling or fonts
 * until something happened to re-create the frame.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';

export type PreviewBreakpoint = 'desktop' | 'tablet' | 'mobile';

/**
 * Real device viewports — not arbitrary round numbers. The widths land
 * each tier unambiguously on a different side of this app's own Tailwind
 * breakpoints (`sm 640 / md 768 / lg 1024 / xl 1280`,
 * `tailwind.config.ts`): mobile clears none of them, tablet clears `sm`/
 * `md` only, desktop clears everything up to `xl`. The heights are common
 * screens of those widths (a 1440×900 laptop, an iPad portrait, an
 * iPhone 14/15), which is what `100dvh` resolves to inside the frame.
 */
export const PREVIEW_DEVICE_SIZE: Record<
  PreviewBreakpoint,
  { readonly width: number; readonly height: number }
> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

const BREAKPOINT_ICON: Record<PreviewBreakpoint, typeof Laptop> = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

/** Below Tailwind's `md`, the admin is on a phone: open the preview on the phone frame. */
const PHONE_QUERY = '(max-width: 767px)';

/**
 * The breakpoint a preview opens on: the phone frame when the admin is
 * themselves on a phone (a scaled-down desktop is a thumbnail there),
 * desktop otherwise. For `useState(initialPreviewBreakpoint)`.
 */
export function initialPreviewBreakpoint(): PreviewBreakpoint {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(PHONE_QUERY).matches
    ? 'mobile'
    : 'desktop';
}

type PreviewZoom = 'fit' | 'actual';

/**
 * How much to shrink a device of `deviceWidth` to fit `availableWidth`:
 * never enlarged, never shrunk in "100%" mode. An unmeasured column (0)
 * keeps the device unscaled rather than collapsing it to nothing.
 */
export function previewScale(
  deviceWidth: number,
  availableWidth: number,
  zoom: PreviewZoom
): number {
  if (zoom === 'actual' || availableWidth <= 0) return 1;
  return Math.min(1, availableWidth / deviceWidth);
}

const MIRRORED_STYLESHEETS = 'style, link[rel="stylesheet"]';

/**
 * Makes `target`'s head carry a copy of every stylesheet in `source`, in
 * the same order — order matters, theme stylesheets sit before
 * `index.css` so Tailwind's utilities win (`theme-stylesheets.ts`). Run
 * again whenever the source head changes: a copy already made is reused
 * (a `<link>` is never re-inserted, which would re-request it and flash
 * unstyled), a `<style>` whose text changed is updated, and the copy of a
 * removed one is removed. `copies` remembers which copy belongs to which
 * original between runs.
 */
export function mirrorStylesheets(
  source: Document,
  target: Document,
  copies: Map<Element, Element>
): void {
  const originals = Array.from(source.querySelectorAll(MIRRORED_STYLESHEETS));
  const current = new Set(originals);
  for (const [original, copy] of copies) {
    if (!current.has(original)) {
      copy.remove();
      copies.delete(original);
    }
  }
  let previous: Element | null = null;
  for (const original of originals) {
    let copy = copies.get(original);
    if (!copy) {
      copy = original.cloneNode(true) as Element;
      copies.set(original, copy);
    } else if (
      original.tagName === 'STYLE' &&
      copy.textContent !== original.textContent
    ) {
      copy.textContent = original.textContent;
    }
    const expectedAt: ChildNode | null = previous
      ? previous.nextSibling
      : target.head.firstChild;
    if (copy !== expectedAt) target.head.insertBefore(copy, expectedAt);
    previous = copy;
  }
}

/**
 * Mounts an `<iframe>` of the device's real size, keeps the host
 * document's stylesheets mirrored into it, then portals `children` into
 * its `<body>`.
 */
function IframeViewport({
  width,
  height,
  dir,
  lang,
  title,
  children,
}: {
  readonly width: number;
  readonly height: number;
  readonly dir: string;
  readonly lang: string;
  readonly title: string;
  readonly children: ReactNode;
}): JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    const copies = new Map<Element, Element>();
    let observer: MutationObserver | null = null;

    const setup = (): void => {
      const doc = iframe.contentDocument;
      if (!doc?.documentElement) return;
      observer?.disconnect();
      copies.clear();
      doc.head.innerHTML = '';
      mirrorStylesheets(document, doc, copies);

      // THE PREVIEWED SITE'S DIRECTION, NOT THE DASHBOARD'S — set by the
      // effect below. The dark-mode class IS mirrored from the host,
      // because that is a dashboard-level preference.
      doc.documentElement.setAttribute('dir', dir);
      doc.documentElement.setAttribute('lang', lang);
      doc.documentElement.className = document.documentElement.className;
      doc.body.style.margin = '0';
      doc.body.className = 'bg-background text-foreground';

      observer = new MutationObserver(() => {
        mirrorStylesheets(document, doc, copies);
        doc.documentElement.className = document.documentElement.className;
      });
      observer.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      setMountNode(doc.body);
    };

    // A `srcDoc`-initialized iframe's blank document is same-origin and
    // already parsed by the time `contentDocument` is first read in most
    // browsers, but `load` is the only universally correct signal.
    if (iframe.contentDocument?.readyState === 'complete') {
      setup();
    }
    iframe.addEventListener('load', setup);
    return () => {
      iframe.removeEventListener('load', setup);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-applied whenever the previewed locale changes. The setup effect
  // above deliberately runs only on load (it rebuilds the whole head), so
  // without this the direction would be correct only for whichever locale
  // happened to be selected when the iframe first mounted.
  useEffect(() => {
    /*
      GUARD `documentElement`, NOT JUST THE DOCUMENT. A `srcDoc` iframe has
      a `contentDocument` from the moment it is created, but that document
      has no `documentElement` until it is parsed — and this effect runs on
      its dependencies, which fire before the `load` handler has populated
      anything. Checking only `doc` let a null root through and threw
      `Cannot read properties of null (reading 'setAttribute')`, which the
      error boundary turned into "this section could not be displayed"
      where the page preview should be (`preview-viewport-root.test.ts`).
    */
    const root = iframeRef.current?.contentDocument?.documentElement;
    if (!root) return;
    root.setAttribute('dir', dir);
    root.setAttribute('lang', lang);
  }, [dir, lang, mountNode]);

  return (
    <>
      <iframe
        ref={iframeRef}
        srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
        title={title}
        style={{ width, height, border: 0, display: 'block' }}
      />
      {mountNode ? createPortal(children, mountNode) : null}
    </>
  );
}

export interface PreviewViewportProps {
  readonly breakpoint: PreviewBreakpoint;
  readonly onBreakpointChange: (breakpoint: PreviewBreakpoint) => void;
  /**
   * Direction of the website being PREVIEWED — `rtl` for an Arabic
   * preview even when the surrounding dashboard is left-to-right.
   * Defaults to `ltr` rather than to the dashboard's direction, so a
   * caller that forgets to pass it gets the public default rather than
   * silently inheriting the admin's UI language.
   */
  readonly dir?: 'ltr' | 'rtl';
  /** Language of the website being previewed, for the iframe's `<html lang>`. */
  readonly lang?: string;
  readonly children: React.ReactNode;
}

export function PreviewViewport({
  breakpoint,
  onBreakpointChange,
  dir = 'ltr',
  lang = 'en',
  children,
}: PreviewViewportProps): JSX.Element {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [zoom, setZoom] = useState<PreviewZoom>('fit');
  const device = PREVIEW_DEVICE_SIZE[breakpoint];
  const scale = previewScale(device.width, availableWidth, zoom);

  // The column's own width (inside its padding), followed as the window,
  // the sidebar or the editor's layout changes it.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = (): void => {
      const style = window.getComputedStyle(stage);
      setAvailableWidth(
        stage.clientWidth -
          parseFloat(style.paddingLeft || '0') -
          parseFloat(style.paddingRight || '0')
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    // `min-w-0`: as a grid or flex item (beside the editor's section list)
    // this column must take the width it is given, never widen itself to
    // fit the full-size device inside it — that width is what the device
    // is scaled to.
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-md border border-border p-1">
        {(['desktop', 'tablet', 'mobile'] as const).map((bp) => {
          const Icon = BREAKPOINT_ICON[bp];
          return (
            <Button
              key={bp}
              type="button"
              size="sm"
              variant={breakpoint === bp ? 'secondary' : 'ghost'}
              onClick={() => onBreakpointChange(bp)}
              aria-pressed={breakpoint === bp}
            >
              <Icon className="size-4" aria-hidden />
              {t(`website:preview.breakpoint.${bp}`)}
            </Button>
          );
        })}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <Button
          type="button"
          size="sm"
          variant={zoom === 'fit' ? 'secondary' : 'ghost'}
          onClick={() => setZoom('fit')}
          aria-pressed={zoom === 'fit'}
          data-testid="preview-zoom-fit"
        >
          {t('website:preview.zoom.fit', {
            percent: Math.round(
              previewScale(device.width, availableWidth, 'fit') * 100
            ),
          })}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={zoom === 'actual' ? 'secondary' : 'ghost'}
          onClick={() => setZoom('actual')}
          aria-pressed={zoom === 'actual'}
          data-testid="preview-zoom-actual"
        >
          {t('website:preview.zoom.actual')}
        </Button>
      </div>
      <div
        ref={stageRef}
        className={cn(
          'rounded-lg border border-border bg-muted p-4',
          zoom === 'actual' && 'overflow-x-auto'
        )}
      >
        {/* The frame's footprint is the SCALED device, so the page around
            it lays out as if the shrunken frame were its real size. The
            iframe inside keeps the real device size and is drawn smaller
            from its top-left corner — physical `left`, not inline-start,
            so it stays put whichever way the dashboard reads. */}
        <div
          className="relative mx-auto overflow-hidden rounded-md bg-background shadow-sm ring-1 ring-border"
          style={{
            width: device.width * scale,
            height: device.height * scale,
            // Not drawn until the column has been measured, so the device
            // never flashes at full size before it is scaled.
            visibility: availableWidth > 0 ? undefined : 'hidden',
          }}
          data-testid="preview-device"
          data-breakpoint={breakpoint}
          data-scale={scale}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={scale === 1 ? undefined : { transform: `scale(${scale})` }}
          >
            {/* Re-mounts a fresh iframe per breakpoint (keyed) — simplest
                correct behavior for a preview that only switches on an
                explicit click. */}
            <IframeViewport
              key={breakpoint}
              width={device.width}
              height={device.height}
              dir={dir}
              lang={lang}
              title={t('website:preview.frameTitle')}
            >
              {children}
            </IframeViewport>
          </div>
        </div>
      </div>
    </div>
  );
}
