/**
 * Preview Viewport.
 *
 * Wraps the real `WebsiteRenderer` in a resizable frame so the editor and
 * the standalone Preview surface can both demonstrate desktop/tablet/
 * mobile behavior — the same renderer, just constrained to a different
 * width, never a separate "preview-only" rendering path.
 *
 * Renders each breakpoint inside a real `<iframe>` (a genuine, independent
 * browser viewport), not a same-document `<div>` with an inline `width`
 * style. Tailwind's `sm:`/`md:`/`lg:`/`xl:` utilities compile to
 * `@media (min-width: …)` rules, which the browser evaluates against the
 * ACTUAL viewport — an ancestor `<div>`'s CSS width has no effect on that
 * evaluation at all. The previous same-document implementation therefore
 * always rendered every breakpoint at whatever layout the real host
 * window's width produced (almost always the desktop/`lg:` tier in a
 * normal dashboard session), visually squeezed into a narrower box but
 * never actually re-flowing — "tablet"/"mobile" preview was cosmetic, not
 * a real simulation, and made every generated website look non-responsive
 * even where the live public site (a real, full document, real
 * `@media` evaluation) was not. An `<iframe>`'s content establishes its
 * own independent viewport equal to its own rendered box size, so setting
 * that box's width to a real device width makes every `@media` query
 * inside it evaluate correctly — this is a real fix to the tool, not a
 * cosmetic one.
 *
 * The iframe's document is populated via `createPortal`, not a full page
 * navigation/`srcDoc` re-render — `WebsiteRenderer`'s existing React tree,
 * context providers, and TanStack Query cache are reused exactly as they
 * are in the editor; only the DOM node they portal into lives inside the
 * iframe. Every `<style>`/`<link rel="stylesheet">` tag already present in
 * the host document's `<head>` (Vite's injected Tailwind build output) is
 * cloned into the iframe's own head once it loads, so the iframe renders
 * with identical compiled CSS — the same technique established "styled
 * iframe" preview libraries use, not a bespoke stylesheet reimplementation.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';

export type PreviewBreakpoint = 'desktop' | 'tablet' | 'mobile';

/**
 * Real device viewport widths — not arbitrary round numbers. Chosen so
 * each tier lands unambiguously on a different side of this app's own
 * Tailwind breakpoints (`sm 640 / md 768 / lg 1024 / xl 1280`,
 * `tailwind.config.ts`): mobile clears none of them, tablet clears `sm`/
 * `md` only, desktop clears everything up to `xl`.
 */
const BREAKPOINT_PIXEL_WIDTH: Record<PreviewBreakpoint, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 390,
};

const BREAKPOINT_ICON: Record<PreviewBreakpoint, typeof Laptop> = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

const MIN_PREVIEW_HEIGHT = 480;

/**
 * Mounts an `<iframe>`, clones the host document's stylesheets into it
 * once it loads, then portals `children` into its `<body>`. Auto-grows
 * the iframe's height to fit its own content (via `ResizeObserver`) so
 * the page never shows a second, nested scrollbar.
 */
function IframeViewport({
  width,
  dir,
  lang,
  children,
}: {
  readonly width: number;
  readonly dir: string;
  readonly lang: string;
  readonly children: ReactNode;
}): JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(MIN_PREVIEW_HEIGHT);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setup = (): void => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.head.innerHTML = '';
      document
        .querySelectorAll('style, link[rel="stylesheet"]')
        .forEach((node) => {
          doc.head.appendChild(node.cloneNode(true));
        });

      // THE PREVIEWED SITE'S DIRECTION, NOT THE DASHBOARD'S. This used to
      // copy `document.documentElement.dir`, which is the ADMIN's own UI
      // direction — so an English-speaking admin previewing their Arabic
      // site got an `ltr` iframe root and a left-to-right preview of a
      // right-to-left website. The dark-mode class is still mirrored from
      // the host, because that IS a dashboard-level preference.
      doc.documentElement.setAttribute('dir', dir);
      doc.documentElement.setAttribute('lang', lang);
      doc.documentElement.className = document.documentElement.className;
      doc.body.style.margin = '0';
      doc.body.className = 'bg-background text-foreground';

      setMountNode(doc.body);
    };

    // A `srcDoc`-initialized iframe's blank document is same-origin and
    // already parsed by the time `contentDocument` is first read in most
    // browsers, but `load` is the only universally correct signal.
    if (iframe.contentDocument?.readyState === 'complete') {
      setup();
    }
    iframe.addEventListener('load', setup);
    return () => iframe.removeEventListener('load', setup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-applied whenever the previewed locale changes. The setup effect
  // above deliberately runs only on load (it rebuilds the whole head), so
  // without this the direction would be correct only for whichever locale
  // happened to be selected when the iframe first mounted — switching the
  // preview to Arabic would change the copy but not the direction.
  useEffect(() => {
    /*
      GUARD `documentElement`, NOT JUST THE DOCUMENT. A `srcDoc` iframe has
      a `contentDocument` from the moment it is created, but that document
      has no `documentElement` until it is parsed — and this effect runs on
      its dependencies, which fire before the `load` handler below has
      populated anything. Checking only `doc` let a null root through and
      threw `Cannot read properties of null (reading 'setAttribute')`,
      which the error boundary turned into "this section could not be
      displayed" where the page preview should be.

      It is a race, so it struck intermittently and survived a long time;
      caught in production with the editor open in two browsers at once.
      The `load` handler re-applies both attributes anyway, so returning
      early here costs nothing.
    */
    const root = iframeRef.current?.contentDocument?.documentElement;
    if (!root) return;
    root.setAttribute('dir', dir);
    root.setAttribute('lang', lang);
  }, [dir, lang, mountNode]);

  useEffect(() => {
    if (!mountNode) return undefined;

    const updateHeight = (): void => {
      setHeight(Math.max(mountNode.scrollHeight, MIN_PREVIEW_HEIGHT));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(mountNode);
    return () => observer.disconnect();
  }, [mountNode]);

  return (
    <>
      <iframe
        ref={iframeRef}
        srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
        title="Website preview"
        style={{ width, maxWidth: '100%', height, border: 0, display: 'block' }}
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1 rounded-md border border-border p-1">
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
      </div>
      <div className="flex justify-center overflow-x-auto rounded-lg border border-border bg-muted p-4">
        <div
          className={cn(
            'overflow-hidden rounded-md border border-border bg-background shadow-sm'
          )}
        >
          {/* Re-mounts a fresh iframe per breakpoint (keyed) — simplest
              correct behavior for a config/preview tool that only switches
              on an explicit click, never worth the added complexity of
              resizing one persistent iframe in place. */}
          <IframeViewport
            key={breakpoint}
            width={BREAKPOINT_PIXEL_WIDTH[breakpoint]}
            dir={dir}
            lang={lang}
          >
            {children}
          </IframeViewport>
        </div>
      </div>
    </div>
  );
}
