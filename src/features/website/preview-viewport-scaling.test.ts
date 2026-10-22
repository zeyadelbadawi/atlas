/**
 * The preview frame — scaled, never squeezed, and kept styled.
 *
 * WHAT WAS WRONG. The device frame was `width: 1440px; max-width: 100%`,
 * so in any column narrower than the device the iframe's own viewport
 * shrank with it and "Desktop" rendered the tablet or phone layout (on a
 * phone, every breakpoint rendered the phone layout). And the dashboard's
 * stylesheets were copied into the frame once, at load — before the
 * theme's own stylesheet had been added — so the preview often showed the
 * site without its theme's styling or fonts.
 */
import { describe, expect, it } from 'vitest';
import {
  PREVIEW_DEVICE_SIZE,
  mirrorStylesheets,
  previewScale,
} from './components/PreviewViewport';
import { intersectionRootFor, windowOf } from './utils/frame-window.utils';

describe('previewScale', () => {
  it('shrinks a device to the column, keeping its real width inside', () => {
    expect(previewScale(1440, 720, 'fit')).toBe(0.5);
    expect(previewScale(390, 292, 'fit')).toBeCloseTo(0.749, 3);
  });

  it('never enlarges, and 100% is unscaled', () => {
    expect(previewScale(390, 1200, 'fit')).toBe(1);
    expect(previewScale(1440, 300, 'actual')).toBe(1);
  });

  it('keeps an unmeasured column at full size instead of collapsing it', () => {
    expect(previewScale(1440, 0, 'fit')).toBe(1);
  });

  it('gives each breakpoint a real device size on the right side of the Tailwind tiers', () => {
    expect(PREVIEW_DEVICE_SIZE.desktop.width).toBeGreaterThanOrEqual(1280);
    expect(PREVIEW_DEVICE_SIZE.tablet.width).toBeGreaterThanOrEqual(768);
    expect(PREVIEW_DEVICE_SIZE.tablet.width).toBeLessThan(1024);
    expect(PREVIEW_DEVICE_SIZE.mobile.width).toBeLessThan(640);
  });
});

/** A document with an empty head, as the frame's is when mirroring starts. */
function frameDocument(): Document {
  const doc = document.implementation.createHTMLDocument('');
  doc.head.innerHTML = '';
  return doc;
}

function heads(target: Document): string[] {
  return Array.from(target.head.children).map(
    (node) => node.getAttribute('href') ?? `style:${node.textContent ?? ''}`
  );
}

describe('mirrorStylesheets', () => {
  it('adds a stylesheet that appears after the frame loaded, in the same place', () => {
    const source = frameDocument();
    source.head.innerHTML =
      '<link rel="stylesheet" href="/index.css"><style>a{}</style>';
    const target = frameDocument();
    const copies = new Map<Element, Element>();
    mirrorStylesheets(source, target, copies);
    expect(heads(target)).toEqual(['/index.css', 'style:a{}']);

    // A theme pack's stylesheet goes in before `index.css`.
    const theme = source.createElement('link');
    theme.rel = 'stylesheet';
    theme.href = '/theme.css';
    source.head.insertBefore(theme, source.head.firstChild);
    mirrorStylesheets(source, target, copies);
    expect(heads(target)).toEqual(['/theme.css', '/index.css', 'style:a{}']);
  });

  it('reuses a copy already made, so a stylesheet is never fetched again', () => {
    const source = frameDocument();
    source.head.innerHTML = '<link rel="stylesheet" href="/index.css">';
    const target = frameDocument();
    const copies = new Map<Element, Element>();
    mirrorStylesheets(source, target, copies);
    const first = target.head.firstElementChild;
    mirrorStylesheets(source, target, copies);
    expect(target.head.firstElementChild).toBe(first);
    expect(target.head.children).toHaveLength(1);
  });

  it('follows a style whose text changed, and drops one that was removed', () => {
    const source = frameDocument();
    source.head.innerHTML = '<style>a{}</style><style>b{}</style>';
    const target = frameDocument();
    const copies = new Map<Element, Element>();
    mirrorStylesheets(source, target, copies);

    const [first, second] = Array.from(source.head.children);
    first.textContent = 'a{color:red}';
    second.remove();
    mirrorStylesheets(source, target, copies);
    expect(heads(target)).toEqual(['style:a{color:red}']);
  });
});

describe('frame-window', () => {
  it('answers with the window a node is shown in', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const frameDoc = iframe.contentDocument!;
    const inFrame = frameDoc.createElement('div');
    frameDoc.body.appendChild(inFrame);
    expect(windowOf(inFrame)).toBe(iframe.contentWindow);
    expect(windowOf(document.body)).toBe(window);
    expect(windowOf(null)).toBe(window);

    expect(intersectionRootFor(inFrame, { threshold: 0.1 })).toEqual({
      threshold: 0.1,
      root: frameDoc,
    });
    expect(intersectionRootFor(document.body, { threshold: 0.1 })).toEqual({
      threshold: 0.1,
    });
    iframe.remove();
  });
});
